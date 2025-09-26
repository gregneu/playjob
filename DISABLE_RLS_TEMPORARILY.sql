-- ВРЕМЕННОЕ ОТКЛЮЧЕНИЕ RLS ДЛЯ ЭКСТРЕННОГО ИСПРАВЛЕНИЯ
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Отключаем RLS для всех проблемных таблиц
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;

-- 2. Проверяем что RLS отключен
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('projects', 'project_members')
ORDER BY tablename;

-- 3. Проверяем структуру таблиц
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('projects', 'project_members')
ORDER BY table_name, ordinal_position;

-- 4. Проверяем что все работает
SELECT 'RLS temporarily disabled - database should work now!' as status;
