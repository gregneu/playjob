-- Align projects table with application expectations
set search_path = public;

-- 1) Add created_by column if it does not exist
alter table public.projects
  add column if not exists created_by uuid references auth.users(id);

-- 2) Backfill existing rows with the best available owner information
update public.projects
set created_by = coalesce(created_by, owner_id, user_id)
where created_by is null
  and coalesce(owner_id, user_id) is not null;

-- 3) Ensure owner_id stays populated (some older rows only had created_by/user_id)
update public.projects
set owner_id = coalesce(owner_id, created_by, user_id)
where owner_id is null
  and coalesce(created_by, user_id) is not null;

-- 4) Refresh the owner trigger so it uses the new created_by column
create or replace function public.handle_project_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  v_owner := coalesce(new.owner_id, new.created_by, new.user_id);

  if v_owner is null then
    return new;
  end if;

  if new.owner_id is null then
    update public.projects
    set owner_id = v_owner,
        updated_at = now()
    where id = new.id;
  end if;

  if new.created_by is null then
    update public.projects
    set created_by = v_owner,
        updated_at = now()
    where id = new.id;
  end if;

  insert into public.project_memberships (project_id, user_id, role)
  values (new.id, v_owner, 'owner')
  on conflict (project_id, user_id)
  do update set role = 'owner', updated_at = now();

  return new;
end;
$$;

drop trigger if exists project_owner_default on public.projects;
create trigger project_owner_default
after insert on public.projects
for each row execute function public.handle_project_owner();
