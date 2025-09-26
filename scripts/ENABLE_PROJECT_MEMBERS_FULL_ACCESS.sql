-- Grant full access to accepted project members across all core tables
-- Run this script in the Supabase SQL editor

-- Helper: enable RLS where needed
ALTER TABLE IF EXISTS projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS zone_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS hex_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS zone_objects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS object_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS zone_object_links ENABLE ROW LEVEL SECURITY;

-- MEMBERSHIP CHECK: a reusable condition (inline copy per policy)
-- Condition pattern:
--   EXISTS (
--     SELECT 1 FROM project_members pm
--     WHERE pm.project_id = <TABLE>.project_id
--       AND pm.user_id = auth.uid()
--       AND pm.status = 'accepted'
--   )

-- PROJECTS: allow members to read project rows; owners/admins/members to update if desired
DROP POLICY IF EXISTS projects_select_for_members ON projects;
CREATE POLICY projects_select_for_members ON projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = projects.id
        AND pm.user_id = auth.uid()
        AND pm.status = 'accepted'
    )
    OR projects.user_id = auth.uid()
  );

-- Optional broader rights (comment out if not needed):
DROP POLICY IF EXISTS projects_update_for_members ON projects;
CREATE POLICY projects_update_for_members ON projects
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = projects.id
        AND pm.user_id = auth.uid()
        AND pm.status IN ('accepted')
        AND pm.role IN ('owner','admin')
    )
    OR projects.user_id = auth.uid()
  );

-- ZONES: members of the project can CRUD zones
DROP POLICY IF EXISTS zones_select_for_members ON zones;
CREATE POLICY zones_select_for_members ON zones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = zones.project_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'accepted'
    )
  );

DROP POLICY IF EXISTS zones_insert_for_members ON zones;
CREATE POLICY zones_insert_for_members ON zones
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = zones.project_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'accepted'
    )
  );

DROP POLICY IF EXISTS zones_update_for_members ON zones;
CREATE POLICY zones_update_for_members ON zones
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = zones.project_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'accepted'
    )
  );

DROP POLICY IF EXISTS zones_delete_for_members ON zones;
CREATE POLICY zones_delete_for_members ON zones
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = zones.project_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'accepted'
    )
  );

-- ZONE_CELLS: membership via parent zone
DROP POLICY IF EXISTS zone_cells_select_for_members ON zone_cells;
CREATE POLICY zone_cells_select_for_members ON zone_cells
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM zones z JOIN project_members pm ON pm.project_id = z.project_id
      WHERE z.id = zone_cells.zone_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'accepted'
    )
  );

DROP POLICY IF EXISTS zone_cells_insert_for_members ON zone_cells;
CREATE POLICY zone_cells_insert_for_members ON zone_cells
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM zones z JOIN project_members pm ON pm.project_id = z.project_id
      WHERE z.id = zone_cells.zone_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'accepted'
    )
  );

DROP POLICY IF EXISTS zone_cells_delete_for_members ON zone_cells;
CREATE POLICY zone_cells_delete_for_members ON zone_cells
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM zones z JOIN project_members pm ON pm.project_id = z.project_id
      WHERE z.id = zone_cells.zone_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'accepted'
    )
  );

-- HEX_CELLS: membership by project_id
DROP POLICY IF EXISTS hex_cells_select_for_members ON hex_cells;
CREATE POLICY hex_cells_select_for_members ON hex_cells
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = hex_cells.project_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'accepted'
    )
  );

DROP POLICY IF EXISTS hex_cells_insert_for_members ON hex_cells;
CREATE POLICY hex_cells_insert_for_members ON hex_cells
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = hex_cells.project_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'accepted'
    )
  );

DROP POLICY IF EXISTS hex_cells_update_for_members ON hex_cells;
CREATE POLICY hex_cells_update_for_members ON hex_cells
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = hex_cells.project_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'accepted'
    )
  );

-- BUILDINGS: membership by project_id
DROP POLICY IF EXISTS buildings_select_for_members ON buildings;
CREATE POLICY buildings_select_for_members ON buildings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = buildings.project_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'accepted'
    )
  );

DROP POLICY IF EXISTS buildings_insert_for_members ON buildings;
CREATE POLICY buildings_insert_for_members ON buildings
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = buildings.project_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'accepted'
    )
  );

