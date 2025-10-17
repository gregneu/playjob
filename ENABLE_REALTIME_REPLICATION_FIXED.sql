-- Enable realtime replication for meeting_participants table
-- Execute this in Supabase SQL Editor

-- Skip adding to publication since it's already there
-- ALTER PUBLICATION supabase_realtime ADD TABLE meeting_participants;

-- Enable realtime on the table if not already enabled
ALTER TABLE meeting_participants REPLICA IDENTITY FULL;

-- Verify realtime is enabled
SELECT 
  schemaname,
  tablename,
  hasindexes,
  hasrules,
  hastriggers
FROM pg_tables 
WHERE tablename = 'meeting_participants';

-- Check if table is in realtime publication
SELECT 
  pubname,
  schemaname,
  tablename
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
AND tablename = 'meeting_participants';
