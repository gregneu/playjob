-- ============================================
-- ПОЛНОЕ ИСПРАВЛЕНИЕ RLS И REALTIME
-- ============================================
-- Скопируйте весь этот файл и вставьте в Supabase SQL Editor
-- Выполните всё за один раз

-- ============================================
-- STEP 1: Enable REPLICA IDENTITY FULL
-- ============================================
ALTER TABLE object_tickets REPLICA IDENTITY FULL;

-- ============================================
-- STEP 2: Enable Realtime for object_tickets
-- ============================================
DO $$
BEGIN
  -- Try to drop table from publication (ignore error if not present)
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE object_tickets;
    RAISE NOTICE 'Dropped object_tickets from publication';
  EXCEPTION
    WHEN undefined_object THEN
      RAISE NOTICE 'object_tickets was not in publication';
    WHEN OTHERS THEN
      RAISE NOTICE 'Error dropping: %', SQLERRM;
  END;

  -- Add table to publication (ignore error if already present)
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE object_tickets;
    RAISE NOTICE 'Added object_tickets to publication';
  EXCEPTION
    WHEN duplicate_object THEN
      RAISE NOTICE 'object_tickets already in publication';
    WHEN OTHERS THEN
      RAISE WARNING 'Error adding: %', SQLERRM;
      RAISE;
  END;
END $$;

-- ============================================
-- STEP 3: Fix RLS for OBJECT_TICKETS
-- ============================================
DROP POLICY IF EXISTS "tickets_select" ON object_tickets;
DROP POLICY IF EXISTS "tickets_insert" ON object_tickets;
DROP POLICY IF EXISTS "tickets_update" ON object_tickets;
DROP POLICY IF EXISTS "tickets_delete" ON object_tickets;
DROP POLICY IF EXISTS "object_tickets_select" ON object_tickets;
DROP POLICY IF EXISTS "object_tickets_insert" ON object_tickets;
DROP POLICY IF EXISTS "object_tickets_update" ON object_tickets;
DROP POLICY IF EXISTS "object_tickets_delete" ON object_tickets;

-- SELECT: Allow if user is project owner OR member
CREATE POLICY "object_tickets_select" ON object_tickets
  FOR SELECT USING (
    zone_object_id IN (
      SELECT o.id
      FROM zone_objects o
      JOIN zones z ON z.id = o.zone_id
      JOIN projects p ON p.id = z.project_id
      WHERE 
        p.user_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM project_memberships pm
          WHERE pm.project_id = p.id
            AND pm.user_id = auth.uid()
        )
    )
  );

-- INSERT: Allow if user is project owner OR member
CREATE POLICY "object_tickets_insert" ON object_tickets
  FOR INSERT WITH CHECK (
    zone_object_id IN (
      SELECT o.id
      FROM zone_objects o
      JOIN zones z ON z.id = o.zone_id
      JOIN projects p ON p.id = z.project_id
      WHERE 
        p.user_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM project_memberships pm
          WHERE pm.project_id = p.id
            AND pm.user_id = auth.uid()
        )
    )
  );

-- UPDATE: Allow if user is project owner OR member
CREATE POLICY "object_tickets_update" ON object_tickets
  FOR UPDATE USING (
    zone_object_id IN (
      SELECT o.id
      FROM zone_objects o
      JOIN zones z ON z.id = o.zone_id
      JOIN projects p ON p.id = z.project_id
      WHERE 
        p.user_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM project_memberships pm
          WHERE pm.project_id = p.id
            AND pm.user_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    zone_object_id IN (
      SELECT o.id
      FROM zone_objects o
      JOIN zones z ON z.id = o.zone_id
      JOIN projects p ON p.id = z.project_id
      WHERE 
        p.user_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM project_memberships pm
          WHERE pm.project_id = p.id
            AND pm.user_id = auth.uid()
        )
    )
  );

-- DELETE: Allow if user is project owner OR member
CREATE POLICY "object_tickets_delete" ON object_tickets
  FOR DELETE USING (
    zone_object_id IN (
      SELECT o.id
      FROM zone_objects o
      JOIN zones z ON z.id = o.zone_id
      JOIN projects p ON p.id = z.project_id
      WHERE 
        p.user_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM project_memberships pm
          WHERE pm.project_id = p.id
            AND pm.user_id = auth.uid()
        )
    )
  );

-- ============================================
-- STEP 4: Fix RLS for ZONES
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
-- STEP 5: Fix RLS for ZONE_OBJECTS
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
-- STEP 6: Fix RLS for ZONE_CELLS
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
-- VERIFICATION
-- ============================================

-- Check Replica Identity
SELECT 
  'STEP 1: Replica Identity' as check_step,
  n.nspname as schemaname,
  c.relname as tablename,
  CASE c.relreplident
    WHEN 'd' THEN '⚠️ DEFAULT'
    WHEN 'f' THEN '✅ FULL'
    WHEN 'i' THEN '⚠️ INDEX'
    WHEN 'n' THEN '❌ NOTHING'
  END as replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND c.relname = 'object_tickets';

-- Check Realtime Publication
SELECT 
  'STEP 2: Realtime Publication' as check_step,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ object_tickets IS in realtime publication'
    ELSE '❌ object_tickets is NOT in realtime publication'
  END as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
  AND tablename = 'object_tickets';

-- Check RLS Policies Count
SELECT 
  'STEP 3-6: RLS Policies' as check_step,
  tablename,
  COUNT(*) as policy_count,
  string_agg(cmd::text, ', ') as operations
FROM pg_policies 
WHERE tablename IN ('object_tickets', 'zones', 'zone_objects', 'zone_cells')
GROUP BY tablename
ORDER BY tablename;

-- Summary
SELECT 
  '========================================' as final_check,
  'ALL STEPS COMPLETED ✅' as status,
  'Refresh your browser (Cmd/Ctrl + Shift + R)' as next_step;

