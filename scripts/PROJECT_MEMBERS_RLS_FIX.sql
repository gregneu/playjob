-- Helper function to avoid recursive RLS lookups
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid, p_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM project_members
    WHERE project_id = p_project_id
      AND user_id = COALESCE(p_user_id, auth.uid())
      AND status = 'accepted'
  );
$$;

-- Project members policies
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;

-- Clean old policies
DROP POLICY IF EXISTS pm_select_own ON public.project_members;
DROP POLICY IF EXISTS "Project members can view project members" ON public.project_members;
DROP POLICY IF EXISTS "Project owners and admins can manage members" ON public.project_members;

-- Allow any accepted member of a project to see all members of that project
CREATE POLICY pm_select_members ON public.project_members
FOR SELECT
USING ( public.is_project_member(project_members.project_id) );

-- Allow insert by:
-- 1) the user inserting their own membership; OR
-- 2) the project owner (creator) inserting anyone
DROP POLICY IF EXISTS pm_insert_own ON public.project_members;
CREATE POLICY pm_insert_members ON public.project_members
FOR INSERT
WITH CHECK (
  (user_id = auth.uid()) OR
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_members.project_id AND p.user_id = auth.uid()
  )
);

-- Allow updates by the same rules as insert
DROP POLICY IF EXISTS pm_update_own ON public.project_members;
CREATE POLICY pm_update_members ON public.project_members
FOR UPDATE
USING (
  (user_id = auth.uid()) OR
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_members.project_id AND p.user_id = auth.uid()
  )
)
WITH CHECK (
  (user_id = auth.uid()) OR
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_members.project_id AND p.user_id = auth.uid()
  )
);

-- Allow delete by owner or by the user removing themselves
DROP POLICY IF EXISTS pm_delete_owner_or_self ON public.project_members;
CREATE POLICY pm_delete_owner_or_self ON public.project_members
FOR DELETE
USING (
  (user_id = auth.uid()) OR
  EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = project_members.project_id AND p.user_id = auth.uid()
  )
);

-- Optionally, make profiles policy use helper (keeps join working)
DROP POLICY IF EXISTS "Members can view profiles in their projects" ON public.profiles;
DROP POLICY IF EXISTS profiles_select_members ON public.profiles;
CREATE POLICY profiles_select_members ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_members pm
    WHERE pm.user_id = profiles.id
      AND pm.status = 'accepted'
      AND public.is_project_member(pm.project_id)
  ) OR auth.uid() = profiles.id
);

