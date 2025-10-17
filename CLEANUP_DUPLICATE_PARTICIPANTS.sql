-- Clean up duplicate meeting participants
-- This script removes duplicate entries and keeps only the most recent one

-- First, let's see what duplicates we have
SELECT 
  project_id, 
  room_id, 
  user_id, 
  COUNT(*) as count,
  array_agg(id) as ids,
  array_agg(created_at) as created_dates
FROM meeting_participants 
GROUP BY project_id, room_id, user_id 
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Delete duplicates, keeping only the most recent one
WITH duplicates AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (
      PARTITION BY project_id, room_id, user_id 
      ORDER BY created_at DESC
    ) as rn
  FROM meeting_participants
)
DELETE FROM meeting_participants 
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);

-- Verify cleanup
SELECT 
  project_id, 
  room_id, 
  user_id, 
  COUNT(*) as count
FROM meeting_participants 
GROUP BY project_id, room_id, user_id 
HAVING COUNT(*) > 1;
