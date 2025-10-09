set search_path = public;

-- Remove previous overloads to avoid conflicts before redefinition
-- Drop policies that reference is_project_member so we can recreate the helper cleanly.
drop policy if exists "sprints_select" on public.sprints;
drop policy if exists "sprints_insert" on public.sprints;
drop policy if exists "sprints_update" on public.sprints;
drop policy if exists "sprints_delete" on public.sprints;
drop policy if exists "project_memberships_select" on public.project_memberships;
drop policy if exists "project_memberships_insert" on public.project_memberships;
drop policy if exists "project_memberships_update" on public.project_memberships;
drop policy if exists "project_memberships_delete" on public.project_memberships;
drop policy if exists "project_invites_select" on public.project_invites;
drop policy if exists "project_invites_insert" on public.project_invites;
drop policy if exists "project_invites_update" on public.project_invites;
drop policy if exists "project_invites_delete" on public.project_invites;
drop policy if exists "zones_select_for_members" on public.zones;
drop policy if exists "zones_insert_for_members" on public.zones;
drop policy if exists "zones_update_for_members" on public.zones;
drop policy if exists "zones_delete_for_members" on public.zones;
drop policy if exists "hex_cells_select_for_members" on public.hex_cells;
drop policy if exists "hex_cells_insert_for_members" on public.hex_cells;
drop policy if exists "hex_cells_update_for_members" on public.hex_cells;
drop policy if exists "hex_cells_delete_for_members" on public.hex_cells;
drop policy if exists "buildings_select_for_members" on public.buildings;
drop policy if exists "buildings_insert_for_members" on public.buildings;
drop policy if exists "buildings_update_for_members" on public.buildings;
drop policy if exists "buildings_delete_for_members" on public.buildings;
drop policy if exists "zone_object_links_select" on public.zone_object_links;
drop policy if exists "zone_object_links_insert" on public.zone_object_links;
drop policy if exists "zone_object_links_update" on public.zone_object_links;
drop policy if exists "zone_object_links_delete" on public.zone_object_links;
drop policy if exists "zone_objects_select" on public.zone_objects;
drop policy if exists "zone_objects_insert" on public.zone_objects;
drop policy if exists "zone_objects_update" on public.zone_objects;
drop policy if exists "zone_objects_delete" on public.zone_objects;
drop policy if exists "object_tickets_select" on public.object_tickets;
drop policy if exists "object_tickets_insert" on public.object_tickets;
drop policy if exists "object_tickets_update" on public.object_tickets;
drop policy if exists "object_tickets_delete" on public.object_tickets;

drop function if exists public.can_manage_project(uuid) cascade;
drop function if exists public.is_project_member(uuid, uuid, text[]) cascade;
drop function if exists public.is_project_member(uuid, uuid) cascade;
drop function if exists public.is_project_member(uuid, text[]) cascade;
drop function if exists public.is_project_member(uuid) cascade;

-- Reapply is_project_member helper with row security disabled inside the function
-- to prevent recursive policy evaluation loops (42P17).
create or replace function public.is_project_member(
  target_project_id uuid,
  target_user_id uuid,
  allowed_roles text[] default array['viewer','editor','admin','owner']
)
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

create or replace function public.is_project_member(
  target_project_id uuid,
  allowed_roles text[]
)
returns boolean
language sql
stable
as $$
  select public.is_project_member(target_project_id, auth.uid(), allowed_roles);
$$;

create or replace function public.is_project_member(target_project_id uuid)
returns boolean
language sql
stable
as $$
  select public.is_project_member(
    target_project_id,
    auth.uid(),
    array['viewer','editor','admin','owner']
  );
$$;

create or replace function public.can_manage_project(target_project_id uuid)
returns boolean
language sql
stable
as $$
  select public.is_project_member(
    target_project_id,
    auth.uid(),
    array['admin','owner']
  );
$$;

-- Recreate policies using the refreshed helper.
create policy "project_memberships_select" on public.project_memberships
  for select using (
    public.is_project_member(project_memberships.project_id)
  );

create policy "project_memberships_insert" on public.project_memberships
  for insert with check (
    public.can_manage_project(project_memberships.project_id)
  );

create policy "project_memberships_update" on public.project_memberships
  for update using (
    public.can_manage_project(project_memberships.project_id)
  ) with check (
    public.can_manage_project(project_memberships.project_id)
  );

create policy "project_memberships_delete" on public.project_memberships
  for delete using (
    public.can_manage_project(project_memberships.project_id)
  );

create policy "project_invites_select" on public.project_invites
  for select using (
    public.is_project_member(project_invites.project_id, array['editor','admin','owner'])
  );

