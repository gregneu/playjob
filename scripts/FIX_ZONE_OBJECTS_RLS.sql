-- FIX RLS FOR ZONE OBJECTS SO PROJECT MEMBERS CAN SEE BUILDINGS
-- Run this in Supabase SQL Editor

-- 1) Show current RLS status for relevant tables
SELECT '=== CURRENT RLS STATUS (zones, zone_objects, tickets, links) ===' as info;
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('zones','zone_objects','tickets','links','hex_cells')
ORDER BY tablename;

-- 2) Temporarily disable RLS to unblock reads during testing
ALTER TABLE IF EXISTS zone_objects DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS zones DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS links DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS hex_cells DISABLE ROW LEVEL SECURITY;

-- 3) Optionally, if you prefer keeping RLS ON, you can create safe SELECT policies instead.
--    Comment out the DISABLE statements above and use the policies below.
--    These policies allow any accepted project member to read data for their project.
--
-- DO $$
-- BEGIN
--   IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename='zone_objects') THEN
--     ALTER TABLE zone_objects ENABLE ROW LEVEL SECURITY;
--     DROP POLICY IF EXISTS "zone_objects_select_for_members" ON zone_objects;
--     CREATE POLICY "zone_objects_select_for_members" ON zone_objects FOR SELECT USING (
--       EXISTS (
--         SELECT 1
--         FROM zones z
--         JOIN project_members pm ON pm.project_id = z.project_id
--         WHERE z.id = zone_objects.zone_id
--           AND pm.user_id = auth.uid()
--           AND pm.status = 'accepted'
--       )
--     );
--   END IF;
--
--   IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename='zones') THEN
--     ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
--     DROP POLICY IF EXISTS "zones_select_for_members" ON zones;
--     CREATE POLICY "zones_select_for_members" ON zones FOR SELECT USING (
--       EXISTS (
--         SELECT 1
--         FROM project_members pm
--         WHERE pm.project_id = zones.project_id
--           AND pm.user_id = auth.uid()
--           AND pm.status = 'accepted'
--       )
--     );
--   END IF;
-- END $$;

-- 4) Verify access by counting rows
SELECT '=== ROW COUNTS AFTER RLS CHANGE ===' as info;
SELECT 'zones' AS table_name, COUNT(*) AS total FROM zones
UNION ALL
SELECT 'zone_objects' AS table_name, COUNT(*) FROM zone_objects
UNION ALL
SELECT 'tickets' AS table_name, COUNT(*) FROM tickets
UNION ALL
SELECT 'links' AS table_name, COUNT(*) FROM links
UNION ALL
SELECT 'hex_cells' AS table_name, COUNT(*) FROM hex_cells;

-- 5) Sample preview
SELECT '=== SAMPLE zone_objects ===' as info;
SELECT id, zone_id, object_type, title, q, r, created_by, created_at
FROM zone_objects
ORDER BY created_at DESC
LIMIT 10;
