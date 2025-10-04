set search_path = public;

-- Simplify project_memberships RLS to avoid recursive checks
alter table public.project_memberships enable row level security;

drop policy if exists "project_memberships_select" on public.project_memberships;
create policy "project_memberships_select" on public.project_memberships
  for select using (
    project_memberships.user_id = auth.uid()
    or exists (
      select 1 from public.projects p
      where p.id = project_memberships.project_id
        and p.owner_id = auth.uid()
    )
  );

drop policy if exists "project_memberships_insert" on public.project_memberships;
create policy "project_memberships_insert" on public.project_memberships
  for insert with check (
    exists (
      select 1 from public.projects p
      where p.id = project_memberships.project_id
        and p.owner_id = auth.uid()
    )
  );

drop policy if exists "project_memberships_update" on public.project_memberships;
create policy "project_memberships_update" on public.project_memberships
  for update using (
    exists (
      select 1 from public.projects p
      where p.id = project_memberships.project_id
        and p.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.projects p
      where p.id = project_memberships.project_id
        and p.owner_id = auth.uid()
    )
  );

drop policy if exists "project_memberships_delete" on public.project_memberships;
create policy "project_memberships_delete" on public.project_memberships
  for delete using (
    exists (
      select 1 from public.projects p
      where p.id = project_memberships.project_id
        and p.owner_id = auth.uid()
    )
  );
