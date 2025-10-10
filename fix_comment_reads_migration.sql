-- Idempotent migration for comment_reads table
-- This script can be run multiple times safely

-- Create table if not exists
CREATE TABLE IF NOT EXISTS comment_reads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES object_tickets(id) ON DELETE CASCADE,
  comment_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(ticket_id, comment_id, user_id)
);

-- Create indexes if not exist
CREATE INDEX IF NOT EXISTS idx_comment_reads_ticket ON comment_reads(ticket_id);
CREATE INDEX IF NOT EXISTS idx_comment_reads_user ON comment_reads(user_id);
CREATE INDEX IF NOT EXISTS idx_comment_reads_ticket_user ON comment_reads(ticket_id, user_id);

-- Enable RLS
ALTER TABLE comment_reads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist, then recreate them
DROP POLICY IF EXISTS "Users can view their own comment reads" ON comment_reads;
CREATE POLICY "Users can view their own comment reads" ON comment_reads
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can mark comments as read" ON comment_reads;
CREATE POLICY "Users can mark comments as read" ON comment_reads
  FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own read markers" ON comment_reads;
CREATE POLICY "Users can update their own read markers" ON comment_reads
  FOR UPDATE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete their own read markers" ON comment_reads;
CREATE POLICY "Users can delete their own read markers" ON comment_reads
  FOR DELETE USING (user_id = auth.uid());

-- Verify table exists
SELECT 'comment_reads table exists' AS status, 
       COUNT(*) AS row_count 
FROM comment_reads;

-- Verify policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'comment_reads';

