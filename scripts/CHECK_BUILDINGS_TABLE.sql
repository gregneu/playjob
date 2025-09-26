-- ПРОВЕРКА ТАБЛИЦЫ BUILDINGS И ЕЁ RLS ПОЛИТИК
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Проверяем существование таблицы buildings
SELECT '=== BUILDINGS TABLE EXISTS ===' as info;
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'buildings'
) as buildings_table_exists;

-- 2. Если таблица существует, проверяем её структуру
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'buildings'
  ) THEN
    RAISE NOTICE 'Buildings table exists, checking structure...';
  ELSE
    RAISE NOTICE 'Buildings table does not exist!';
  END IF;
END $$;

-- 3. Проверяем структуру таблицы buildings (если существует)
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

-- 4. Проверяем RLS статус для buildings
SELECT '=== BUILDINGS RLS STATUS ===' as info;
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'buildings';

-- 5. Проверяем RLS политики для buildings
SELECT '=== BUILDINGS RLS POLICIES ===' as info;
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'buildings';

-- 6. Проверяем количество записей в buildings
SELECT '=== BUILDINGS RECORD COUNT ===' as info;
SELECT COUNT(*) as total_buildings FROM buildings;

-- 7. Показываем несколько записей из buildings
SELECT '=== SAMPLE BUILDINGS ===' as info;
SELECT 
  id,
  project_id,
  q,
  r,
  building_type,
  category,
  task_name
FROM buildings 
LIMIT 5;

-- 8. Проверяем связь с проектами
SELECT '=== BUILDINGS PROJECT RELATIONSHIP ===' as info;
SELECT 
  b.project_id,
  p.name as project_name,
  COUNT(b.id) as buildings_count
FROM buildings b
LEFT JOIN projects p ON b.project_id = p.id
GROUP BY b.project_id, p.name
ORDER BY buildings_count DESC;

-- 9. Проверяем, есть ли здания для конкретного проекта
SELECT '=== BUILDINGS BY PROJECT ===' as info;
SELECT 
  p.id as project_id,
  p.name as project_name,
  p.user_id as owner_id,
  COUNT(b.id) as buildings_count
FROM projects p
LEFT JOIN buildings b ON p.id = b.project_id
GROUP BY p.id, p.name, p.user_id
ORDER BY buildings_count DESC;
