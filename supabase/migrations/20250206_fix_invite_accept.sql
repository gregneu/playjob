-- Ensure invite acceptance uses the authenticated user id so the membership
-- appears in the invitee's project list immediately.

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
  select p.id, p.name, v_invite.role
  from public.projects p
  where p.id = v_invite.project_id;
end;
$$;
