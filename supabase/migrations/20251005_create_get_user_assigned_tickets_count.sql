-- Ensure RPC for assigned ticket counts exists (fallback from client removed when this runs)
set search_path = public;

create or replace function public.get_user_assigned_tickets_count(
  project_uuid uuid,
  user_uuid uuid
)
returns integer
language plpgsql
security definer
as $$
declare
  assigned_count integer;
begin
  select count(*) into assigned_count
  from object_tickets ot
  join zone_objects zo on zo.id = ot.zone_object_id
  join zones z on z.id = zo.zone_id
  where z.project_id = project_uuid
    and ot.assignee_id = user_uuid
    and coalesce(ot.status, 'open') <> 'done';

  return coalesce(assigned_count, 0);
end;
$$;

revoke all on function public.get_user_assigned_tickets_count(uuid, uuid) from public;
grant execute on function public.get_user_assigned_tickets_count(uuid, uuid) to authenticated;
grant execute on function public.get_user_assigned_tickets_count(uuid, uuid) to anon;
