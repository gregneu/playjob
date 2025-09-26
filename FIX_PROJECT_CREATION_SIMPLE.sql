-- Простое исправление создания проектов
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Удаляем все возможные версии функции
DROP FUNCTION IF EXISTS create_project_and_members(text,text,text,text);
DROP FUNCTION IF EXISTS create_project_and_members(text,text,text,text,text);
DROP FUNCTION IF EXISTS create_project_and_members(text);
DROP FUNCTION IF EXISTS create_project_and_members();

-- 2. Создаем простую функцию для создания проекта
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

-- 3. Даем права на выполнение функции
GRANT EXECUTE ON FUNCTION create_project_and_members TO authenticated;

-- 4. Создаем таблицу project_members если не существует
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

-- 5. Включаем RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- 6. Создаем базовые политики для projects
DO $$
BEGIN
  -- Политика для чтения проектов
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'projects' AND policyname = 'Users can view their own projects'
  ) THEN
    CREATE POLICY "Users can view their own projects" ON projects
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  -- Политика для создания проектов
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'projects' AND policyname = 'Users can create their own projects'
  ) THEN
    CREATE POLICY "Users can create their own projects" ON projects
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Политика для обновления проектов
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'projects' AND policyname = 'Users can update their own projects'
  ) THEN
    CREATE POLICY "Users can update their own projects" ON projects
      FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  -- Политика для удаления проектов
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'projects' AND policyname = 'Users can delete their own projects'
  ) THEN
    CREATE POLICY "Users can delete their own projects" ON projects
      FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- 7. Создаем политики для project_members
DO $$
BEGIN
  -- Политика для чтения участников проекта
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_members' AND policyname = 'Users can view project members'
  ) THEN
    CREATE POLICY "Users can view project members" ON project_members
      FOR SELECT USING (
        auth.uid() IN (
          SELECT user_id FROM project_members 
          WHERE project_id = project_members.project_id
        )
      );
  END IF;

  -- Политика для создания участников проекта (разрешаем всем)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_members' AND policyname = 'Allow project member creation'
  ) THEN
    CREATE POLICY "Allow project member creation" ON project_members
      FOR INSERT WITH CHECK (true);
  END IF;
END $$;