create policy "project_invites_insert" on public.project_invites
  for insert with check (
    public.can_manage_project(project_invites.project_id)
  );

create policy "project_invites_update" on public.project_invites
  for update using (
    public.can_manage_project(project_invites.project_id)
  );

create policy "project_invites_delete" on public.project_invites
  for delete using (
    public.can_manage_project(project_invites.project_id)
  );

create policy "zones_select_for_members" on public.zones
  for select using (
    public.is_project_member(zones.project_id)
  );

create policy "zones_insert_for_members" on public.zones
  for insert with check (
    public.can_manage_project(zones.project_id)
  );

create policy "zones_update_for_members" on public.zones
  for update using (
    public.can_manage_project(zones.project_id)
  );

create policy "zones_delete_for_members" on public.zones
  for delete using (
    public.can_manage_project(zones.project_id)
  );

create policy "hex_cells_select_for_members" on public.hex_cells
  for select using (
    public.is_project_member(hex_cells.project_id)
  );

create policy "hex_cells_insert_for_members" on public.hex_cells
  for insert with check (
    public.can_manage_project(hex_cells.project_id)
  );

create policy "hex_cells_update_for_members" on public.hex_cells
  for update using (
    public.can_manage_project(hex_cells.project_id)
  );

create policy "hex_cells_delete_for_members" on public.hex_cells
  for delete using (
    public.can_manage_project(hex_cells.project_id)
  );

create policy "buildings_select_for_members" on public.buildings
  for select using (
    public.is_project_member(buildings.project_id)
  );

create policy "buildings_insert_for_members" on public.buildings
  for insert with check (
    public.can_manage_project(buildings.project_id)
  );

create policy "buildings_update_for_members" on public.buildings
  for update using (
    public.can_manage_project(buildings.project_id)
  );

create policy "buildings_delete_for_members" on public.buildings
  for delete using (
    public.can_manage_project(buildings.project_id)
  );

create policy "zone_object_links_select" on public.zone_object_links
  for select using (
    public.is_project_member(zone_object_links.project_id)
  );

create policy "zone_object_links_insert" on public.zone_object_links
  for insert with check (
    public.can_manage_project(zone_object_links.project_id)
  );

create policy "zone_object_links_update" on public.zone_object_links
  for update using (
    public.can_manage_project(zone_object_links.project_id)
  );

create policy "zone_object_links_delete" on public.zone_object_links
  for delete using (
    public.can_manage_project(zone_object_links.project_id)
  );

create policy "zone_objects_select" on public.zone_objects
  for select using (
    public.is_project_member(
      (select z.project_id from public.zones z where z.id = zone_objects.zone_id)
    )
  );

create policy "zone_objects_insert" on public.zone_objects
  for insert with check (
    public.can_manage_project(
      (select z.project_id from public.zones z where z.id = zone_objects.zone_id)
    )
  );

create policy "zone_objects_update" on public.zone_objects
  for update using (
    public.can_manage_project(
      (select z.project_id from public.zones z where z.id = zone_objects.zone_id)
    )
  );

create policy "zone_objects_delete" on public.zone_objects
  for delete using (
    public.can_manage_project(
      (select z.project_id from public.zones z where z.id = zone_objects.zone_id)
    )
  );

create policy "object_tickets_select" on public.object_tickets
  for select using (
    public.is_project_member(
      (select z.project_id
       from public.zone_objects zo
       join public.zones z on z.id = zo.zone_id
       where zo.id = object_tickets.zone_object_id)
    )
  );

create policy "object_tickets_insert" on public.object_tickets
  for insert with check (
    public.can_manage_project(
      (select z.project_id
       from public.zone_objects zo
       join public.zones z on z.id = zo.zone_id
       where zo.id = object_tickets.zone_object_id)
    )
  );

create policy "object_tickets_update" on public.object_tickets
  for update using (
    public.can_manage_project(
      (select z.project_id
       from public.zone_objects zo
       join public.zones z on z.id = zo.zone_id
       where zo.id = object_tickets.zone_object_id)
    )
  ) with check (
    public.can_manage_project(
      (select z.project_id
       from public.zone_objects zo
       join public.zones z on z.id = zo.zone_id
       where zo.id = object_tickets.zone_object_id)
    )
  );

create policy "object_tickets_delete" on public.object_tickets
  for delete using (
    public.can_manage_project(
      (select z.project_id
       from public.zone_objects zo
       join public.zones z on z.id = zo.zone_id
       where zo.id = object_tickets.zone_object_id)
    )
  );
