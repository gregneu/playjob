-- Ensure project_members table supports owner role
-- Ensure project_memberships table supports owner role
alter table if exists public.project_memberships
  alter column role set not null;

alter table if exists public.project_memberships
  drop constraint if exists project_memberships_role_check;

alter table if exists public.project_memberships
  drop constraint if exists project_memberships_role_check1;

alter table if exists public.project_memberships
  add constraint project_memberships_role_check
  check (role in ('viewer','editor','admin','owner'));

-- Seed missing owner memberships (new table)
insert into public.project_memberships (project_id, user_id, role)
select p.id, p.owner_id, 'owner'
from public.projects p
where p.owner_id is not null
  and not exists (
    select 1 from public.project_memberships pm
    where pm.project_id = p.id
      and pm.user_id = p.owner_id
  );

-- Seed legacy project_members table if it still exists
insert into public.project_members (project_id, user_id, role, status, joined_at)
select p.id, p.owner_id, 'owner', 'accepted', coalesce(p.created_at, now())
from public.projects p
where p.owner_id is not null
  and exists (
    select 1
    from information_schema.tables t
    where t.table_schema = 'public'
      and t.table_name = 'project_members'
  )
  and not exists (
    select 1 from public.project_members pm
    where pm.project_id = p.id
      and pm.user_id = p.owner_id
  );

-- Refresh policies for project_memberships to allow owners/admins to manage
alter table public.project_memberships enable row level security;

drop policy if exists "project_memberships_select" on public.project_memberships;
create policy "project_memberships_select" on public.project_memberships
for select using (
  exists (
    select 1 from public.project_memberships pm
    where pm.project_id = project_memberships.project_id
      and pm.user_id = auth.uid()
  )
);

drop policy if exists "project_memberships_insert" on public.project_memberships;
create policy "project_memberships_insert" on public.project_memberships
for insert with check (
  exists (
    select 1 from public.project_memberships pm
    where pm.project_id = project_memberships.project_id
      and pm.user_id = auth.uid()
      and pm.role in ('admin','owner')
  )
);

drop policy if exists "project_memberships_update" on public.project_memberships;
create policy "project_memberships_update" on public.project_memberships
for update using (
  exists (
    select 1 from public.project_memberships pm
    where pm.project_id = project_memberships.project_id
      and pm.user_id = auth.uid()
      and pm.role in ('admin','owner')
  )
);

drop policy if exists "project_memberships_delete" on public.project_memberships;
create policy "project_memberships_delete" on public.project_memberships
for delete using (
  exists (
    select 1 from public.project_memberships pm
    where pm.project_id = project_memberships.project_id
      and pm.user_id = auth.uid()
      and pm.role in ('admin','owner')
  )
);

