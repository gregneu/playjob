-- ДИАГНОСТИКА СИСТЕМЫ ПРОЕКТОВ И ПОЛЬЗОВАТЕЛЕЙ
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Проверяем текущего пользователя
SELECT '=== CURRENT USER ===' as info;
SELECT 
  id,
  email,
  raw_user_meta_data
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 5;

-- 2. Проверяем таблицу profiles
SELECT '=== PROFILES TABLE ===' as info;
SELECT 
  id,
  email,
  full_name,
  created_at
FROM profiles 
ORDER BY created_at DESC;

-- 3. Проверяем таблицу projects
SELECT '=== PROJECTS TABLE ===' as info;
SELECT 
  id,
  name,
  user_id,
  status,
  created_at
FROM projects 
ORDER BY created_at DESC;

-- 4. Проверяем таблицу project_members
SELECT '=== PROJECT_MEMBERS TABLE ===' as info;
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
LEFT JOIN projects p ON pm.project_id = p.id
LEFT JOIN profiles pr ON pm.user_id = pr.id
ORDER BY pm.created_at DESC;

-- 5. Проверяем связи между проектами и создателями
SELECT '=== PROJECTS WITH CREATORS ===' as info;
SELECT 
  p.id as project_id,
  p.name as project_name,
  p.user_id as creator_id,
  pr.email as creator_email,
  pr.full_name as creator_name,
  CASE 
    WHEN pm.user_id IS NOT NULL THEN 'YES - в project_members'
    ELSE 'NO - НЕ в project_members'
  END as is_in_project_members
FROM projects p
LEFT JOIN profiles pr ON p.user_id = pr.id
LEFT JOIN project_members pm ON p.id = pm.project_id AND p.user_id = pm.user_id
ORDER BY p.created_at DESC;

-- 6. Проверяем RLS статус всех таблиц
SELECT '=== RLS STATUS ===' as info;
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('profiles', 'projects', 'project_members', 'project_invitations')
ORDER BY tablename;
