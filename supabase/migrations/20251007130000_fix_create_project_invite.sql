set search_path = public;

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
  v_invite_id uuid;
begin
  if p_role not in ('viewer','editor','admin') then
    raise exception 'Invalid role value %', p_role;
  end if;

  select name into v_project_name
  from public.projects
  where id = p_project_id;

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
    returning id into v_invite_id;
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
    returning id into v_invite_id;
  end if;

  return query
  select
    pi.id,
    pi.invite_token,
    pi.project_id,
    v_project_name,
    pi.role,
    pi.status,
    pi.expires_at
  from public.project_invites pi
  where pi.id = v_invite_id;
end;
$$;
