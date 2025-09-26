-- HOTFIX: Prevent null user_id in project_members during project creation trigger
-- Root cause: trigger that inserts into project_members may run without a valid auth.uid()
-- Fix: Ensure NEW.user_id is not null and coalesce from auth.uid(), else abort with message

CREATE OR REPLACE FUNCTION add_project_creator_to_members()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    -- Try to coalesce from auth.uid(); if still null, raise a clear error
    NEW.user_id := COALESCE(NEW.user_id, auth.uid());
    IF NEW.user_id IS NULL THEN
      RAISE EXCEPTION 'Project creator (user_id) is NULL. Ensure you pass user_id when creating a project.';
    END IF;
  END IF;

  INSERT INTO project_members (project_id, user_id, role, status, invited_at, joined_at)
  VALUES (NEW.id, NEW.user_id, 'owner', 'accepted', NOW(), NOW())
  ON CONFLICT (project_id, user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_add_project_creator ON projects;
CREATE TRIGGER trigger_add_project_creator
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION add_project_creator_to_members();
