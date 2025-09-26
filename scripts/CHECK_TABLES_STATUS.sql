-- ПРОВЕРКА СТАТУСА ВСЕХ ТАБЛИЦ В SUPABASE
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Проверяем существование всех таблиц
SELECT 
  schemaname,
  tablename,
  tableowner,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('profiles', 'project_invitations', 'project_members', 'projects')
ORDER BY tablename;

-- 2. Проверяем структуру profiles
SELECT '=== PROFILES TABLE STRUCTURE ===' as info;
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 3. Проверяем структуру project_invitations
SELECT '=== PROJECT_INVITATIONS TABLE STRUCTURE ===' as info;
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'project_invitations'
ORDER BY ordinal_position;

-- 4. Проверяем структуру project_members
SELECT '=== PROJECT_MEMBERS TABLE STRUCTURE ===' as info;
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'project_members'
ORDER BY ordinal_position;

-- 5. Проверяем RLS политики для profiles
SELECT '=== PROFILES RLS POLICIES ===' as info;
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
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 6. Проверяем RLS политики для project_invitations
SELECT '=== PROJECT_INVITATIONS RLS POLICIES ===' as info;
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
WHERE tablename = 'project_invitations'
ORDER BY policyname;

-- 7. Проверяем RLS политики для project_members
SELECT '=== PROJECT_MEMBERS RLS POLICIES ===' as info;
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
WHERE tablename = 'project_members'
ORDER BY policyname;

-- 8. Проверяем внешние ключи
SELECT '=== FOREIGN KEY CONSTRAINTS ===' as info;
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
  AND tc.table_name IN ('profiles', 'project_invitations', 'project_members')
ORDER BY tc.table_name, kcu.column_name;

-- 9. Проверяем количество записей в таблицах
SELECT '=== RECORD COUNTS ===' as info;
SELECT 'profiles' as table_name, COUNT(*) as record_count FROM profiles
UNION ALL
SELECT 'project_invitations' as table_name, COUNT(*) as record_count FROM project_invitations
UNION ALL
SELECT 'project_members' as table_name, COUNT(*) as record_count FROM project_members
UNION ALL
SELECT 'projects' as table_name, COUNT(*) as record_count FROM projects;
