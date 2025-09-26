-- ТЕСТИРОВАНИЕ СИСТЕМЫ ПРИГЛАШЕНИЙ В SUPABASE
-- Выполните этот скрипт в SQL Editor Supabase

-- 1. Проверяем текущее состояние всех таблиц
SELECT '=== CURRENT TABLE STATUS ===' as info;
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('profiles', 'project_invitations', 'project_members', 'projects')
ORDER BY tablename;

-- 2. Проверяем количество записей в каждой таблице
SELECT '=== RECORD COUNTS ===' as info;
SELECT 'profiles' as table_name, COUNT(*) as record_count FROM profiles
UNION ALL
SELECT 'project_invitations' as table_name, COUNT(*) as record_count FROM project_invitations
UNION ALL
SELECT 'project_members' as table_name, COUNT(*) as record_count FROM project_members
UNION ALL
SELECT 'projects' as table_name, COUNT(*) as record_count FROM projects;

-- 3. Показываем всех пользователей в profiles
SELECT '=== ALL PROFILES ===' as info;
SELECT id, email, full_name, created_at FROM profiles ORDER BY created_at DESC;

-- 4. Показываем все проекты
SELECT '=== ALL PROJECTS ===' as info;
SELECT id, name, user_id, status, created_at FROM projects ORDER BY created_at DESC;

-- 5. Показываем всех участников проектов
SELECT '=== ALL PROJECT MEMBERS ===' as info;
SELECT 
  pm.project_id,
  pm.user_id,
  pm.role,
  pm.status,
  pm.invited_at,
  pm.joined_at,
  p.name as project_name,
  pr.email as user_email
FROM project_members pm
LEFT JOIN projects p ON pm.project_id = p.id
LEFT JOIN profiles pr ON pm.user_id = pr.id
ORDER BY pm.created_at DESC;

-- 6. Показываем все приглашения
SELECT '=== ALL PROJECT INVITATIONS ===' as info;
SELECT 
  pi.project_id,
  pi.email,
  pi.role,
  pi.status,
  pi.invited_at,
  pi.expires_at,
  p.name as project_name
FROM project_invitations pi
LEFT JOIN projects p ON pi.project_id = p.id
ORDER BY pi.invited_at DESC;

-- 7. Проверяем связи между таблицами
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
  AND tc.table_name IN ('profiles', 'project_invitations', 'project_members')
ORDER BY tc.table_name, kcu.column_name;

-- 8. Тестируем запрос для загрузки проектов участника
SELECT '=== TEST: PROJECTS FOR USER ===' as info;
-- Замените 'your-user-id' на реальный UUID пользователя
SELECT 
  pm.project_id,
  pm.role,
  pm.status,
  p.name as project_name,
  p.description,
  p.color,
  p.icon,
  p.created_at,
  p.updated_at
FROM project_members pm
JOIN projects p ON pm.project_id = p.id
WHERE pm.user_id = 'your-user-id' -- Замените на реальный UUID
  AND pm.status = 'accepted'
ORDER BY p.updated_at DESC;
