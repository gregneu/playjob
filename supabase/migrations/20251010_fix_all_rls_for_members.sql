-- FIX: Allow project MEMBERS access to ALL project-related tables
-- This ensures realtime works for ALL users, not just owners

-- ============================================
-- ZONES table
-- ============================================
DROP POLICY IF EXISTS "zones_select" ON zones;
DROP POLICY IF EXISTS "zones_insert" ON zones;
DROP POLICY IF EXISTS "zones_update" ON zones;
DROP POLICY IF EXISTS "zones_delete" ON zones;

CREATE POLICY "zones_select" ON zones
  FOR SELECT USING (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE p.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM project_memberships pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "zones_insert" ON zones
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE p.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM project_memberships pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "zones_update" ON zones
  FOR UPDATE USING (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE p.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM project_memberships pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "zones_delete" ON zones
  FOR DELETE USING (
    project_id IN (
      SELECT p.id FROM projects p
      WHERE p.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM project_memberships pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      )
    )
  );

-- ============================================
-- ZONE_OBJECTS table
-- ============================================
DROP POLICY IF EXISTS "zone_objects_select" ON zone_objects;
DROP POLICY IF EXISTS "zone_objects_insert" ON zone_objects;
DROP POLICY IF EXISTS "zone_objects_update" ON zone_objects;
DROP POLICY IF EXISTS "zone_objects_delete" ON zone_objects;

CREATE POLICY "zone_objects_select" ON zone_objects
  FOR SELECT USING (
    zone_id IN (
      SELECT z.id FROM zones z
      JOIN projects p ON p.id = z.project_id
      WHERE p.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM project_memberships pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "zone_objects_insert" ON zone_objects
  FOR INSERT WITH CHECK (
    zone_id IN (
      SELECT z.id FROM zones z
      JOIN projects p ON p.id = z.project_id
      WHERE p.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM project_memberships pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "zone_objects_update" ON zone_objects
  FOR UPDATE USING (
    zone_id IN (
      SELECT z.id FROM zones z
      JOIN projects p ON p.id = z.project_id
      WHERE p.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM project_memberships pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "zone_objects_delete" ON zone_objects
  FOR DELETE USING (
    zone_id IN (
      SELECT z.id FROM zones z
      JOIN projects p ON p.id = z.project_id
      WHERE p.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM project_memberships pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      )
    )
  );

-- ============================================
-- ZONE_CELLS table
-- ============================================
DROP POLICY IF EXISTS "zone_cells_select" ON zone_cells;
DROP POLICY IF EXISTS "zone_cells_insert" ON zone_cells;
DROP POLICY IF EXISTS "zone_cells_update" ON zone_cells;
DROP POLICY IF EXISTS "zone_cells_delete" ON zone_cells;

CREATE POLICY "zone_cells_select" ON zone_cells
  FOR SELECT USING (
    zone_id IN (
      SELECT z.id FROM zones z
      JOIN projects p ON p.id = z.project_id
      WHERE p.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM project_memberships pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "zone_cells_insert" ON zone_cells
  FOR INSERT WITH CHECK (
    zone_id IN (
      SELECT z.id FROM zones z
      JOIN projects p ON p.id = z.project_id
      WHERE p.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM project_memberships pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "zone_cells_update" ON zone_cells
  FOR UPDATE USING (
    zone_id IN (
      SELECT z.id FROM zones z
      JOIN projects p ON p.id = z.project_id
      WHERE p.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM project_memberships pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "zone_cells_delete" ON zone_cells
  FOR DELETE USING (
    zone_id IN (
      SELECT z.id FROM zones z
      JOIN projects p ON p.id = z.project_id
      WHERE p.user_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM project_memberships pm
        WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
      )
    )
  );

-- ============================================
-- Verify all policies
-- ============================================
SELECT 
  '✅ RLS Policies Updated' as status,
  COUNT(*) as total_policies,
  string_agg(DISTINCT tablename, ', ') as affected_tables
FROM pg_policies 
WHERE tablename IN ('zones', 'zone_objects', 'zone_cells', 'object_tickets')
  AND policyname LIKE '%select%' OR policyname LIKE '%insert%' 
  OR policyname LIKE '%update%' OR policyname LIKE '%delete%';

