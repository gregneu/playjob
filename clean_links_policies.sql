-- Очистка всех RLS политик для таблицы zone_object_links
-- Выполните эти команды в SQL Editor вашего проекта Supabase

-- Удаляем все существующие политики
DROP POLICY IF EXISTS "links_select" ON zone_object_links;
DROP POLICY IF EXISTS "links_insert" ON zone_object_links;
DROP POLICY IF EXISTS "links_delete" ON zone_object_links;
DROP POLICY IF EXISTS "select_links" ON zone_object_links;
DROP POLICY IF EXISTS "ins_links" ON zone_object_links;
DROP POLICY IF EXISTS "del_links" ON zone_object_links;
DROP POLICY IF EXISTS "upd_links" ON zone_object_links;

-- Создаем новые правильные политики
CREATE POLICY "links_select" ON zone_object_links
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "links_insert" ON zone_object_links
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "links_delete" ON zone_object_links
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "links_update" ON zone_object_links
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE user_id = auth.uid()
    )
  );
