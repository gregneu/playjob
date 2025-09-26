-- Тестирование системы совместной работы над проектами
-- Запустите ПОСЛЕ выполнения основного скрипта настройки

-- 1. Проверяем созданные таблицы
SELECT '=== СОЗДАННЫЕ ТАБЛИЦЫ ===' as info;
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_name IN ('project_members', 'project_invitations')
ORDER BY table_name;

-- 2. Проверяем структуру project_members
SELECT '=== СТРУКТУРА PROJECT_MEMBERS ===' as info;
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'project_members'
ORDER BY ordinal_position;

-- 3. Проверяем структуру project_invitations
SELECT '=== СТРУКТУРА PROJECT_INVITATIONS ===' as info;
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'project_invitations'
ORDER BY ordinal_position;

-- 4. Проверяем RLS политики
SELECT '=== RLS ПОЛИТИКИ ===' as info;
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('project_members', 'project_invitations')
ORDER BY tablename, policyname;

-- 5. Проверяем индексы
SELECT '=== ИНДЕКСЫ ===' as info;
SELECT 
  indexname,
  tablename,
  indexdef
FROM pg_indexes 
WHERE tablename IN ('project_members', 'project_invitations')
ORDER BY tablename, indexname;

-- 6. Проверяем существующих владельцев проектов
SELECT '=== ВЛАДЕЛЬЦЫ ПРОЕКТОВ ===' as info;
SELECT 
  p.id as project_id,
  p.name as project_name,
  p.owner_id,
  p.created_at
FROM projects p
WHERE p.owner_id IS NOT NULL
LIMIT 5;

-- 7. Проверяем участников проектов
SELECT '=== УЧАСТНИКИ ПРОЕКТОВ ===' as info;
SELECT 
  pm.project_id,
  p.name as project_name,
  pm.user_id,
  pm.role,
  pm.status,
  pm.joined_at
FROM project_members pm
JOIN projects p ON pm.project_id = p.id
ORDER BY pm.project_id, pm.role
LIMIT 10;

-- 8. Проверяем функцию add_project_owner
SELECT '=== ФУНКЦИЯ ADD_PROJECT_OWNER ===' as info;
SELECT 
  proname,
  prosrc
FROM pg_proc 
WHERE proname = 'add_project_owner';

-- 9. Проверяем триггер
SELECT '=== ТРИГГЕР ===' as info;
SELECT 
  trigger_name,
  event_manipulation,
  action_statement
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_add_project_owner';
