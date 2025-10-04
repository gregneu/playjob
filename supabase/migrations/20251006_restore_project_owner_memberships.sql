set search_path = public;

-- Ensure owner_id is populated for legacy rows
update public.projects
set owner_id = coalesce(owner_id, user_id, created_by)
where owner_id is null
  and coalesce(user_id, created_by) is not null;

-- Guarantee unique constraint for project memberships
create unique index if not exists project_memberships_project_user_idx
  on public.project_memberships(project_id, user_id);

-- Backfill missing owner memberships
insert into public.project_memberships (project_id, user_id, role, created_at, updated_at)
select
  p.id,
  p.owner_id,
  'owner' as role,
  coalesce(p.created_at, now()),
  coalesce(p.updated_at, now())
from public.projects p
left join public.project_memberships pm
  on pm.project_id = p.id
  and pm.user_id = p.owner_id
where p.owner_id is not null
  and pm.id is null;

-- Trigger to keep project_memberships in sync with project ownership
create or replace function public.handle_project_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner uuid;
begin
  v_owner := coalesce(new.owner_id, new.user_id, new.created_by);

  if v_owner is null then
    return new;
  end if;

  -- keep owner_id column populated for downstream logic
  if new.owner_id is null then
    update public.projects
    set owner_id = v_owner,
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
