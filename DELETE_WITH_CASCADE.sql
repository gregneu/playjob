-- УДАЛЕНИЕ С CASCADE ДЛЯ ПРИНУДИТЕЛЬНОГО УДАЛЕНИЯ
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Удаляем функцию с CASCADE (удалит все зависимые объекты)
DROP FUNCTION IF EXISTS add_project_owner() CASCADE;
DROP FUNCTION IF EXISTS add_project_owner(projects) CASCADE;

-- 2. Удаляем все возможные триггеры для projects
DROP TRIGGER IF EXISTS trigger_add_project_owner ON projects;
DROP TRIGGER IF EXISTS on_project_created ON projects;
DROP TRIGGER IF EXISTS projects_trigger ON projects;
DROP TRIGGER IF EXISTS project_created_trigger ON projects;
DROP TRIGGER IF EXISTS on_project_insert ON projects;
DROP TRIGGER IF EXISTS project_insert_trigger ON projects;

-- 3. Проверяем что все триггеры удалены
SELECT 
  trigger_name,
  event_manipulation,
  action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'projects';

-- 4. Проверяем что функция удалена
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines 
WHERE routine_name LIKE '%project_owner%' 
   OR routine_name LIKE '%add_project%';

-- 5. Проверяем что все работает
SELECT 'Function and trigger deleted with CASCADE!' as status;
