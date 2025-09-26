-- УДАЛЕНИЕ ФУНКЦИИ add_project_owner И ТРИГГЕРА
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Удаляем конкретный триггер trigger_add_project_owner
DROP TRIGGER IF EXISTS trigger_add_project_owner ON projects;
DROP TRIGGER IF EXISTS on_project_created ON projects;
DROP TRIGGER IF EXISTS projects_trigger ON projects;
DROP TRIGGER IF EXISTS project_created_trigger ON projects;

-- 2. Удаляем функцию add_project_owner (теперь без зависимостей)
DROP FUNCTION IF EXISTS add_project_owner();
DROP FUNCTION IF EXISTS add_project_owner(projects);

-- 3. Проверяем что все триггеры удалены
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
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
SELECT 'Project owner function and trigger deleted!' as status;
