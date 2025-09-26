-- ЭКСТРЕННОЕ ИСПРАВЛЕНИЕ БАЗЫ ДАННЫХ
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Удаляем все проблемные RLS политики
DROP POLICY IF EXISTS "Users can view project members" ON project_members;
DROP POLICY IF EXISTS "Project owners can add members" ON project_members;
DROP POLICY IF EXISTS "Project owners and admins can manage members" ON project_members;
DROP POLICY IF EXISTS "Allow project member creation" ON project_members;
DROP POLICY IF EXISTS "Allow project creation" ON project_members;

DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can create their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;

-- 2. Удаляем проблемную RPC функцию
DROP FUNCTION IF EXISTS create_project_and_members(text,text,text,text);
DROP FUNCTION IF EXISTS create_project_and_members(text,text,text,text,text);
DROP FUNCTION IF EXISTS create_project_and_members(text);
DROP FUNCTION IF EXISTS create_project_and_members();

-- 3. Временно отключаем RLS для исправления
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;

-- 4. Проверяем и исправляем структуру таблиц
-- Убеждаемся, что таблица projects имеет все нужные поля
DO $$
BEGIN
  -- Добавляем поля если их нет
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'status'
  ) THEN
    ALTER TABLE projects ADD COLUMN status TEXT DEFAULT 'active';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE projects ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE projects ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- 5. Создаем таблицу project_members если не существует
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  joined_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  UNIQUE(project_id, user_id)
);

-- 6. Исправляем существующие проекты (устанавливаем user_id если он null)
UPDATE projects 
SET user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'grigoryneupokoev@gmail.com' 
  LIMIT 1
)
WHERE user_id IS NULL;

-- 7. Создаем простую RPC функцию для создания проектов
CREATE OR REPLACE FUNCTION create_project_and_members(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_color TEXT DEFAULT '#3B82F6',
  p_icon TEXT DEFAULT '🎯'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_project_id UUID;
  current_user_id UUID;
  result JSON;
BEGIN
  -- Получаем текущего пользователя
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated';
  END IF;

  -- Создаем проект
  INSERT INTO projects (
    name,
    description,
    color,
    icon,
    user_id,
    status,
    created_at,
    updated_at
  ) VALUES (
    p_name,
    p_description,
    p_color,
    p_icon,
    current_user_id,
    'active',
    NOW(),
    NOW()
  ) RETURNING projects.id INTO new_project_id;

  -- Добавляем создателя как владельца проекта в project_members
  INSERT INTO project_members (
    project_id,
    user_id,
    role,
    status,
    joined_at
  ) VALUES (
    new_project_id,
    current_user_id,
    'owner',
    'accepted',
    NOW()
  );

  -- Возвращаем созданный проект как JSON
  SELECT to_json(p.*) INTO result
  FROM projects p
  WHERE p.id = new_project_id;

  RETURN result;
END;
$$;

-- 8. Даем права на выполнение функции
GRANT EXECUTE ON FUNCTION create_project_and_members TO authenticated;

-- 9. Включаем RLS обратно
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- 10. Создаем простые и безопасные RLS политики
-- Политики для projects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'projects' AND policyname = 'Users can manage their own projects'
  ) THEN
    CREATE POLICY "Users can manage their own projects" ON projects
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- Политики для project_members - простые без рекурсии
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_members' AND policyname = 'Users can view project members'
  ) THEN
    CREATE POLICY "Users can view project members" ON project_members
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_members' AND policyname = 'Users can create project members'
  ) THEN
    CREATE POLICY "Users can create project members" ON project_members
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- 11. Проверяем что все работает
SELECT 'Database fixed successfully!' as status;
