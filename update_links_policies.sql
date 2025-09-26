-- Обновление RLS политик для таблицы zone_object_links
-- Выполните эти команды в SQL Editor вашего проекта Supabase

-- Удаляем старые политики
DROP POLICY IF EXISTS "links_select" ON zone_object_links;
DROP POLICY IF EXISTS "links_insert" ON zone_object_links;
DROP POLICY IF EXISTS "links_delete" ON zone_object_links;

-- Создаем новые политики с правильной логикой
CREATE POLICY "links_select" ON zone_object_links
  FOR SELECT USING (
    from_object_id IN (
      SELECT o.id
      FROM zone_objects o
      JOIN zones z ON z.id = o.zone_id
      JOIN projects p ON p.id = z.project_id
      WHERE p.user_id = auth.uid()
    )
    OR
    to_object_id IN (
      SELECT o.id
      FROM zone_objects o
      JOIN zones z ON z.id = o.zone_id
      JOIN projects p ON p.id = z.project_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "links_insert" ON zone_object_links
  FOR INSERT WITH CHECK (
    from_object_id IN (
      SELECT o.id
      FROM zone_objects o
      JOIN zones z ON z.id = o.zone_id
      JOIN projects p ON p.id = z.project_id
      WHERE p.user_id = auth.uid()
    )
    AND
    to_object_id IN (
      SELECT o.id
      FROM zone_objects o
      JOIN zones z ON z.id = o.zone_id
      JOIN projects p ON p.id = z.project_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY "links_delete" ON zone_object_links
  FOR DELETE USING (
    from_object_id IN (
      SELECT o.id
      FROM zone_objects o
      JOIN zones z ON z.id = o.zone_id
      JOIN projects p ON p.id = z.project_id
      WHERE p.user_id = auth.uid()
    )
    OR
    to_object_id IN (
      SELECT o.id
      FROM zone_objects o
      JOIN zones z ON z.id = o.zone_id
      JOIN projects p ON p.id = z.project_id
      WHERE p.user_id = auth.uid()
    )
  );
