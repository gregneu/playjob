-- ВОССТАНОВЛЕНИЕ ВСЕХ ТАБЛИЦ В SUPABASE
-- Выполните эти команды в SQL Editor Supabase

-- Удаляем старые таблицы (если есть)
DROP TABLE IF EXISTS buildings CASCADE;
DROP TABLE IF EXISTS zone_cells CASCADE;
DROP TABLE IF EXISTS hex_cells CASCADE;
DROP TABLE IF EXISTS zones CASCADE;
DROP TABLE IF EXISTS projects CASCADE;

-- Создаем таблицу проектов
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  user_id UUID NOT NULL, -- Привязка к пользователю
  status VARCHAR(20) DEFAULT 'active',
  color VARCHAR(7) DEFAULT '#3B82F6',
  icon VARCHAR(10) DEFAULT '🎯',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем таблицу зон
CREATE TABLE zones (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  color VARCHAR(7) NOT NULL,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем таблицу ячеек зон
CREATE TABLE zone_cells (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  q INTEGER NOT NULL,
  r INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(zone_id, q, r)
);

-- Создаем таблицу гексагональных ячеек
CREATE TABLE hex_cells (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  q INTEGER NOT NULL,
  r INTEGER NOT NULL,
  type VARCHAR(20) DEFAULT 'hidden-slot',
  state VARCHAR(20) DEFAULT 'empty',
  building_type VARCHAR(50),
  category VARCHAR(50),
  task_name VARCHAR(255),
  progress INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 1,
  zone_id UUID REFERENCES zones(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, q, r)
);

-- Создаем таблицу зданий
CREATE TABLE buildings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  q INTEGER NOT NULL,
  r INTEGER NOT NULL,
  building_type VARCHAR(20) NOT NULL,
  category VARCHAR(50) NOT NULL,
  task_name VARCHAR(255) NOT NULL,
  progress INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, q, r)
);

-- Создаем индексы для производительности
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_zones_project_id ON zones(project_id);
CREATE INDEX idx_zone_cells_zone_id ON zone_cells(zone_id);
CREATE INDEX idx_hex_cells_project_id ON hex_cells(project_id);
CREATE INDEX idx_buildings_project_id ON buildings(project_id);

-- Отключаем RLS для всех таблиц
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE zones DISABLE ROW LEVEL SECURITY;
ALTER TABLE zone_cells DISABLE ROW LEVEL SECURITY;
ALTER TABLE hex_cells DISABLE ROW LEVEL SECURITY;
ALTER TABLE buildings DISABLE ROW LEVEL SECURITY;

-- Создаем тестовый проект для текущего пользователя
INSERT INTO projects (
  id,
  name,
  description,
  user_id,
  status,
  color,
  icon,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'PlayJob 3D Game',
  'Разработка 3D игры в стиле PlayJob с гексагональной картой',
  '520a6177-9457-4657-86f9-e7fa3737ce5d', -- ID пользователя из логов
  'active',
  '#3B82F6',
  '🎮',
  NOW(),
  NOW()
);

-- Проверяем созданные таблицы
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('projects', 'zones', 'zone_cells', 'hex_cells', 'buildings')
ORDER BY table_name;

-- Проверяем созданный проект
SELECT id, name, user_id FROM projects; 

-- Восстановление RLS политик для всех таблиц
-- Выполните этот скрипт в SQL Editor вашего проекта Supabase

-- Включаем RLS для всех таблиц
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE hex_cells ENABLE ROW LEVEL SECURITY;
ALTER TABLE buildings ENABLE ROW LEVEL SECURITY;

-- Удаляем старые политики (если есть)
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can create their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;

DROP POLICY IF EXISTS "Users can view zones in their projects" ON zones;
DROP POLICY IF EXISTS "Users can create zones in their projects" ON zones;
DROP POLICY IF EXISTS "Users can update zones in their projects" ON zones;
DROP POLICY IF EXISTS "Users can delete zones in their projects" ON zones;

DROP POLICY IF EXISTS "Users can view zone cells in their projects" ON zone_cells;
DROP POLICY IF EXISTS "Users can create zone cells in their projects" ON zone_cells;
DROP POLICY IF EXISTS "Users can delete zone cells in their projects" ON zone_cells;

DROP POLICY IF EXISTS "Users can view hex cells in their projects" ON hex_cells;
DROP POLICY IF EXISTS "Users can create hex cells in their projects" ON hex_cells;
DROP POLICY IF EXISTS "Users can update hex cells in their projects" ON hex_cells;

DROP POLICY IF EXISTS "Users can view buildings in their projects" ON buildings;
DROP POLICY IF EXISTS "Users can create buildings in their projects" ON buildings;
DROP POLICY IF EXISTS "Users can update buildings in their projects" ON buildings;
DROP POLICY IF EXISTS "Users can delete buildings in their projects" ON buildings;

-- Создаем новые, простые политики для всех таблиц
-- Политики для projects
CREATE POLICY "Enable read access for all users" ON projects
  FOR SELECT USING (true);

CREATE POLICY "Enable insert for all users" ON projects
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update for all users" ON projects
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete for all users" ON projects
  FOR DELETE USING (true);

-- Политики для zones
CREATE POLICY "Enable read access for all users" ON zones
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON zones
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON zones
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON zones
  FOR DELETE USING (true);

-- Политики для zone_cells
CREATE POLICY "Enable read access for all users" ON zone_cells
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON zone_cells
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable delete access for all users" ON zone_cells
  FOR DELETE USING (true);

-- Политики для hex_cells
CREATE POLICY "Enable read access for all users" ON hex_cells
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON hex_cells
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON hex_cells
  FOR UPDATE USING (true);

-- Политики для buildings
CREATE POLICY "Enable read access for all users" ON buildings
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON buildings
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON buildings
  FOR UPDATE USING (true);

CREATE POLICY "Enable delete access for all users" ON buildings
  FOR DELETE USING (true);

-- Проверяем статус RLS
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('projects', 'zones', 'zone_cells', 'hex_cells', 'buildings')
ORDER BY tablename;

-- Проверяем политики
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('projects', 'zones', 'zone_cells', 'hex_cells', 'buildings')
ORDER BY tablename, policyname; 