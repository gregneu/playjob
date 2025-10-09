set search_path = public;

-- Allow editors to manage project-scoped resources (zones, objects, tickets, etc.)
create or replace function public.can_manage_project(target_project_id uuid)
returns boolean
language sql
stable
as $$
  select public.is_project_member(
    target_project_id,
    auth.uid(),
    array['editor','admin','owner']
  );
$$;
