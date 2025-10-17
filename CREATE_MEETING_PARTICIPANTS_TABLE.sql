-- Create meeting_participants table for realtime meeting participant tracking
CREATE TABLE IF NOT EXISTS meeting_participants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  room_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique active participation per room
  UNIQUE(project_id, room_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_meeting_participants_project_room ON meeting_participants(project_id, room_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_user ON meeting_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_active ON meeting_participants(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE meeting_participants ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view participants in projects they have access to
CREATE POLICY "Users can view meeting participants in accessible projects" ON meeting_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = meeting_participants.project_id
      AND (
        p.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id
          AND pm.user_id = auth.uid()
        )
      )
    )
  );

-- Users can insert their own participation
CREATE POLICY "Users can join meetings" ON meeting_participants
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM projects p
      WHERE p.id = meeting_participants.project_id
      AND (
        p.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id
          AND pm.user_id = auth.uid()
        )
      )
    )
  );

-- Users can update their own participation
CREATE POLICY "Users can update their own participation" ON meeting_participants
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own participation
CREATE POLICY "Users can leave meetings" ON meeting_participants
  FOR DELETE USING (user_id = auth.uid());

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE meeting_participants;

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_meeting_participants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER trigger_update_meeting_participants_updated_at
  BEFORE UPDATE ON meeting_participants
  FOR EACH ROW
  EXECUTE FUNCTION update_meeting_participants_updated_at();
