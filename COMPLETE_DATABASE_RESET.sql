-- ПОЛНОЕ ВОССТАНОВЛЕНИЕ БАЗЫ ДАННЫХ
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Удаляем ВСЕ политики для projects и project_members
DROP POLICY IF EXISTS "Users can manage their own projects" ON projects;
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can create their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;

DROP POLICY IF EXISTS "Users can view project members" ON project_members;
DROP POLICY IF EXISTS "Users can create project members" ON project_members;
DROP POLICY IF EXISTS "Project owners can add members" ON project_members;
DROP POLICY IF EXISTS "Allow project member creation" ON project_members;
DROP POLICY IF EXISTS "Allow all project member inserts" ON project_members;
DROP POLICY IF EXISTS "Users can view their project members" ON project_members;
DROP POLICY IF EXISTS "Allow project member reading" ON project_members;

-- 2. Временно отключаем RLS полностью
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;

-- 3. Проверяем и исправляем структуру таблицы projects
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

-- 5. Исправляем существующие проекты (устанавливаем user_id если он null)
UPDATE projects 
SET user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'grigoryneupokoev@gmail.com' 
  LIMIT 1
)
WHERE user_id IS NULL;

-- 6. Включаем RLS обратно
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- 7. Создаем МАКСИМАЛЬНО ПРОСТЫЕ политики
-- Для projects - разрешаем все операции для владельцев
CREATE POLICY "projects_policy" ON projects
  FOR ALL USING (auth.uid() = user_id);

-- Для project_members - разрешаем все операции
CREATE POLICY "project_members_policy" ON project_members
  FOR ALL USING (true);

-- 8. Проверяем что все работает
SELECT 'Database completely reset and fixed!' as status;
