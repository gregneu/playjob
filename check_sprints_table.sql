-- Проверка существования таблицы sprints и её структуры
-- Выполните этот скрипт в SQL Editor Supabase

-- 1. Проверяем, существует ли таблица sprints
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'sprints';

-- 2. Если таблица существует, проверяем её структуру
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'sprints'
ORDER BY ordinal_position;

-- 3. Проверяем, есть ли данные в таблице sprints
SELECT COUNT(*) as sprint_count FROM sprints;

-- 4. Показываем все спринты (если есть)
SELECT id, project_id, zone_object_id, name, status, created_at 
FROM sprints 
ORDER BY created_at DESC 
LIMIT 10;

-- 5. Проверяем RLS политики для таблицы sprints
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'sprints';
