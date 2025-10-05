set search_path = public;

-- Helper to check if a user can manage the project (admin or owner)
create or replace function public.is_project_manager(p_project_id uuid, p_user_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform set_config('row_security', 'off', true);

  begin
    if public.is_service_role() then
      return true;
    end if;
  exception
    when undefined_function then
      -- fall through to membership check
      null;
  end;

  return exists (
    select 1
    from public.project_memberships pm
    where pm.project_id = p_project_id
      and pm.user_id = p_user_id
      and pm.role in ('owner','admin')
  );
end;
$$;

-- Remove a member (except owners) from a project
create or replace function public.remove_project_member(
  p_project_id uuid,
  p_target_user_id uuid,
  p_requested_by uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_role text;
begin
  perform set_config('row_security', 'off', true);

  if not public.is_project_manager(p_project_id, p_requested_by) then
    raise exception 'insufficient permissions';
  end if;

  select pm.role into v_target_role
  from public.project_memberships pm
  where pm.project_id = p_project_id
    and pm.user_id = p_target_user_id;

  if v_target_role is null then
    raise exception 'member not found';
  end if;

  if v_target_role = 'owner' then
    raise exception 'cannot remove project owner';
  end if;

  delete from public.project_memberships pm
  where pm.project_id = p_project_id
    and pm.user_id = p_target_user_id;

  return true;
end;
$$;

-- Remove a pending invite by email
create or replace function public.remove_project_invite(
  p_project_id uuid,
  p_invitee_email text,
  p_requested_by uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('row_security', 'off', true);

  if not public.is_project_manager(p_project_id, p_requested_by) then
    raise exception 'insufficient permissions';
  end if;

  delete from public.project_invites pi
  where pi.project_id = p_project_id
    and lower(pi.invitee_email) = lower(p_invitee_email)
    and pi.status = 'pending';

  return true;
end;
$$;

-- Update RLS policies to allow managers to delete
alter table public.project_memberships enable row level security;

drop policy if exists "project_memberships_delete" on public.project_memberships;
create policy "project_memberships_delete" on public.project_memberships
  for delete using (
    public.is_project_manager(project_memberships.project_id, auth.uid())
  );

alter table public.project_invites enable row level security;

drop policy if exists "project_invites_delete" on public.project_invites;
create policy "project_invites_delete" on public.project_invites
  for delete using (
    public.is_project_manager(project_invites.project_id, auth.uid())
  );
