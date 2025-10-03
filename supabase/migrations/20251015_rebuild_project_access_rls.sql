-- Rebuild RLS policies to avoid project_memberships recursion issues
-- This migration centralizes membership checks into helper functions and reapplies
-- consistent policies across project-scoped tables.

set search_path to public;

create or replace function public.is_service_role()
returns boolean
language sql
stable
as $$
  select coalesce(current_setting('request.jwt.claim.role', true), '') = 'service_role';
$$;

create or replace function public.is_project_member(target_project_id uuid, target_user_id uuid, allowed_roles text[] default array['viewer','editor','admin','owner'])
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
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

create or replace function public.is_project_member(target_project_id uuid, allowed_roles text[] default array['viewer','editor','admin','owner'])
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
  select public.is_project_member(target_project_id, auth.uid());
$$;

create or replace function public.can_manage_project(target_project_id uuid)
returns boolean
language sql
stable
as $$
  select public.is_project_member(target_project_id, array['admin','owner']);
$$;


-- Project memberships RLS
alter table public.project_memberships enable row level security;

drop policy if exists "project_memberships_select" on public.project_memberships;
create policy "project_memberships_select" on public.project_memberships
  for select using (
    public.is_project_member(project_memberships.project_id)
  );

drop policy if exists "project_memberships_insert" on public.project_memberships;
create policy "project_memberships_insert" on public.project_memberships
  for insert with check (
    public.can_manage_project(project_memberships.project_id)
  );

drop policy if exists "project_memberships_update" on public.project_memberships;
create policy "project_memberships_update" on public.project_memberships
  for update using (
    public.can_manage_project(project_memberships.project_id)
  ) with check (
    public.can_manage_project(project_memberships.project_id)
  );

drop policy if exists "project_memberships_delete" on public.project_memberships;
create policy "project_memberships_delete" on public.project_memberships
  for delete using (
    public.can_manage_project(project_memberships.project_id)
  );


-- Project invites RLS
alter table public.project_invites enable row level security;

drop policy if exists "project_invites_select" on public.project_invites;
create policy "project_invites_select" on public.project_invites
  for select using (
    public.is_project_member(project_invites.project_id, array['editor','admin','owner'])
  );

drop policy if exists "project_invites_insert" on public.project_invites;
create policy "project_invites_insert" on public.project_invites
  for insert with check (
    public.can_manage_project(project_invites.project_id)
  );

drop policy if exists "project_invites_update" on public.project_invites;
create policy "project_invites_update" on public.project_invites
  for update using (
    public.can_manage_project(project_invites.project_id)
  );

drop policy if exists "project_invites_delete" on public.project_invites;
create policy "project_invites_delete" on public.project_invites
  for delete using (
    public.can_manage_project(project_invites.project_id)
  );


-- Zones and related tables RLS
alter table public.zones enable row level security;

drop policy if exists "zones_select_for_members" on public.zones;
create policy "zones_select_for_members" on public.zones
  for select using (
    public.is_project_member(zones.project_id)
  );

drop policy if exists "zones_insert_for_members" on public.zones;
create policy "zones_insert_for_members" on public.zones
  for insert with check (
    public.can_manage_project(zones.project_id)
  );

drop policy if exists "zones_update_for_members" on public.zones;
create policy "zones_update_for_members" on public.zones
  for update using (
    public.can_manage_project(zones.project_id)
  );

drop policy if exists "zones_delete_for_members" on public.zones;
create policy "zones_delete_for_members" on public.zones
  for delete using (
    public.can_manage_project(zones.project_id)
  );


alter table public.hex_cells enable row level security;

drop policy if exists "hex_cells_select_for_members" on public.hex_cells;
create policy "hex_cells_select_for_members" on public.hex_cells
  for select using (
    public.is_project_member(hex_cells.project_id)
  );

drop policy if exists "hex_cells_insert_for_members" on public.hex_cells;
create policy "hex_cells_insert_for_members" on public.hex_cells
  for insert with check (
    public.can_manage_project(hex_cells.project_id)
  );

drop policy if exists "hex_cells_update_for_members" on public.hex_cells;
create policy "hex_cells_update_for_members" on public.hex_cells
  for update using (
    public.can_manage_project(hex_cells.project_id)
  );

