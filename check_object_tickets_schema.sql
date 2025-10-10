-- Check the actual schema of object_tickets table

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  CASE 
    WHEN column_name = 'project_id' THEN '⚠️ project_id EXISTS (not in original schema!)'
    ELSE '✅'
  END as note
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'object_tickets'
ORDER BY ordinal_position;

