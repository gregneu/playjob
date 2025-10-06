-- Align project access schema with canonical tables
set search_path = public;

-- Ensure extensions available
create extension if not exists citext;

-- Ensure project_memberships table exists
do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'project_memberships'
  ) then
    create table public.project_memberships (
      id uuid primary key default gen_random_uuid(),
      project_id uuid not null references public.projects(id) on delete cascade,
      user_id uuid not null references public.profiles(id) on delete cascade,
      role text not null check (role in ('viewer','editor','admin','owner')),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (project_id, user_id)
    );
  end if;
end$$;

-- Ensure project_invites table exists
do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'project_invites'
  ) then
    create table public.project_invites (
      id uuid primary key default gen_random_uuid(),
      project_id uuid not null references public.projects(id) on delete cascade,
      inviter_id uuid references public.profiles(id) on delete set null,
      invitee_email citext,
      role text not null check (role in ('viewer','editor','admin','owner')),
      status text not null default 'pending' check (status in ('pending','accepted','expired')),
      invite_token uuid not null default gen_random_uuid(),
      expires_at timestamptz not null default now() + interval '7 days',
      accepted_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  end if;
end$$;

-- Recreate helper triggers for updated_at tracking
create or replace function public.touch_project_memberships()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists project_memberships_touch on public.project_memberships;
create trigger project_memberships_touch
before update on public.project_memberships
for each row execute function public.touch_project_memberships();

create or replace function public.touch_project_invites()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists project_invites_touch on public.project_invites;
create trigger project_invites_touch
before update on public.project_invites
for each row execute function public.touch_project_invites();

-- Backfill memberships from legacy project_members if present
do $$
declare
  legacy_exists boolean;
begin
  select exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'project_members'
  ) into legacy_exists;

  if legacy_exists then
    insert into public.project_memberships (id, project_id, user_id, role, created_at, updated_at)
    select
      pm.id,
      pm.project_id,
      pm.user_id,
      case
        when pm.role in ('viewer','editor','admin','owner') then pm.role
        when pm.role = 'member' then 'editor'
        else 'viewer'
      end as normalized_role,
      coalesce(pm.joined_at, pm.invited_at, now()) as created_at,
      coalesce(pm.joined_at, pm.invited_at, now()) as updated_at
    from public.project_members pm
    where pm.project_id is not null
      and pm.user_id is not null
      and exists (select 1 from public.projects p where p.id = pm.project_id)
      and exists (select 1 from public.profiles pr where pr.id = pm.user_id)
    on conflict (project_id, user_id) do update
      set
        role = excluded.role,
        updated_at = greatest(public.project_memberships.updated_at, excluded.updated_at);
  end if;
end$$;

-- Backfill invites from legacy project_invitations if present
do $$
declare
  legacy_exists boolean;
begin
  select exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'project_invitations'
  ) into legacy_exists;

  if legacy_exists then
    insert into public.project_invites (id, project_id, inviter_id, invitee_email, role, status, invite_token, expires_at, accepted_at, created_at, updated_at)
    select
      pi.id,
      pi.project_id,
      pi.invited_by,
      nullif(lower(pi.email), '')::citext,
      case
        when pi.role in ('viewer','editor','admin','owner') then pi.role
        when pi.role = 'member' then 'editor'
        else 'viewer'
      end as normalized_role,
      case
        when pi.status in ('pending','accepted','expired') then pi.status
        when pi.status = 'declined' then 'expired'
        else 'pending'
      end as normalized_status,
      coalesce(
        case
          when pi.token ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            then pi.token::uuid
        end,
        gen_random_uuid()
      ) as invite_token,
      coalesce(pi.expires_at, now() + interval '7 days') as expires_at,
      case when pi.status = 'accepted' then coalesce(pi.invited_at, now()) end as accepted_at,
      coalesce(pi.invited_at, now()) as created_at,
      coalesce(pi.invited_at, now()) as updated_at
    from public.project_invitations pi
    where pi.project_id is not null
      and exists (select 1 from public.projects p where p.id = pi.project_id)
    on conflict (id) do update
      set
        inviter_id = excluded.inviter_id,
        invitee_email = excluded.invitee_email,
        role = excluded.role,
        status = excluded.status,
        invite_token = excluded.invite_token,
        expires_at = excluded.expires_at,
        accepted_at = excluded.accepted_at,
        updated_at = excluded.updated_at;
  end if;
end$$;

-- Drop legacy tables and related helpers
drop function if exists public.invite_user_to_project(uuid, text, text);
drop trigger if exists trigger_add_project_owner on public.projects;
drop function if exists public.add_project_owner();
drop table if exists public.project_invitations cascade;
drop table if exists public.project_members cascade;

