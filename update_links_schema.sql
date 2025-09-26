-- Обновление схемы таблицы zone_object_links
-- Добавляем поле project_id

-- Сначала удаляем старые политики
DROP POLICY IF EXISTS "links_select" ON zone_object_links;
DROP POLICY IF EXISTS "links_insert" ON zone_object_links;
DROP POLICY IF EXISTS "links_delete" ON zone_object_links;

-- Добавляем поле project_id если его нет
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'zone_object_links' AND column_name = 'project_id') THEN
        ALTER TABLE zone_object_links ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Делаем project_id NOT NULL
ALTER TABLE zone_object_links ALTER COLUMN project_id SET NOT NULL;

-- Создаем новые политики RLS
CREATE POLICY IF NOT EXISTS "links_select" ON zone_object_links
  FOR SELECT USING (
    project_id IN (
      SELECT p.id
      FROM projects p
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "links_insert" ON zone_object_links
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT p.id
      FROM projects p
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "links_delete" ON zone_object_links
  FOR DELETE USING (
    project_id IN (
      SELECT p.id
      FROM projects p
      WHERE p.user_id = auth.uid()
    )
  );
