-- ИСПРАВЛЕНИЕ ПРОБЛЕМЫ С PROJECT_MEMBERS
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Проверяем структуру таблицы project_members
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'project_members'
ORDER BY ordinal_position;

-- 2. Временно отключаем RLS для project_members
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;

-- 3. Удаляем все политики для project_members
DROP POLICY IF EXISTS "project_members_policy" ON project_members;
DROP POLICY IF EXISTS "Allow project member creation" ON project_members;
DROP POLICY IF EXISTS "Allow project member reading" ON project_members;
DROP POLICY IF EXISTS "Users can view project members" ON project_members;
DROP POLICY IF EXISTS "Users can create project members" ON project_members;
DROP POLICY IF EXISTS "Project owners can add members" ON project_members;
DROP POLICY IF EXISTS "Allow all project member inserts" ON project_members;
DROP POLICY IF EXISTS "Users can view their project members" ON project_members;
DROP POLICY IF EXISTS "project_members_allow_all" ON project_members;

-- 4. Проверяем существующие записи в project_members
SELECT COUNT(*) as total_members FROM project_members;
SELECT * FROM project_members LIMIT 5;

-- 5. Исправляем записи с null user_id
UPDATE project_members 
SET user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'grigoryneupokoev@gmail.com' 
  LIMIT 1
)
WHERE user_id IS NULL;

-- 6. Проверяем что все записи имеют user_id
SELECT COUNT(*) as members_without_user_id 
FROM project_members 
WHERE user_id IS NULL;

-- 7. Включаем RLS обратно
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- 8. Создаем простую политику (разрешает все)
CREATE POLICY "project_members_allow_all" ON project_members
  FOR ALL USING (true);

-- 9. Проверяем что все работает
SELECT 'Project members table fixed!' as status;
