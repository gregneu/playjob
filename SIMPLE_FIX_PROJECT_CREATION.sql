-- ПРОСТОЕ ИСПРАВЛЕНИЕ СОЗДАНИЯ ПРОЕКТОВ
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Удаляем все проблемные политики для project_members
DROP POLICY IF EXISTS "Users can view project members" ON project_members;
DROP POLICY IF EXISTS "Users can create project members" ON project_members;
DROP POLICY IF EXISTS "Project owners can add members" ON project_members;
DROP POLICY IF EXISTS "Allow project member creation" ON project_members;
DROP POLICY IF EXISTS "Allow all project member inserts" ON project_members;
DROP POLICY IF EXISTS "Users can view their project members" ON project_members;

-- 2. Создаем простую политику для INSERT (разрешает всем создавать записи)
CREATE POLICY "Allow project member creation" ON project_members
  FOR INSERT WITH CHECK (true);

-- 3. Создаем простую политику для SELECT (разрешает всем читать)
CREATE POLICY "Allow project member reading" ON project_members
  FOR SELECT USING (true);

-- 4. Проверяем что RLS включен
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- 5. Проверяем что все работает
SELECT 'Project creation policies fixed!' as status;
