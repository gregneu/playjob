-- Enable REPLICA IDENTITY FULL for object_tickets table
-- This ensures that realtime UPDATE events include ALL columns in the "old" payload,
-- not just the primary key. This is critical for detecting when tickets move between buildings.

-- Change replica identity to FULL
ALTER TABLE object_tickets REPLICA IDENTITY FULL;

-- Verify the change
SELECT 
  n.nspname as schemaname,
  c.relname as tablename,
  CASE c.relreplident
    WHEN 'd' THEN 'DEFAULT (only primary key in old payload)'
    WHEN 'f' THEN 'FULL (all columns in old payload) ✅'
    WHEN 'i' THEN 'INDEX'
    WHEN 'n' THEN 'NOTHING'
  END as replica_identity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' 
  AND c.relname = 'object_tickets';

