-- Verify realtime is properly configured for all tables
-- Run this in Supabase SQL Editor to check realtime status

-- Check which tables are in the realtime publication
SELECT 
  schemaname, 
  tablename,
  'Realtime enabled ✅' as status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
  AND schemaname = 'public'
ORDER BY tablename;

-- Check if object_tickets is missing (should return 0 rows if properly configured)
SELECT 
  CASE 
    WHEN COUNT(*) = 0 THEN 'WARNING: object_tickets is NOT in realtime publication ⚠️'
    ELSE 'OK: object_tickets is in realtime publication ✅'
  END as object_tickets_status
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
  AND tablename = 'object_tickets';

-- Verify RLS is enabled for object_tickets
SELECT 
  schemaname,
  tablename,
  rowsecurity,
  CASE 
    WHEN rowsecurity THEN 'RLS enabled ✅'
    ELSE 'RLS disabled ⚠️'
  END as rls_status
FROM pg_tables 
WHERE tablename IN ('object_tickets', 'zones', 'zone_objects', 'zone_cells')
  AND schemaname = 'public';

-- Show RLS policies for object_tickets
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  CASE cmd
    WHEN 'SELECT' THEN 'Read policy'
    WHEN 'INSERT' THEN 'Create policy'
    WHEN 'UPDATE' THEN 'Update policy'
    WHEN 'DELETE' THEN 'Delete policy'
    ELSE 'Other'
  END as policy_type
FROM pg_policies 
WHERE tablename = 'object_tickets'
ORDER BY cmd, policyname;

