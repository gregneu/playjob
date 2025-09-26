-- СОЗДАНИЕ ТАБЛИЦЫ BUILDINGS
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Создаем таблицу buildings если её нет
CREATE TABLE IF NOT EXISTS buildings (
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

-- 2. Отключаем RLS для buildings (временно для тестирования)
ALTER TABLE buildings DISABLE ROW LEVEL SECURITY;

-- 3. Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_buildings_project_id ON buildings(project_id);
CREATE INDEX IF NOT EXISTS idx_buildings_coordinates ON buildings(q, r);
CREATE INDEX IF NOT EXISTS idx_buildings_project_coordinates ON buildings(project_id, q, r);

-- 4. Проверяем, что таблица создана
SELECT '=== BUILDINGS TABLE CREATED ===' as info;
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'buildings';

-- 5. Проверяем структуру таблицы
SELECT '=== BUILDINGS TABLE STRUCTURE ===' as info;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'buildings'
ORDER BY ordinal_position;

-- 6. Проверяем внешние ключи
SELECT '=== BUILDINGS FOREIGN KEYS ===' as info;
SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'buildings';
