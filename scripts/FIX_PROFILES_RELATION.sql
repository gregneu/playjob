-- Ensure relationship between project_members.user_id and profiles.id exists
-- Run this in Supabase SQL editor

-- 1) Create profiles table if missing (safe-guard)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2) Ensure FK on project_members.user_id -> profiles.id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'project_members_user_id_profiles_fkey'
  ) THEN
    ALTER TABLE project_members
      ADD CONSTRAINT project_members_user_id_profiles_fkey
      FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 3) Enable RLS and policies to allow users to read profiles of project members
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view profiles in their projects" ON profiles;
CREATE POLICY "Members can view profiles in their projects" ON profiles
  FOR SELECT USING (
    id IN (
      SELECT user_id FROM project_members pm
      WHERE pm.project_id IN (
        SELECT project_id FROM project_members WHERE user_id = auth.uid()
      )
    )
  );

-- 4) Optional: create helpful indexes
CREATE INDEX IF NOT EXISTS idx_profiles_id ON profiles(id);
CREATE INDEX IF NOT EXISTS idx_project_members_project_user ON project_members(project_id, user_id);

-- 5) Show status
SELECT 'Profiles relation fix applied' AS status;


