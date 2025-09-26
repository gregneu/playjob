-- УДАЛЕНИЕ ВСЕХ ФУНКЦИЙ И ТРИГГЕРОВ, СВЯЗАННЫХ С ПРОЕКТАМИ
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Удаляем все триггеры для таблицы projects
DROP TRIGGER IF EXISTS on_project_created ON projects;
DROP TRIGGER IF EXISTS projects_trigger ON projects;
DROP TRIGGER IF EXISTS project_created_trigger ON projects;
DROP TRIGGER IF EXISTS on_project_insert ON projects;
DROP TRIGGER IF EXISTS project_insert_trigger ON projects;

-- 2. Удаляем все триггеры для таблицы project_members
DROP TRIGGER IF EXISTS on_project_members_insert ON project_members;
DROP TRIGGER IF EXISTS project_members_trigger ON project_members;
DROP TRIGGER IF EXISTS project_members_insert_trigger ON project_members;

-- 3. Удаляем все триггеры для таблицы auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS auth_user_created_trigger ON auth.users;
DROP TRIGGER IF EXISTS on_user_created ON auth.users;

-- 4. Удаляем все функции, связанные с проектами
DROP FUNCTION IF EXISTS add_project_owner();
DROP FUNCTION IF EXISTS add_project_owner(projects);
DROP FUNCTION IF EXISTS create_project_and_members(text,text,text,text);
DROP FUNCTION IF EXISTS create_project_and_members(text,text,text,text,text);
DROP FUNCTION IF EXISTS create_project_and_members(text);
DROP FUNCTION IF EXISTS create_project_and_members();
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS handle_new_project();
DROP FUNCTION IF EXISTS create_project_member();
DROP FUNCTION IF EXISTS on_auth_user_created();
DROP FUNCTION IF EXISTS on_project_created();

-- 5. Проверяем что все триггеры удалены
SELECT 
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers 
WHERE event_object_table IN ('projects', 'project_members', 'users')
   OR (event_object_table = 'users' AND event_object_schema = 'auth');

-- 6. Проверяем что все функции удалены
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_definition LIKE '%projects%' 
   OR routine_definition LIKE '%project_members%'
   OR routine_name LIKE '%project%'
   OR routine_name LIKE '%user%';

-- 7. Проверяем что все работает
SELECT 'All project automation deleted!' as status;
