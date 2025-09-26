-- SQL скрипты для создания таблиц в Supabase
-- Выполните эти команды в SQL Editor вашего проекта Supabase

-- Таблица зон
CREATE TABLE IF NOT EXISTS zones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(7) NOT NULL, -- HEX цвет
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Таблица ячеек зон
CREATE TABLE IF NOT EXISTS zone_cells (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  q INTEGER NOT NULL, -- гексагональная координата q
  r INTEGER NOT NULL, -- гексагональная координата r
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(zone_id, q, r)
);

-- Таблица гексагональных ячеек
CREATE TABLE IF NOT EXISTS hex_cells (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  q INTEGER NOT NULL, -- гексагональная координата q
  r INTEGER NOT NULL, -- гексагональная координата r
  type VARCHAR(20) NOT NULL DEFAULT 'hidden-slot', -- 'project-center', 'building-slot', 'hidden-slot'
  state VARCHAR(20) NOT NULL DEFAULT 'empty', -- 'empty', 'occupied', 'highlighted', 'hidden'
  building_type VARCHAR(50), -- тип здания
  category VARCHAR(50), -- категория
  task_name VARCHAR(255), -- название задачи
  progress INTEGER DEFAULT 0, -- прогресс 0-100
  priority INTEGER DEFAULT 1, -- приоритет 1-5
  zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, q, r)
);

-- Таблица зданий
CREATE TABLE IF NOT EXISTS buildings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  q INTEGER NOT NULL, -- гексагональная координата q
  r INTEGER NOT NULL, -- гексагональная координата r
  building_type VARCHAR(20) NOT NULL, -- 'house', 'tree', 'factory'
  category VARCHAR(50) NOT NULL,
  task_name VARCHAR(255) NOT NULL,
  progress INTEGER DEFAULT 0, -- прогресс 0-100
  priority INTEGER DEFAULT 1, -- приоритет 1-5
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, q, r)
);

-- Индексы для улучшения производительности
CREATE INDEX IF NOT EXISTS idx_zones_project_id ON zones(project_id);
CREATE INDEX IF NOT EXISTS idx_zone_cells_zone_id ON zone_cells(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_cells_coordinates ON zone_cells(q, r);
CREATE INDEX IF NOT EXISTS idx_hex_cells_project_id ON hex_cells(project_id);
CREATE INDEX IF NOT EXISTS idx_hex_cells_coordinates ON hex_cells(q, r);
CREATE INDEX IF NOT EXISTS idx_hex_cells_state ON hex_cells(state);
CREATE INDEX IF NOT EXISTS idx_buildings_project_id ON buildings(project_id);
CREATE INDEX IF NOT EXISTS idx_buildings_coordinates ON buildings(q, r);

-- RLS (Row Level Security) политики
-- Включение RLS для всех таблиц
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE hex_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;

-- Политики для zones
CREATE POLICY "Users can view zones in their projects" ON zones
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create zones in their projects" ON zones
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update zones in their projects" ON zones
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete zones in their projects" ON zones
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

-- Политики для zone_cells
CREATE POLICY "Users can view zone cells in their projects" ON zone_cells
  FOR SELECT USING (
    zone_id IN (
      SELECT z.id FROM zones z 
      JOIN projects p ON z.project_id = p.id 
      WHERE p.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create zone cells in their projects" ON zone_cells
  FOR INSERT WITH CHECK (
    zone_id IN (
      SELECT z.id FROM zones z 
      JOIN projects p ON z.project_id = p.id 
      WHERE p.created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete zone cells in their projects" ON zone_cells
  FOR DELETE USING (
    zone_id IN (
      SELECT z.id FROM zones z 
      JOIN projects p ON z.project_id = p.id 
      WHERE p.created_by = auth.uid()
    )
  );

-- Политики для hex_cells
CREATE POLICY "Users can view hex cells in their projects" ON hex_cells
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create hex cells in their projects" ON hex_cells
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update hex cells in their projects" ON hex_cells
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

-- Политики для buildings
CREATE POLICY "Users can view buildings in their projects" ON buildings
  FOR SELECT USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can create buildings in their projects" ON buildings
  FOR INSERT WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can update buildings in their projects" ON buildings
  FOR UPDATE USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

CREATE POLICY "Users can delete buildings in their projects" ON buildings
  FOR DELETE USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

-- Функция для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Триггеры для автоматического обновления updated_at
CREATE TRIGGER update_zones_updated_at BEFORE UPDATE ON zones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_hex_cells_updated_at BEFORE UPDATE ON hex_cells
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_buildings_updated_at BEFORE UPDATE ON buildings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Таблица связей между объектами зон
CREATE TABLE IF NOT EXISTS zone_object_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_object_id UUID NOT NULL REFERENCES zone_objects(id) ON DELETE CASCADE,
  to_object_id UUID NOT NULL REFERENCES zone_objects(id) ON DELETE CASCADE,
  link_type VARCHAR(20) DEFAULT 'primary' CHECK (link_type IN ('primary', 'secondary')),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
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

CREATE TRIGGER update_zone_object_links_updated_at BEFORE UPDATE ON zone_object_links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 

-- Таблица тикетов для объектов зон
CREATE TABLE IF NOT EXISTS object_tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_object_id UUID NOT NULL REFERENCES zone_objects(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('story','task','bug','test')),
  title TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','done')),
  priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('v-low','low','medium','high','veryhigh')),
  assignee_id UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_object_tickets_zone_object_id ON object_tickets(zone_object_id);

ALTER TABLE object_tickets ENABLE ROW LEVEL SECURITY;

-- Политики RLS для object_tickets (привязка через зоны -> проекты.user_id)
CREATE POLICY IF NOT EXISTS "tickets_select" ON object_tickets
  FOR SELECT USING (
    zone_object_id IN (
      SELECT o.id
      FROM zone_objects o
      JOIN zones z ON z.id = o.zone_id
      JOIN projects p ON p.id = z.project_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "tickets_insert" ON object_tickets
  FOR INSERT WITH CHECK (
    zone_object_id IN (
      SELECT o.id
      FROM zone_objects o
      JOIN zones z ON z.id = o.zone_id
      JOIN projects p ON p.id = z.project_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "tickets_update" ON object_tickets
  FOR UPDATE USING (
    zone_object_id IN (
      SELECT o.id
      FROM zone_objects o
      JOIN zones z ON z.id = o.zone_id
      JOIN projects p ON p.id = z.project_id
      WHERE p.user_id = auth.uid()
    )
  );

CREATE POLICY IF NOT EXISTS "tickets_delete" ON object_tickets
  FOR DELETE USING (
    zone_object_id IN (
      SELECT o.id
      FROM zone_objects o
      JOIN zones z ON z.id = o.zone_id
      JOIN projects p ON p.id = z.project_id
      WHERE p.user_id = auth.uid()
    )
  );