DROP POLICY IF EXISTS buildings_update_for_members ON buildings;
CREATE POLICY buildings_update_for_members ON buildings
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = buildings.project_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'accepted'
    )
  );

DROP POLICY IF EXISTS buildings_delete_for_members ON buildings;
CREATE POLICY buildings_delete_for_members ON buildings
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = buildings.project_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'accepted'
    )
  );

-- ZONE_OBJECTS: membership via parent zone
DROP POLICY IF EXISTS zone_objects_select_for_members ON zone_objects;
CREATE POLICY zone_objects_select_for_members ON zone_objects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM zones z JOIN project_members pm ON pm.project_id = z.project_id
      WHERE z.id = zone_objects.zone_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'accepted'
    )
  );

DROP POLICY IF EXISTS zone_objects_insert_for_members ON zone_objects;
CREATE POLICY zone_objects_insert_for_members ON zone_objects
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM zones z JOIN project_members pm ON pm.project_id = z.project_id
      WHERE z.id = zone_objects.zone_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'accepted'
    )
  );

DROP POLICY IF EXISTS zone_objects_update_for_members ON zone_objects;
CREATE POLICY zone_objects_update_for_members ON zone_objects
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM zones z JOIN project_members pm ON pm.project_id = z.project_id
      WHERE z.id = zone_objects.zone_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'accepted'
    )
  );

DROP POLICY IF EXISTS zone_objects_delete_for_members ON zone_objects;
CREATE POLICY zone_objects_delete_for_members ON zone_objects
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM zones z JOIN project_members pm ON pm.project_id = z.project_id
      WHERE z.id = zone_objects.zone_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'accepted'
    )
  );

-- OBJECT_TICKETS: membership through zone_objects -> zones
DROP POLICY IF EXISTS tickets_select_for_members ON object_tickets;
CREATE POLICY tickets_select_for_members ON object_tickets
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM zone_objects o
      JOIN zones z ON z.id = o.zone_id
      JOIN project_members pm ON pm.project_id = z.project_id
      WHERE o.id = object_tickets.zone_object_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'accepted'
    )
  );

DROP POLICY IF EXISTS tickets_insert_for_members ON object_tickets;
CREATE POLICY tickets_insert_for_members ON object_tickets
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1
      FROM zone_objects o
      JOIN zones z ON z.id = o.zone_id
      JOIN project_members pm ON pm.project_id = z.project_id
      WHERE o.id = object_tickets.zone_object_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'accepted'
    )
  );

DROP POLICY IF EXISTS tickets_update_for_members ON object_tickets;
CREATE POLICY tickets_update_for_members ON object_tickets
  FOR UPDATE USING (
    EXISTS (
      SELECT 1
      FROM zone_objects o
      JOIN zones z ON z.id = o.zone_id
      JOIN project_members pm ON pm.project_id = z.project_id
      WHERE o.id = object_tickets.zone_object_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'accepted'
    )
  );

DROP POLICY IF EXISTS tickets_delete_for_members ON object_tickets;
CREATE POLICY tickets_delete_for_members ON object_tickets
  FOR DELETE USING (
    EXISTS (
      SELECT 1
      FROM zone_objects o
      JOIN zones z ON z.id = o.zone_id
      JOIN project_members pm ON pm.project_id = z.project_id
      WHERE o.id = object_tickets.zone_object_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'accepted'
    )
  );

-- ZONE_OBJECT_LINKS: membership by project_id
DROP POLICY IF EXISTS links_select_for_members ON zone_object_links;
CREATE POLICY links_select_for_members ON zone_object_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = zone_object_links.project_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'accepted'
    )
  );

DROP POLICY IF EXISTS links_insert_for_members ON zone_object_links;
CREATE POLICY links_insert_for_members ON zone_object_links
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = zone_object_links.project_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'accepted'
    )
  );

DROP POLICY IF EXISTS links_delete_for_members ON zone_object_links;
CREATE POLICY links_delete_for_members ON zone_object_links
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = zone_object_links.project_id
        AND pm.user_id = auth.uid()
        AND pm.status = 'accepted'
    )
  );

-- Helpful indexes (idempotent)
CREATE INDEX IF NOT EXISTS idx_pm_project_user ON project_members(project_id, user_id);

-- Summary
SELECT 'Membership-based RLS applied for core tables' AS status;


