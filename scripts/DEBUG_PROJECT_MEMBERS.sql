-- ОТЛАДКА УЧАСТНИКОВ ПРОЕКТА
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Проверяем все проекты
SELECT '=== ALL PROJECTS ===' as info;
SELECT 
  id,
  name,
  user_id as creator_id,
  status,
  created_at
FROM projects 
ORDER BY created_at DESC;

-- 2. Проверяем всех участников проектов
SELECT '=== ALL PROJECT MEMBERS ===' as info;
SELECT 
  pm.project_id,
  pm.user_id,
  pm.role,
  pm.status,
  pm.invited_at,
  pm.joined_at,
  p.name as project_name,
  pr.email as user_email,
  pr.full_name as user_full_name
FROM project_members pm
JOIN projects p ON pm.project_id = p.id
JOIN profiles pr ON pm.user_id = pr.id
ORDER BY p.created_at DESC;

-- 3. Проверяем конкретный проект (замените 'your-project-id' на реальный ID)
SELECT '=== SPECIFIC PROJECT MEMBERS ===' as info;
-- Замените 'your-project-id' на реальный ID проекта из первого запроса
SELECT 
  pm.project_id,
  pm.user_id,
  pm.role,
  pm.status,
  pm.invited_at,
  pm.joined_at,
  p.name as project_name,
  pr.email as user_email,
  pr.full_name as user_full_name
FROM project_members pm
JOIN projects p ON pm.project_id = p.id
JOIN profiles pr ON pm.user_id = pr.id
WHERE p.id = 'your-project-id' -- Замените на реальный ID
ORDER BY pm.invited_at DESC;

-- 4. Проверяем профили всех пользователей
SELECT '=== ALL PROFILES ===' as info;
SELECT 
  id,
  email,
  full_name,
  created_at
FROM profiles 
ORDER BY created_at DESC;

-- 5. Проверяем связи между таблицами
SELECT '=== TABLE RELATIONSHIPS ===' as info;
SELECT 
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('project_members', 'projects', 'profiles')
ORDER BY tc.table_name, kcu.column_name;

-- 6. Проверяем RLS статус
SELECT '=== RLS STATUS ===' as info;
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('profiles', 'projects', 'project_members')
ORDER BY tablename;
