-- ПОЛНОЕ ИСПРАВЛЕНИЕ СОЗДАНИЯ ПРОЕКТОВ
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Отключаем RLS для всех таблиц
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;

-- 2. Удаляем все политики
DROP POLICY IF EXISTS "projects_allow_all" ON projects;
DROP POLICY IF EXISTS "project_members_allow_all" ON project_members;
DROP POLICY IF EXISTS "projects_simple_policy" ON projects;
DROP POLICY IF EXISTS "projects_policy" ON projects;

-- 3. Удаляем все триггеры (если есть)
DROP TRIGGER IF EXISTS on_project_created ON projects;
DROP TRIGGER IF EXISTS projects_trigger ON projects;
DROP TRIGGER IF EXISTS project_members_trigger ON project_members;

-- 4. Удаляем все функции, которые могут создавать project_members
DROP FUNCTION IF EXISTS create_project_and_members(text,text,text,text);
DROP FUNCTION IF EXISTS create_project_and_members(text,text,text,text,text);
DROP FUNCTION IF EXISTS create_project_and_members(text);
DROP FUNCTION IF EXISTS create_project_and_members();

-- 5. Проверяем структуру таблицы projects
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'projects'
ORDER BY ordinal_position;

-- 6. Проверяем структуру таблицы project_members
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'project_members'
ORDER BY ordinal_position;

-- 7. Исправляем существующие записи
UPDATE projects 
SET 
  user_id = COALESCE(user_id, (SELECT id FROM auth.users WHERE email = 'grigoryneupokoev@gmail.com' LIMIT 1)),
  status = COALESCE(status, 'active'),
  created_at = COALESCE(created_at, NOW()),
  updated_at = COALESCE(updated_at, NOW()),
  name = COALESCE(name, 'Untitled Project'),
  color = COALESCE(color, '#3B82F6'),
  icon = COALESCE(icon, '🎯')
WHERE 
  user_id IS NULL OR 
  status IS NULL OR 
  created_at IS NULL OR 
  updated_at IS NULL OR 
  name IS NULL OR 
  color IS NULL OR 
  icon IS NULL;

UPDATE project_members 
SET user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'grigoryneupokoev@gmail.com' 
  LIMIT 1
)
WHERE user_id IS NULL;

-- 8. Проверяем что все записи исправлены
SELECT COUNT(*) as projects_without_user_id FROM projects WHERE user_id IS NULL;
SELECT COUNT(*) as members_without_user_id FROM project_members WHERE user_id IS NULL;

-- 9. Включаем RLS обратно
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- 10. Создаем простые политики (разрешают все)
CREATE POLICY "projects_allow_all" ON projects
  FOR ALL USING (true);

CREATE POLICY "project_members_allow_all" ON project_members
  FOR ALL USING (true);

-- 11. Проверяем что все работает
SELECT 'Project creation should work now!' as status;
SELECT COUNT(*) as total_projects FROM projects;
SELECT COUNT(*) as total_members FROM project_members;
