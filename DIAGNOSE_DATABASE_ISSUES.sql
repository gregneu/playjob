-- Диагностический скрипт для проверки состояния базы данных
-- Выполните этот скрипт в SQL Editor вашего проекта Supabase

-- 1. Проверяем существование таблиц
SELECT 
  table_name,
  CASE 
    WHEN table_name IN ('zones', 'zone_cells', 'hex_cells', 'buildings', 'zone_objects') 
    THEN '✅ СУЩЕСТВУЕТ' 
    ELSE '❌ ОТСУТСТВУЕТ' 
  END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('zones', 'zone_cells', 'hex_cells', 'buildings', 'zone_objects')
ORDER BY table_name;

-- 2. Проверяем структуру таблицы zones
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'zones'
ORDER BY ordinal_position;

-- 3. Проверяем RLS политики для zones
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'zones';

-- 4. Проверяем данные в таблице zones
SELECT 
  id,
  name,
  color,
  project_id,
  created_at,
  updated_at
FROM zones
LIMIT 10;

-- 5. Проверяем структуру таблицы zone_cells
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'zone_cells'
ORDER BY ordinal_position;

-- 6. Проверяем RLS политики для zone_cells
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'zone_cells';

-- 7. Проверяем данные в таблице zone_cells
SELECT 
  id,
  zone_id,
  q,
  r,
  created_at
FROM zone_cells
LIMIT 10;

-- 8. Проверяем структуру таблицы hex_cells
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'hex_cells'
ORDER BY ordinal_position;

-- 9. Проверяем RLS политики для hex_cells
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'hex_cells';

-- 10. Проверяем данные в таблице hex_cells
SELECT 
  id,
  project_id,
  q,
  r,
  state,
  type,
  created_at,
  updated_at
FROM hex_cells
LIMIT 10;

-- 11. Проверяем структуру таблицы buildings
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'buildings'
ORDER BY ordinal_position;

-- 12. Проверяем RLS политики для buildings
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'buildings';

-- 13. Проверяем данные в таблице buildings
SELECT 
  id,
  project_id,
  building_type,
  q,
  r,
  created_at,
  updated_at
FROM buildings
LIMIT 10;

-- 14. Проверяем структуру таблицы zone_objects
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'zone_objects'
ORDER BY ordinal_position;

-- 15. Проверяем RLS политики для zone_objects
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'zone_objects';

-- 16. Проверяем данные в таблице zone_objects
SELECT 
  id,
  zone_id,
  object_type,
  title,
  description,
  status,
  priority,
  story_points,
  q,
  r,
  created_at,
  updated_at
FROM zone_objects
LIMIT 10;

-- 17. Проверяем текущего пользователя и его права
SELECT 
  auth.uid() as current_user_id,
  auth.jwt() as jwt_token;

-- 18. Проверяем все таблицы в схеме public
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 19. Проверяем все RLS политики
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname; 