-- Disable problematic RLS on legacy project_members table to avoid recursion
alter table if exists public.project_members disable row level security;

drop policy if exists "Project members can view project members" on public.project_members;
drop policy if exists "Project owners and admins can manage members" on public.project_members;
drop policy if exists "project_members_allow_all" on public.project_members;


