-- ПОИСК ВСЕХ ФУНКЦИЙ И ТРИГГЕРОВ, СВЯЗАННЫХ С ПРОЕКТАМИ
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Ищем все функции, которые упоминают projects или project_members
SELECT 
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines 
WHERE routine_definition LIKE '%projects%' 
   OR routine_definition LIKE '%project_members%'
   OR routine_name LIKE '%project%';

-- 2. Ищем все триггеры для таблицы projects
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement,
  action_orientation
FROM information_schema.triggers 
WHERE event_object_table = 'projects';

-- 3. Ищем все триггеры для таблицы project_members
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement,
  action_orientation
FROM information_schema.triggers 
WHERE event_object_table = 'project_members';

-- 4. Ищем все триггеры для таблицы auth.users
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement,
  action_orientation
FROM information_schema.triggers 
WHERE event_object_table = 'users' AND event_object_schema = 'auth';

-- 5. Проверяем что все работает
SELECT 'All project-related functions and triggers found!' as status;
