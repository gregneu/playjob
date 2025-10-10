-- Enable realtime for object_tickets table
-- Run this in Supabase SQL Editor

-- Use DO block to handle errors gracefully
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

-- Verify it was added
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'
  AND tablename = 'object_tickets';

