-- Cleanup script for meeting_participants table
-- This script removes stale/old participant records

-- 1. Remove all inactive participants older than 1 hour
DELETE FROM meeting_participants 
WHERE is_active = false 
AND left_at IS NOT NULL
AND left_at < NOW() - INTERVAL '1 hour';

-- 2. Remove all active participants older than 24 hours (likely forgotten records)
DELETE FROM meeting_participants 
WHERE is_active = true 
AND joined_at IS NOT NULL
AND joined_at < NOW() - INTERVAL '24 hours';

-- 3. Remove participants without proper timestamps (data integrity)
DELETE FROM meeting_participants 
WHERE is_active = true 
AND joined_at IS NULL;

-- 4. Check remaining records
SELECT 
  id,
  project_id,
  room_id,
  user_id,
  is_active,
  joined_at,
  left_at,
  created_at
FROM meeting_participants 
ORDER BY created_at DESC;

-- 5. Count by status
SELECT 
  is_active,
  COUNT(*) as count
FROM meeting_participants 
GROUP BY is_active;
