-- ЭКСТРЕННОЕ ОТКЛЮЧЕНИЕ ВСЕХ АВТОМАТИЧЕСКИХ ДЕЙСТВИЙ
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Отключаем RLS для всех таблиц
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_invitations DISABLE ROW LEVEL SECURITY;

-- 2. Удаляем ВСЕ политики
DROP POLICY IF EXISTS "projects_allow_all" ON projects;
DROP POLICY IF EXISTS "project_members_allow_all" ON project_members;
DROP POLICY IF EXISTS "projects_simple_policy" ON projects;
DROP POLICY IF EXISTS "projects_policy" ON projects;
DROP POLICY IF EXISTS "Users can manage their own projects" ON projects;
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can create their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;

DROP POLICY IF EXISTS "project_members_policy" ON project_members;
DROP POLICY IF EXISTS "Allow project member creation" ON project_members;
DROP POLICY IF EXISTS "Allow project member reading" ON project_members;
DROP POLICY IF EXISTS "Users can view project members" ON project_members;
DROP POLICY IF EXISTS "Users can create project members" ON project_members;
DROP POLICY IF EXISTS "Project owners can add members" ON project_members;
DROP POLICY IF EXISTS "Allow all project member inserts" ON project_members;
DROP POLICY IF EXISTS "Users can view their project members" ON project_members;

-- 3. Удаляем ВСЕ триггеры
DROP TRIGGER IF EXISTS on_project_created ON projects;
DROP TRIGGER IF EXISTS projects_trigger ON projects;
DROP TRIGGER IF EXISTS project_members_trigger ON project_members;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_project_insert ON projects;
DROP TRIGGER IF EXISTS on_project_members_insert ON project_members;

-- 4. Удаляем ВСЕ функции, которые могут создавать project_members
DROP FUNCTION IF EXISTS create_project_and_members(text,text,text,text);
DROP FUNCTION IF EXISTS create_project_and_members(text,text,text,text,text);
DROP FUNCTION IF EXISTS create_project_and_members(text);
DROP FUNCTION IF EXISTS create_project_and_members();
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS handle_new_project();
DROP FUNCTION IF EXISTS create_project_member();

-- 5. Удаляем ВСЕ ограничения, которые могут вызывать автоматические действия
-- Проверяем и удаляем ограничения
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    FOR constraint_record IN 
        SELECT constraint_name, table_name 
        FROM information_schema.table_constraints 
        WHERE table_name IN ('projects', 'project_members')
        AND constraint_type = 'FOREIGN KEY'
    LOOP
        EXECUTE 'ALTER TABLE ' || constraint_record.table_name || 
                ' DROP CONSTRAINT IF EXISTS ' || constraint_record.constraint_name;
    END LOOP;
END $$;

-- 6. Проверяем что все триггеры удалены
SELECT 
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers 
WHERE event_object_table IN ('projects', 'project_members', 'auth.users');

-- 7. Проверяем что все функции удалены
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_definition LIKE '%project_members%' 
   OR routine_definition LIKE '%projects%'
   OR routine_name LIKE '%project%';

-- 8. Проверяем статус RLS
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('projects', 'project_members', 'profiles', 'project_invitations')
ORDER BY tablename;

-- 9. Проверяем что все работает
SELECT 'All automation disabled - database should work now!' as status;