-- Refresh indexes for canonical tables
create index if not exists project_memberships_project_idx on public.project_memberships(project_id);
create index if not exists project_memberships_user_idx on public.project_memberships(user_id);
create index if not exists project_invites_project_id_idx on public.project_invites(project_id);
create index if not exists project_invites_email_idx on public.project_invites(invitee_email);
create index if not exists project_invites_token_idx on public.project_invites(invite_token);
create index if not exists project_invites_pending_idx on public.project_invites(status) where status = 'pending';

-- Rebuild access helper functions
-- First drop dependent policies
drop policy if exists "sprints_select" on public.sprints;
drop policy if exists "sprints_insert" on public.sprints;
drop policy if exists "sprints_update" on public.sprints;
drop policy if exists "sprints_delete" on public.sprints;

-- Now drop functions
drop function if exists public.is_project_member(uuid, uuid, text[]);
drop function if exists public.is_project_member(uuid, uuid);
drop function if exists public.is_project_member(uuid, text[]);
drop function if exists public.is_project_member(uuid);

create or replace function public.is_service_role()
returns boolean
language sql
stable
as $$
  select coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role';
$$;

create or replace function public.is_project_member(target_project_id uuid, target_user_id uuid, allowed_roles text[])
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if public.is_service_role() then
    return true;
  end if;

  if target_user_id is null then
    return false;
  end if;

  return exists (
    select 1
    from public.project_memberships pm
    where pm.project_id = target_project_id
      and pm.user_id = target_user_id
      and (
        allowed_roles is null
        or array_length(allowed_roles, 1) is null
        or pm.role = any(allowed_roles)
      )
  );
end;
$$;

create or replace function public.is_project_member(target_project_id uuid, target_user_id uuid)
returns boolean
language sql
stable
as $$
  select public.is_project_member(target_project_id, target_user_id, array['viewer','editor','admin','owner']);
$$;

create or replace function public.is_project_member(target_project_id uuid, allowed_roles text[])
returns boolean
language sql
stable
as $$
  select public.is_project_member(target_project_id, auth.uid(), allowed_roles);
$$;

create or replace function public.is_project_member(target_project_id uuid)
returns boolean
language sql
stable
as $$
  select public.is_project_member(target_project_id, auth.uid(), array['viewer','editor','admin','owner']);
$$;

create or replace function public.can_manage_project(target_project_id uuid)
returns boolean
language sql
stable
as $$
  select public.is_project_member(target_project_id, auth.uid(), array['admin','owner']);
$$;

-- Reset RLS policies to rely solely on canonical tables
alter table public.project_memberships enable row level security;

drop policy if exists "project_memberships_select" on public.project_memberships;
create policy "project_memberships_select" on public.project_memberships
  for select using (public.is_project_member(project_memberships.project_id));

drop policy if exists "project_memberships_insert" on public.project_memberships;
create policy "project_memberships_insert" on public.project_memberships
  for insert with check (public.can_manage_project(project_memberships.project_id));

drop policy if exists "project_memberships_update" on public.project_memberships;
create policy "project_memberships_update" on public.project_memberships
  for update using (public.can_manage_project(project_memberships.project_id))
  with check (public.can_manage_project(project_memberships.project_id));

drop policy if exists "project_memberships_delete" on public.project_memberships;
create policy "project_memberships_delete" on public.project_memberships
  for delete using (public.can_manage_project(project_memberships.project_id));

alter table public.project_invites enable row level security;

drop policy if exists "project_invites_select" on public.project_invites;
create policy "project_invites_select" on public.project_invites
  for select using (public.is_project_member(project_invites.project_id, array['editor','admin','owner']));

drop policy if exists "project_invites_insert" on public.project_invites;
create policy "project_invites_insert" on public.project_invites
  for insert with check (public.can_manage_project(project_invites.project_id));

drop policy if exists "project_invites_update" on public.project_invites;
create policy "project_invites_update" on public.project_invites
  for update using (public.can_manage_project(project_invites.project_id));

drop policy if exists "project_invites_delete" on public.project_invites;
create policy "project_invites_delete" on public.project_invites
  for delete using (public.can_manage_project(project_invites.project_id));

-- Recreate sprints policies with the new function signature
create policy "sprints_select" on public.sprints
  for select using (public.is_project_member(project_id, auth.uid(), array['viewer','editor','admin','owner']));

create policy "sprints_insert" on public.sprints
  for insert with check (public.is_project_member(project_id, auth.uid(), array['editor','admin','owner']));

create policy "sprints_update" on public.sprints
  for update using (public.is_project_member(project_id, auth.uid(), array['editor','admin','owner']));

create policy "sprints_delete" on public.sprints
  for delete using (public.is_project_member(project_id, auth.uid(), array['admin','owner']));


