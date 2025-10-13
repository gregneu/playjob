set search_path = public;

alter table public.sprints enable row level security;

drop policy if exists "sprints_select" on public.sprints;
create policy "sprints_select" on public.sprints
  for select using (
    public.is_project_member(project_id)
  );

drop policy if exists "sprints_insert" on public.sprints;
create policy "sprints_insert" on public.sprints
  for insert with check (
    public.is_project_member(project_id, array['editor','admin','owner'])
  );

drop policy if exists "sprints_update" on public.sprints;
create policy "sprints_update" on public.sprints
  for update using (
    public.is_project_member(project_id, array['editor','admin','owner'])
  )
  with check (
    public.is_project_member(project_id, array['editor','admin','owner'])
  );

drop policy if exists "sprints_delete" on public.sprints;
create policy "sprints_delete" on public.sprints
  for delete using (
    public.is_project_member(project_id, array['admin','owner'])
  );
