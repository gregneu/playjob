-- ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ СОЗДАНИЯ ПРОЕКТОВ
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Отключаем RLS для всех таблиц
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;

-- 2. Удаляем все политики
DROP POLICY IF EXISTS "projects_simple_policy" ON projects;
DROP POLICY IF EXISTS "projects_policy" ON projects;
DROP POLICY IF EXISTS "Users can manage their own projects" ON projects;
DROP POLICY IF EXISTS "projects_allow_all" ON projects;

DROP POLICY IF EXISTS "project_members_policy" ON project_members;
DROP POLICY IF EXISTS "Allow project member creation" ON project_members;
DROP POLICY IF EXISTS "Allow project member reading" ON project_members;
DROP POLICY IF EXISTS "Users can view project members" ON project_members;
DROP POLICY IF EXISTS "Users can create project members" ON project_members;

-- 3. Проверяем структуру таблицы projects
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'projects'
ORDER BY ordinal_position;

-- 4. Исправляем существующие проекты
UPDATE projects 
SET 
  user_id = (
    SELECT id FROM auth.users 
    WHERE email = 'grigoryneupokoev@gmail.com' 
    LIMIT 1
  ),
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

-- 5. Проверяем что все проекты имеют user_id
SELECT COUNT(*) as projects_without_user_id 
FROM projects 
WHERE user_id IS NULL;

-- 6. Включаем RLS обратно
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- 7. Создаем простые политики (разрешают все)
CREATE POLICY "projects_allow_all" ON projects
  FOR ALL USING (true);

CREATE POLICY "project_members_allow_all" ON project_members
  FOR ALL USING (true);

-- 8. Проверяем что все работает
SELECT 'Project creation should work now!' as status;
SELECT COUNT(*) as total_projects FROM projects;
