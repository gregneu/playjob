-- Ensure invite acceptance uses the authenticated user id so the membership
-- appears in the invitee's project list immediately, and avoid ambiguous
-- column references in invite creation RPCs.

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

  select name
  into v_project_name
  from public.projects p
  where p.id = p_project_id;

  if v_project_name is null then
    raise exception 'Project not found';
  end if;

  select pi.id
  into v_existing_id
  from public.project_invites pi
  where pi.project_id = p_project_id
    and lower(pi.invitee_email) = lower(p_invitee_email);

  if v_existing_id is null then
    insert into public.project_invites as pi (project_id, inviter_id, invitee_email, role)
    values (
      p_project_id,
      p_inviter_id,
      lower(p_invitee_email),
      p_role
    )
    returning
      pi.id,
      pi.invite_token,
      pi.project_id,
      v_project_name,
      pi.role,
      pi.status,
      pi.expires_at
    into invite_id, invite_token, project_id, project_name, role, status, expires_at;
  else
    update public.project_invites as pi
    set
      inviter_id = p_inviter_id,
      role = p_role,
      status = 'pending',
      invite_token = gen_random_uuid(),
      invitee_email = lower(p_invitee_email),
      expires_at = now() + interval '7 days',
      updated_at = now()
    where pi.id = v_existing_id
    returning
      pi.id,
      pi.invite_token,
      pi.project_id,
      v_project_name,
      pi.role,
      pi.status,
      pi.expires_at
    into invite_id, invite_token, project_id, project_name, role, status, expires_at;
  end if;

  return next;
end;
$$;

create or replace function public.upsert_project_member_by_user_id(
  p_project_id uuid,
  p_user_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    raise exception 'upsert_project_member_by_user_id: user_id is required';
  end if;

  if p_role <> 'owner' then
    perform 1
    from public.project_memberships
    where project_id = p_project_id
      and user_id = p_user_id
      and role = 'owner';

    if found then
      update public.project_memberships
      set updated_at = now()
      where project_id = p_project_id
        and user_id = p_user_id;
      return;
    end if;
  end if;

  insert into public.project_memberships (project_id, user_id, role)
  values (p_project_id, p_user_id, p_role)
  on conflict (project_id, user_id)
  do update set role = excluded.role, updated_at = now();
end;
$$;

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
  if p_user_id is null then
    raise exception 'Invite must be accepted by an authenticated user';
  end if;

  select *
  into v_invite
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

  -- Remove any legacy membership that was inserted for a synthetic profile
  -- keyed by invitee email so we do not keep duplicate ghost members.
  if v_invite.invitee_email is not null then
    delete from public.project_memberships pm
    where pm.project_id = v_invite.project_id
      and pm.user_id <> p_user_id
      and pm.user_id in (
        select pr.id
        from public.profiles pr
        where pr.email ilike v_invite.invitee_email
      );
  end if;

  -- Ensure a profile exists for the authenticated user so the membership insert
  -- does not violate the foreign key constraint. Older invites may have created
  -- a synthetic profile with a random id, so we merge those rows into the real
  -- profile that matches the Supabase auth user.
  <<ensure_profile>>
  declare
    v_normalized_email text;
    v_effective_email text;
  begin
    select lower(trim(v_invite.invitee_email))
    into v_normalized_email;

    if v_normalized_email is null then
      select lower(trim(email))
      into v_normalized_email
      from auth.users
      where id = p_user_id;
    end if;

    v_effective_email := coalesce(
      v_normalized_email,
      'user_' || replace(p_user_id::text, '-', '') || '@playjoob.local'
    );

    if v_normalized_email is not null then
      delete from public.profiles pr
      where pr.id <> p_user_id
        and lower(pr.email) = v_normalized_email;
    end if;

    insert into public.profiles as pr (id, email, full_name)
    values (
      p_user_id,
      v_effective_email,
      split_part(v_effective_email, '@', 1)
    )
    on conflict (id) do update
      set email = excluded.email,
          full_name = coalesce(pr.full_name, excluded.full_name),
          updated_at = now();
  exception
    when others then
      raise exception using message = format(
        'accept_project_invite ensure_profile failure for user %s: %s (SQLSTATE %s)',
        p_user_id,
        sqlerrm,
        SQLSTATE
      );
  end ensure_profile;

  perform public.upsert_project_member_by_user_id(
    v_invite.project_id,
    p_user_id,
    v_invite.role
  );

  update public.project_invites
  set status = 'accepted',
      accepted_at = now(),
      updated_at = now()
  where id = v_invite.id;

  return query
  select
    p.id as project_id,
    p.name::text as project_name,
    v_invite.role as role
  from public.projects p
  where p.id = v_invite.project_id;
end;
$$;

create or replace function public.accept_invitations_on_profile_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_normalized_email text;
begin
  v_normalized_email := lower(trim(new.email));

  if v_normalized_email is null or v_normalized_email = '' then
    return new;
  end if;

  insert into public.project_memberships (project_id, user_id, role)
  select
    pi.project_id,
    new.id,
    case lower(coalesce(pi.role, ''))
      when 'owner' then 'owner'
      when 'admin' then 'admin'
      when 'editor' then 'editor'
      when 'viewer' then 'viewer'
      when 'member' then 'editor'
      else 'viewer'
    end
  from public.project_invites pi
  where lower(pi.invitee_email) = v_normalized_email
    and pi.status = 'pending'
  on conflict (project_id, user_id)
  do update
    set role = excluded.role,
        updated_at = now();

  update public.project_invites
  set status = 'accepted',
      accepted_at = now(),
      updated_at = now()
  where lower(invitee_email) = v_normalized_email
    and status = 'pending';

  return new;
end;
$$;

grant execute on function public.accept_project_invite(uuid, uuid) to authenticated;
grant execute on function public.accept_project_invite(uuid, uuid) to service_role;
