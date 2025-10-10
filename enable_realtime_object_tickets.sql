-- Enable realtime for object_tickets table
-- Run this in Supabase SQL Editor

-- Add object_tickets to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS object_tickets;

-- Verify it was added
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
  AND tablename = 'object_tickets';

