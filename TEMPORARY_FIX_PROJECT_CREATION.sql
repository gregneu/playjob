-- ВРЕМЕННОЕ ИСПРАВЛЕНИЕ: Отключение RLS для создания проектов
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Временно отключаем RLS для project_members (только для INSERT)
-- Это позволит создавать проекты без ошибок RLS

-- Сначала удаляем существующие политики для INSERT
DROP POLICY IF EXISTS "Project owners can add members" ON project_members;
DROP POLICY IF EXISTS "Project owners and admins can manage members" ON project_members;

-- Создаем более мягкую политику для INSERT
CREATE POLICY "Allow project creation" ON project_members
  FOR INSERT WITH CHECK (true);

-- 2. Убеждаемся, что политики для projects работают
-- Проверяем и создаем политики для projects если их нет
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

-- 3. Создаем политики для чтения project_members
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
END $$;

-- 4. Проверяем, что таблицы существуют
-- Создаем project_members если не существует
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

-- Включаем RLS
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
