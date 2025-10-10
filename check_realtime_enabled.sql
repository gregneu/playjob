-- Check if realtime is enabled for tables
-- Run this in Supabase SQL Editor

-- Check realtime publications
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('object_tickets', 'zones', 'zone_objects', 'zone_cells');

-- If object_tickets is NOT in the list above, enable it with:
-- ALTER PUBLICATION supabase_realtime ADD TABLE object_tickets;

-- Also check if RLS is enabled (should be enabled for security)
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'object_tickets';

