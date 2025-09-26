-- Проверка существования и структуры таблицы zone_objects
-- Выполните этот скрипт в SQL Editor вашего проекта Supabase

-- 1. Проверяем, существует ли таблица zone_objects
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'zone_objects';

-- 2. Если таблица существует, проверяем её структуру
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns 
WHERE table_name = 'zone_objects' 
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Проверяем ограничения (constraints) для таблицы
SELECT 
  constraint_name,
  constraint_type,
  check_clause
FROM information_schema.check_constraints 
WHERE constraint_schema = 'public'
  AND constraint_name LIKE '%zone_objects%';

-- 4. Проверяем индексы для таблицы
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'zone_objects'
  AND schemaname = 'public';

-- 5. Проверяем, есть ли данные в таблице
SELECT 
  COUNT(*) as total_objects,
  COUNT(CASE WHEN status IS NOT NULL THEN 1 END) as objects_with_status,
  COUNT(CASE WHEN priority IS NOT NULL THEN 1 END) as objects_with_priority,
  COUNT(CASE WHEN status IS NOT NULL AND priority IS NOT NULL THEN 1 END) as objects_with_both
FROM zone_objects;

-- 6. Показываем последние 5 объектов (если есть)
SELECT 
  id,
  title,
  object_type,
  status,
  priority,
  story_points,
  created_at
FROM zone_objects 
ORDER BY created_at DESC 
LIMIT 5; 