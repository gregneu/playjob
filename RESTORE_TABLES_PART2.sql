-- ЧАСТЬ 2: СОЗДАНИЕ ТАБЛИЦ
-- Выполните эту часть в SQL Editor Supabase

-- Создаем таблицу проектов
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  user_id UUID NOT NULL,
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