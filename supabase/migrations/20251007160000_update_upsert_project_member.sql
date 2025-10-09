set search_path = public;

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
  v_email text := lower(trim(p_email));
begin
  select id into v_user_id
  from public.profiles
  where lower(email) = v_email
  limit 1;

  if v_user_id is null then
    insert into public.profiles (email, full_name)
    values (v_email, split_part(v_email, '@', 1))
    on conflict (email) do update
      set full_name = coalesce(profiles.full_name, excluded.full_name),
          updated_at = now()
    returning id into v_user_id;
  end if;

  if v_user_id is null then
    raise exception 'Unable to resolve invitee profile for %', p_email;
  end if;

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
  do update set role = excluded.role,
               updated_at = now();
end;
$$;
