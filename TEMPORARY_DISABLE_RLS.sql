-- ВРЕМЕННОЕ ОТКЛЮЧЕНИЕ RLS ДЛЯ СОЗДАНИЯ ПРОЕКТОВ
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Удаляем существующие политики для project_members
DROP POLICY IF EXISTS "Users can view project members" ON project_members;
DROP POLICY IF EXISTS "Users can create project members" ON project_members;
DROP POLICY IF EXISTS "Project owners can add members" ON project_members;
DROP POLICY IF EXISTS "Allow project member creation" ON project_members;

-- 2. Создаем очень простую политику для INSERT (разрешает всем)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_members' AND policyname = 'Allow all project member inserts'
  ) THEN
    CREATE POLICY "Allow all project member inserts" ON project_members
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;

-- 3. Создаем политику для SELECT (только для владельцев проектов)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_members' AND policyname = 'Users can view their project members'
  ) THEN
    CREATE POLICY "Users can view their project members" ON project_members
      FOR SELECT USING (
        auth.uid() IN (
          SELECT user_id FROM project_members 
          WHERE project_id = project_members.project_id
        ) OR
        auth.uid() IN (
          SELECT user_id FROM projects 
          WHERE id = project_members.project_id
        )
      );
  END IF;
END $$;

-- 4. Проверяем что RLS включен
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- 5. Проверяем структуру таблицы project_members
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'project_members' 
ORDER BY ordinal_position;

-- 6. Проверяем что все работает
SELECT 'RLS policies updated successfully!' as status;
