-- ПРОВЕРКА И ИСПРАВЛЕНИЕ ТАБЛИЦЫ PROJECTS
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Проверяем структуру таблицы projects
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'projects'
ORDER BY ordinal_position;

-- 2. Проверяем ограничения таблицы
SELECT 
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
LEFT JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'projects';

-- 3. Проверяем существующие данные
SELECT COUNT(*) as total_projects FROM projects;
SELECT * FROM projects LIMIT 3;

-- 4. Проверяем RLS статус
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'projects';

-- 5. Проверяем политики
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'projects';
