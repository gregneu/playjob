-- Add Jitsi room ID column to zone_objects table
-- Execute this script in SQL Editor of your Supabase project

-- Add the jitsi_room_id column to store unique room identifiers for "meet" buildings
ALTER TABLE zone_objects ADD COLUMN IF NOT EXISTS jitsi_room_id VARCHAR(255);

-- Create index for better performance when querying by room ID
CREATE INDEX IF NOT EXISTS idx_zone_objects_jitsi_room ON zone_objects(jitsi_room_id);

-- Verify the column was added
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'zone_objects' 
  AND column_name = 'jitsi_room_id';
