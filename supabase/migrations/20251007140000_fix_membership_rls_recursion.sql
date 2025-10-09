set search_path = public;

create or replace function public.is_project_member(target_project_id uuid, target_user_id uuid, allowed_roles text[])
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform set_config('row_security', 'off', true);

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
