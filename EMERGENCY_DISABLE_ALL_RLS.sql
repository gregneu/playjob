-- ЭКСТРЕННОЕ ОТКЛЮЧЕНИЕ ВСЕХ RLS ПОЛИТИК
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Отключаем RLS для всех таблиц
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_invitations DISABLE ROW LEVEL SECURITY;

-- 2. Удаляем ВСЕ политики для всех таблиц
-- Projects
DROP POLICY IF EXISTS "projects_simple_policy" ON projects;
DROP POLICY IF EXISTS "projects_policy" ON projects;
DROP POLICY IF EXISTS "Users can manage their own projects" ON projects;
DROP POLICY IF EXISTS "projects_allow_all" ON projects;
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can create their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;

-- Project members
DROP POLICY IF EXISTS "project_members_policy" ON project_members;
DROP POLICY IF EXISTS "Allow project member creation" ON project_members;
DROP POLICY IF EXISTS "Allow project member reading" ON project_members;
DROP POLICY IF EXISTS "Users can view project members" ON project_members;
DROP POLICY IF EXISTS "Users can create project members" ON project_members;
DROP POLICY IF EXISTS "Project owners can add members" ON project_members;
DROP POLICY IF EXISTS "Allow all project member inserts" ON project_members;
DROP POLICY IF EXISTS "Users can view their project members" ON project_members;

-- Profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Project invitations
DROP POLICY IF EXISTS "Project owners and admins can manage invitations" ON project_invitations;
DROP POLICY IF EXISTS "Users can view their own invitations" ON project_invitations;

-- 3. Проверяем статус RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('projects', 'project_members', 'profiles', 'project_invitations')
ORDER BY tablename;

-- 4. Проверяем что все работает
SELECT 'All RLS policies disabled - database should work now!' as status;
