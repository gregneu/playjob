-- Создание RPC функции для создания проектов с обходом RLS
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Удаляем существующую функцию если она есть
DROP FUNCTION IF EXISTS create_project_and_members(text,text,text,text);
DROP FUNCTION IF EXISTS create_project_and_members(text,text,text,text,text);
DROP FUNCTION IF EXISTS create_project_and_members(text);

-- 2. Создаем RPC функцию для создания проекта и добавления владельца
CREATE OR REPLACE FUNCTION create_project_and_members(
  p_name TEXT,
  p_description TEXT DEFAULT NULL,
  p_color TEXT DEFAULT '#3B82F6',
  p_icon TEXT DEFAULT '🎯'
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  description TEXT,
  color TEXT,
  icon TEXT,
  user_id UUID,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_project_id UUID;
  current_user_id UUID;
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

  -- Возвращаем созданный проект
  RETURN QUERY
  SELECT 
    p.id,
    p.name,
    p.description,
    p.color,
    p.icon,
    p.user_id,
    p.status,
    p.created_at,
    p.updated_at
  FROM projects p
  WHERE p.id = new_project_id;
END;
$$;

-- 3. Даем права на выполнение функции всем аутентифицированным пользователям
GRANT EXECUTE ON FUNCTION create_project_and_members TO authenticated;

-- 4. Проверяем, что RLS включен для таблиц
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- 5. Создаем политики для projects (если их еще нет)
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

-- 6. Создаем политики для project_members (если их еще нет)
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

  -- Политика для создания участников проекта (только владельцы и админы)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'project_members' AND policyname = 'Project owners can add members'
  ) THEN
    CREATE POLICY "Project owners can add members" ON project_members
      FOR INSERT WITH CHECK (
        auth.uid() IN (
          SELECT user_id FROM project_members 
          WHERE project_id = project_members.project_id AND role IN ('owner', 'admin')
        )
      );
  END IF;
END $$;
