-- Create project_invites table
create table if not exists public.project_invites (
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

create index if not exists project_invites_project_id_idx on public.project_invites(project_id);
create index if not exists project_invites_email_idx on public.project_invites(invitee_email);
create index if not exists project_invites_token_idx on public.project_invites(invite_token);
create index if not exists project_invites_pending_idx on public.project_invites(status) where status = 'pending';

-- Ensure project_memberships table exists (used by invite flow)
create table if not exists public.project_memberships (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('viewer','editor','admin','owner')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, user_id)
);

create index if not exists project_memberships_project_idx on public.project_memberships(project_id);
create index if not exists project_memberships_user_idx on public.project_memberships(user_id);

-- Trigger to keep updated_at fresh
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

-- Upsert helper for project members
create or replace function public.upsert_project_member(
  p_project_id uuid,
  p_email text,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  select id into v_user_id
  from public.profiles
  where email ilike p_email
  limit 1;

  if v_user_id is null then
    insert into public.profiles (email, display_name)
    values (p_email, split_part(p_email, '@', 1))
    on conflict (email) do update set email = excluded.email
    returning id into v_user_id;
  end if;

  if v_user_id is null then
    raise exception 'Unable to resolve invitee profile for %', p_email;
  end if;

  -- Prevent demoting existing owners through invites or role updates
  if p_role <> 'owner' then
    perform 1
    from public.project_memberships
    where project_id = p_project_id
      and user_id = v_user_id
      and role = 'owner';

    if found then
      update public.project_memberships
      set updated_at = now()
      where project_id = p_project_id
        and user_id = v_user_id;
      return;
    end if;
  end if;

  insert into public.project_memberships (project_id, user_id, role)
  values (p_project_id, v_user_id, p_role)
  on conflict (project_id, user_id)
  do update set role = excluded.role, updated_at = now();
end;
$$;

-- Ensure project creator becomes owner automatically
create or replace function public.handle_project_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_exists boolean;
begin
  select exists (
    select 1 from public.project_memberships
    where project_id = new.id
      and user_id = new.created_by
  ) into v_exists;

  if not v_exists then
    insert into public.project_memberships (project_id, user_id, role)
    values (new.id, new.created_by, 'owner');
  end if;

  return new;
end;
$$;

drop trigger if exists project_owner_default on public.projects;
create trigger project_owner_default
after insert on public.projects
for each row execute function public.handle_project_owner();

-- Create invite RPC, generates new or refreshes existing invite
create or replace function public.create_project_invite(
  p_project_id uuid,
  p_inviter_id uuid,
  p_invitee_email text,
  p_role text
)
returns table (
  invite_id uuid,
  invite_token uuid,
  project_id uuid,
  project_name text,
  role text,
  status text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project_name text;
  v_existing_id uuid;
begin
  if p_role not in ('viewer','editor','admin') then
    raise exception 'Invalid role value %', p_role;
  end if;

  select name into v_project_name from public.projects where id = p_project_id;

  if v_project_name is null then
    raise exception 'Project not found';
  end if;

select id into v_existing_id
from public.project_invites
where project_id = p_project_id
  and lower(invitee_email) = lower(p_invitee_email);

  if v_existing_id is null then
    insert into public.project_invites (project_id, inviter_id, invitee_email, role)
    values (
      p_project_id,
      p_inviter_id,
      lower(p_invitee_email),
      p_role
    )
    returning id, invite_token, project_id, v_project_name, role, status, expires_at
    into invite_id, invite_token, project_id, project_name, role, status, expires_at;
  else
    update public.project_invites
    set
      inviter_id = p_inviter_id,
      role = p_role,
      status = 'pending',
      invite_token = gen_random_uuid(),
      invitee_email = lower(p_invitee_email),
      expires_at = now() + interval '7 days',
      updated_at = now()
    where id = v_existing_id
    returning id, invite_token, project_id, v_project_name, role, status, expires_at
    into invite_id, invite_token, project_id, project_name, role, status, expires_at;
  end if;

  return next;
end;
$$;

-- Accept invite RPC
create or replace function public.accept_project_invite(
  p_token uuid,
  p_user_id uuid
)
returns table(project_id uuid, project_name text, role text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite public.project_invites%rowtype;
begin
  select * into v_invite
  from public.project_invites
  where invite_token = p_token;

  if v_invite.id is null then
    raise exception 'Invite not found';
  end if;

  if v_invite.status <> 'pending' then
    raise exception 'Invite already processed';
  end if;

  if v_invite.expires_at < now() then
    update public.project_invites
    set status = 'expired', updated_at = now()
    where id = v_invite.id;
    raise exception 'Invite expired';
  end if;

  perform public.upsert_project_member(v_invite.project_id, v_invite.invitee_email, v_invite.role);

  update public.project_invites
  set status = 'accepted',
      accepted_at = now(),
      updated_at = now()
  where id = v_invite.id;

  return query
  select p.id, p.name, v_invite.role
  from public.projects p
  where p.id = v_invite.project_id;
end;
$$;

-- Keep invites in sync when project member exists already
-- RLS policies
alter table public.project_invites enable row level security;
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
  (
    exists (
      select 1 from public.project_memberships pm
      where pm.project_id = project_memberships.project_id
        and pm.user_id = auth.uid()
        and pm.role in ('admin','owner')
    )
  )
  or (
    project_memberships.role = 'owner'
    and (
      select p.owner_id from public.projects p where p.id = project_memberships.project_id
    ) = auth.uid()
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

drop policy if exists "project_invites_select" on public.project_invites;
create policy "project_invites_select" on public.project_invites
for select using (
  exists (
    select 1
    from public.project_memberships pm
    where pm.project_id = project_invites.project_id
      and pm.user_id = auth.uid()
      and pm.role in ('admin','owner','editor')
  )
);

drop policy if exists "project_invites_insert" on public.project_invites;
create policy "project_invites_insert" on public.project_invites
for insert with check (
  exists (
    select 1
    from public.project_memberships pm
    where pm.project_id = project_invites.project_id
      and pm.user_id = auth.uid()
      and pm.role in ('admin','owner')
  )
);

drop policy if exists "project_invites_update" on public.project_invites;
create policy "project_invites_update" on public.project_invites
for update using (
  exists (
    select 1
    from public.project_memberships pm
    where pm.project_id = project_invites.project_id
      and pm.user_id = auth.uid()
      and pm.role in ('admin','owner')
  )
);

drop policy if exists "project_invites_delete" on public.project_invites;
create policy "project_invites_delete" on public.project_invites
for delete using (
  exists (
    select 1
    from public.project_memberships pm
    where pm.project_id = project_invites.project_id
      and pm.user_id = auth.uid()
      and pm.role in ('admin','owner')
  )
);

