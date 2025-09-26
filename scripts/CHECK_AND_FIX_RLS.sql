-- ПРОВЕРКА И ИСПРАВЛЕНИЕ RLS ПОЛИТИК
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Проверяем текущий статус RLS
SELECT '=== CURRENT RLS STATUS ===' as info;
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('profiles', 'projects', 'project_members', 'project_invitations')
ORDER BY tablename;

-- 2. Отключаем RLS для всех таблиц
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_invitations DISABLE ROW LEVEL SECURITY;

-- 3. Удаляем все существующие RLS политики
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

DROP POLICY IF EXISTS "Project owners and admins can manage invitations" ON project_invitations;
DROP POLICY IF EXISTS "Users can view their own invitations" ON project_invitations;

-- 4. Проверяем результат отключения RLS
SELECT '=== RLS STATUS AFTER DISABLING ===' as info;
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('profiles', 'projects', 'project_members', 'project_invitations')
ORDER BY tablename;

-- 5. Проверяем, что таблицы доступны для чтения
SELECT '=== TESTING TABLE ACCESS ===' as info;

-- Тест profiles
SELECT 'profiles' as table_name, COUNT(*) as record_count FROM profiles
UNION ALL
-- Тест project_members  
SELECT 'project_members' as table_name, COUNT(*) as record_count FROM project_members
UNION ALL
-- Тест projects
SELECT 'projects' as table_name, COUNT(*) as record_count FROM projects
UNION ALL
-- Тест project_invitations
SELECT 'project_invitations' as table_name, COUNT(*) as record_count FROM project_invitations;

-- 6. Показываем несколько записей из каждой таблицы
SELECT '=== SAMPLE PROFILES ===' as info;
SELECT id, email, full_name FROM profiles LIMIT 3;

SELECT '=== SAMPLE PROJECT MEMBERS ===' as info;
SELECT project_id, user_id, role, status FROM project_members LIMIT 3;

SELECT '=== SAMPLE PROJECTS ===' as info;
SELECT id, name, user_id, status FROM projects LIMIT 3;
