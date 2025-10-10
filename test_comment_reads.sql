-- Test script to check if comment_reads table exists and works
-- Run this in Supabase SQL Editor

-- Check if table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'comment_reads';

-- Check table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'comment_reads' 
ORDER BY ordinal_position;

-- Test insert (this should work if table exists and RLS is configured)
INSERT INTO comment_reads (ticket_id, comment_id, user_id) 
VALUES ('00000000-0000-0000-0000-000000000000', 'test-comment', '00000000-0000-0000-0000-000000000000')
ON CONFLICT DO NOTHING;

-- Clean up test data
DELETE FROM comment_reads 
WHERE ticket_id = '00000000-0000-0000-0000-000000000000' 
  AND comment_id = 'test-comment';
