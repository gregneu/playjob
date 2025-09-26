-- Allow project members to SELECT project rows (not only owners)

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view their own projects" ON public.projects;
  DROP POLICY IF EXISTS projects_select_for_members ON public.projects;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

CREATE POLICY projects_select_for_members ON public.projects
  FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.project_members pm
      WHERE pm.project_id = projects.id
        AND pm.user_id = auth.uid()
        AND pm.status = 'accepted'
    )
  );


