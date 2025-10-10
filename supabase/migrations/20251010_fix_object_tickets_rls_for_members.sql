-- FIX: Allow project MEMBERS (not just owner) to access tickets
-- This is THE ROOT CAUSE why realtime doesn't work between users!

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "tickets_select" ON object_tickets;
DROP POLICY IF EXISTS "tickets_insert" ON object_tickets;
DROP POLICY IF EXISTS "tickets_update" ON object_tickets;
DROP POLICY IF EXISTS "tickets_delete" ON object_tickets;
DROP POLICY IF EXISTS "object_tickets_select" ON object_tickets;
DROP POLICY IF EXISTS "object_tickets_insert" ON object_tickets;
DROP POLICY IF EXISTS "object_tickets_update" ON object_tickets;
DROP POLICY IF EXISTS "object_tickets_delete" ON object_tickets;

-- ============================================
-- NEW POLICIES: Allow access for PROJECT MEMBERS
-- ============================================

-- SELECT: Allow if user is project owner OR member
CREATE POLICY "object_tickets_select" ON object_tickets
  FOR SELECT USING (
    zone_object_id IN (
      SELECT o.id
      FROM zone_objects o
      JOIN zones z ON z.id = o.zone_id
      JOIN projects p ON p.id = z.project_id
      WHERE 
        -- Owner can see
        p.user_id = auth.uid()
        OR
        -- Members can see
        EXISTS (
          SELECT 1 FROM project_memberships pm
          WHERE pm.project_id = p.id
            AND pm.user_id = auth.uid()
        )
    )
  );

-- INSERT: Allow if user is project owner OR member
CREATE POLICY "object_tickets_insert" ON object_tickets
  FOR INSERT WITH CHECK (
    zone_object_id IN (
      SELECT o.id
      FROM zone_objects o
      JOIN zones z ON z.id = o.zone_id
      JOIN projects p ON p.id = z.project_id
      WHERE 
        p.user_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM project_memberships pm
          WHERE pm.project_id = p.id
            AND pm.user_id = auth.uid()
        )
    )
  );

-- UPDATE: Allow if user is project owner OR member
CREATE POLICY "object_tickets_update" ON object_tickets
  FOR UPDATE USING (
    zone_object_id IN (
      SELECT o.id
      FROM zone_objects o
      JOIN zones z ON z.id = o.zone_id
      JOIN projects p ON p.id = z.project_id
      WHERE 
        p.user_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM project_memberships pm
          WHERE pm.project_id = p.id
            AND pm.user_id = auth.uid()
        )
    )
  )
  WITH CHECK (
    -- Also check the NEW zone_object_id when moving tickets
    zone_object_id IN (
      SELECT o.id
      FROM zone_objects o
      JOIN zones z ON z.id = o.zone_id
      JOIN projects p ON p.id = z.project_id
      WHERE 
        p.user_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM project_memberships pm
          WHERE pm.project_id = p.id
            AND pm.user_id = auth.uid()
        )
    )
  );

-- DELETE: Allow if user is project owner OR member
CREATE POLICY "object_tickets_delete" ON object_tickets
  FOR DELETE USING (
    zone_object_id IN (
      SELECT o.id
      FROM zone_objects o
      JOIN zones z ON z.id = o.zone_id
      JOIN projects p ON p.id = z.project_id
      WHERE 
        p.user_id = auth.uid()
        OR
        EXISTS (
          SELECT 1 FROM project_memberships pm
          WHERE pm.project_id = p.id
            AND pm.user_id = auth.uid()
        )
    )
  );

-- Verify policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd as operation,
  CASE cmd
    WHEN 'SELECT' THEN '✅ Users can READ tickets'
    WHEN 'INSERT' THEN '✅ Users can CREATE tickets'
    WHEN 'UPDATE' THEN '✅ Users can EDIT/MOVE tickets'
    WHEN 'DELETE' THEN '✅ Users can DELETE tickets'
  END as description
FROM pg_policies 
WHERE tablename = 'object_tickets'
ORDER BY cmd;

