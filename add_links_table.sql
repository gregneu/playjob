-- SQL скрипт для добавления таблицы связей между объектами зон
-- Выполните эти команды в SQL Editor вашего проекта Supabase

-- Таблица связей между объектами зон
CREATE TABLE IF NOT EXISTS zone_object_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_object_id UUID NOT NULL REFERENCES zone_objects(id) ON DELETE CASCADE,
  to_object_id UUID NOT NULL REFERENCES zone_objects(id) ON DELETE CASCADE,
  link_type VARCHAR(20) DEFAULT 'primary' CHECK (link_type IN ('primary', 'secondary')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(from_object_id, to_object_id)
);

CREATE INDEX IF NOT EXISTS idx_zone_object_links_from ON zone_object_links(from_object_id);
CREATE INDEX IF NOT EXISTS idx_zone_object_links_to ON zone_object_links(to_object_id);

ALTER TABLE zone_object_links ENABLE ROW LEVEL SECURITY;

-- Политики RLS для zone_object_links
CREATE POLICY IF NOT EXISTS "links_select" ON zone_object_links
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

CREATE POLICY IF NOT EXISTS "links_insert" ON zone_object_links
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

CREATE POLICY IF NOT EXISTS "links_delete" ON zone_object_links
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

CREATE TRIGGER update_zone_object_links_updated_at BEFORE UPDATE ON zone_object_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
