-- ИСПРАВЛЕНИЕ ТАБЛИЦЫ PROJECTS
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Отключаем RLS временно
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- 2. Удаляем все политики
DROP POLICY IF EXISTS "projects_policy" ON projects;
DROP POLICY IF EXISTS "Users can manage their own projects" ON projects;
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
DROP POLICY IF EXISTS "Users can create their own projects" ON projects;
DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;

-- 3. Проверяем и добавляем недостающие поля
DO $$
BEGIN
  -- Добавляем user_id если его нет
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN user_id UUID REFERENCES auth.users(id);
  END IF;

  -- Добавляем status если его нет
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'status'
  ) THEN
    ALTER TABLE projects ADD COLUMN status TEXT DEFAULT 'active';
  END IF;

  -- Добавляем created_at если его нет
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE projects ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  -- Добавляем updated_at если его нет
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE projects ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;

  -- Добавляем name если его нет
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'name'
  ) THEN
    ALTER TABLE projects ADD COLUMN name TEXT;
  END IF;

  -- Добавляем description если его нет
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'description'
  ) THEN
    ALTER TABLE projects ADD COLUMN description TEXT;
  END IF;

  -- Добавляем color если его нет
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'color'
  ) THEN
    ALTER TABLE projects ADD COLUMN color TEXT DEFAULT '#3B82F6';
  END IF;

  -- Добавляем icon если его нет
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'icon'
  ) THEN
    ALTER TABLE projects ADD COLUMN icon TEXT DEFAULT '🎯';
  END IF;
END $$;

-- 4. Исправляем существующие записи
UPDATE projects 
SET 
  user_id = COALESCE(user_id, (SELECT id FROM auth.users LIMIT 1)),
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

-- 5. Включаем RLS обратно
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 6. Создаем простую политику
CREATE POLICY "projects_simple_policy" ON projects
  FOR ALL USING (auth.uid() = user_id);

-- 7. Проверяем результат
SELECT 'Projects table fixed successfully!' as status;
SELECT COUNT(*) as total_projects FROM projects;
