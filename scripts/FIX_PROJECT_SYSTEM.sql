-- ИСПРАВЛЕНИЕ СИСТЕМЫ ПРОЕКТОВ И ПОЛЬЗОВАТЕЛЕЙ
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Временно отключаем RLS для всех таблиц
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_invitations DISABLE ROW LEVEL SECURITY;

-- 2. Создаем профили для всех существующих пользователей
INSERT INTO profiles (id, email, full_name, created_at, updated_at)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', au.email),
  au.created_at,
  NOW()
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM profiles p WHERE p.id = au.id
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = NOW();

-- 3. Добавляем создателей проектов в project_members
INSERT INTO project_members (project_id, user_id, role, status, invited_at, joined_at)
SELECT 
  p.id as project_id,
  p.user_id,
  'owner' as role,
  'accepted' as status,
  p.created_at as invited_at,
  p.created_at as joined_at
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_members pm 
  WHERE pm.project_id = p.id AND pm.user_id = p.user_id
);

-- 4. Проверяем результат добавления создателей
SELECT '=== CREATORS ADDED TO PROJECT_MEMBERS ===' as info;
SELECT 
  pm.project_id,
  pm.user_id,
  pm.role,
  pm.status,
  p.name as project_name,
  pr.email as creator_email,
  pr.full_name as creator_name
FROM project_members pm
JOIN projects p ON pm.project_id = p.id
JOIN profiles pr ON pm.user_id = pr.id
WHERE pm.role = 'owner'
ORDER BY p.created_at DESC;

-- 5. Создаем функцию для автоматического добавления создателя проекта
CREATE OR REPLACE FUNCTION add_project_creator_to_members()
RETURNS TRIGGER AS $$
BEGIN
  -- Добавляем создателя проекта в project_members
  INSERT INTO project_members (project_id, user_id, role, status, invited_at, joined_at)
  VALUES (NEW.id, NEW.user_id, 'owner', 'accepted', NOW(), NOW())
  ON CONFLICT (project_id, user_id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Создаем триггер для автоматического добавления создателя
DROP TRIGGER IF EXISTS trigger_add_project_creator ON projects;
CREATE TRIGGER trigger_add_project_creator
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION add_project_creator_to_members();

-- 7. Создаем функцию для автоматического создания профиля при регистрации
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Создаем триггер для автоматического создания профиля
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- 9. Проверяем финальный результат
SELECT '=== FINAL PROJECT SYSTEM STATUS ===' as info;

-- Показываем все проекты с их участниками
SELECT 
  p.id as project_id,
  p.name as project_name,
  p.user_id as creator_id,
  pr.email as creator_email,
  pr.full_name as creator_name,
  COUNT(pm.user_id) as total_members
FROM projects p
LEFT JOIN profiles pr ON p.user_id = pr.id
LEFT JOIN project_members pm ON p.id = pm.project_id
GROUP BY p.id, p.name, p.user_id, pr.email, pr.full_name
ORDER BY p.created_at DESC;

-- Показываем всех участников проектов
SELECT 
  pm.project_id,
  pm.user_id,
  pm.role,
  pm.status,
  p.name as project_name,
  pr.email as user_email,
  pr.full_name as user_full_name
FROM project_members pm
JOIN projects p ON pm.project_id = p.id
JOIN profiles pr ON pm.user_id = pr.id
ORDER BY p.created_at DESC;

-- 10. Показываем RLS статус
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('profiles', 'projects', 'project_members', 'project_invitations')
ORDER BY tablename;