drop policy if exists "hex_cells_delete_for_members" on public.hex_cells;
create policy "hex_cells_delete_for_members" on public.hex_cells
  for delete using (
    public.can_manage_project(hex_cells.project_id)
  );


alter table public.buildings enable row level security;

drop policy if exists "buildings_select_for_members" on public.buildings;
create policy "buildings_select_for_members" on public.buildings
  for select using (
    public.is_project_member(buildings.project_id)
  );

drop policy if exists "buildings_insert_for_members" on public.buildings;
create policy "buildings_insert_for_members" on public.buildings
  for insert with check (
    public.can_manage_project(buildings.project_id)
  );

drop policy if exists "buildings_update_for_members" on public.buildings;
create policy "buildings_update_for_members" on public.buildings
  for update using (
    public.can_manage_project(buildings.project_id)
  );

drop policy if exists "buildings_delete_for_members" on public.buildings;
create policy "buildings_delete_for_members" on public.buildings
  for delete using (
    public.can_manage_project(buildings.project_id)
  );


alter table public.zone_object_links enable row level security;

drop policy if exists "zone_object_links_select" on public.zone_object_links;
create policy "zone_object_links_select" on public.zone_object_links
  for select using (
    public.is_project_member(zone_object_links.project_id)
  );

drop policy if exists "zone_object_links_insert" on public.zone_object_links;
create policy "zone_object_links_insert" on public.zone_object_links
  for insert with check (
    public.can_manage_project(zone_object_links.project_id)
  );

drop policy if exists "zone_object_links_update" on public.zone_object_links;
create policy "zone_object_links_update" on public.zone_object_links
  for update using (
    public.can_manage_project(zone_object_links.project_id)
  );

drop policy if exists "zone_object_links_delete" on public.zone_object_links;
create policy "zone_object_links_delete" on public.zone_object_links
  for delete using (
    public.can_manage_project(zone_object_links.project_id)
  );


-- Zone objects and tickets RLS
alter table if exists public.zone_objects enable row level security;

drop policy if exists "zone_objects_select" on public.zone_objects;
create policy "zone_objects_select" on public.zone_objects
  for select using (
    public.is_project_member(
      (select z.project_id from public.zones z where z.id = zone_objects.zone_id)
    )
  );

drop policy if exists "zone_objects_insert" on public.zone_objects;
create policy "zone_objects_insert" on public.zone_objects
  for insert with check (
    public.can_manage_project(
      (select z.project_id from public.zones z where z.id = zone_objects.zone_id)
    )
  );

drop policy if exists "zone_objects_update" on public.zone_objects;
create policy "zone_objects_update" on public.zone_objects
  for update using (
    public.can_manage_project(
      (select z.project_id from public.zones z where z.id = zone_objects.zone_id)
    )
  );

drop policy if exists "zone_objects_delete" on public.zone_objects;
create policy "zone_objects_delete" on public.zone_objects
  for delete using (
    public.can_manage_project(
      (select z.project_id from public.zones z where z.id = zone_objects.zone_id)
    )
  );


alter table if exists public.object_tickets enable row level security;

drop policy if exists "object_tickets_select" on public.object_tickets;
create policy "object_tickets_select" on public.object_tickets
  for select using (
    public.is_project_member(
      (select z.project_id
       from public.zone_objects zo
       join public.zones z on z.id = zo.zone_id
       where zo.id = object_tickets.zone_object_id)
    )
  );

drop policy if exists "object_tickets_insert" on public.object_tickets;
create policy "object_tickets_insert" on public.object_tickets
  for insert with check (
    public.can_manage_project(
      (select z.project_id
       from public.zone_objects zo
       join public.zones z on z.id = zo.zone_id
       where zo.id = object_tickets.zone_object_id)
    )
  );

drop policy if exists "object_tickets_update" on public.object_tickets;
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

drop policy if exists "object_tickets_delete" on public.object_tickets;
create policy "object_tickets_delete" on public.object_tickets
  for delete using (
    public.can_manage_project(
      (select z.project_id
       from public.zone_objects zo
       join public.zones z on z.id = zo.zone_id
       where zo.id = object_tickets.zone_object_id)
    )
  );

-- Add similar policies for any additional tables that rely on project membership.
