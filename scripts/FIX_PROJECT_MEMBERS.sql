-- ИСПРАВЛЕНИЕ ТАБЛИЦЫ PROJECT_MEMBERS В SUPABASE
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Проверяем текущую структуру project_members
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'project_members'
ORDER BY ordinal_position;

-- 2. Добавляем недостающие поля если их нет
DO $$ 
BEGIN
  -- Добавляем поле invited_at если его нет
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'project_members' AND column_name = 'invited_at'
  ) THEN
    ALTER TABLE project_members ADD COLUMN invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
  
  -- Добавляем поле joined_at если его нет
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'project_members' AND column_name = 'joined_at'
  ) THEN
    ALTER TABLE project_members ADD COLUMN joined_at TIMESTAMP WITH TIME ZONE;
  END IF;
  
  -- Добавляем поле status если его нет
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'project_members' AND column_name = 'status'
  ) THEN
    ALTER TABLE project_members ADD COLUMN status TEXT DEFAULT 'accepted';
  END IF;
END $$;

-- 3. Обновляем существующие записи, добавляя недостающие значения
UPDATE project_members 
SET 
  invited_at = COALESCE(invited_at, NOW()),
  status = COALESCE(status, 'accepted')
WHERE invited_at IS NULL OR status IS NULL;

-- 4. Устанавливаем NOT NULL ограничения для обязательных полей
ALTER TABLE project_members ALTER COLUMN invited_at SET NOT NULL;
ALTER TABLE project_members ALTER COLUMN status SET NOT NULL;

-- 5. Добавляем CHECK ограничения для поля status
ALTER TABLE project_members DROP CONSTRAINT IF EXISTS project_members_status_check;
ALTER TABLE project_members ADD CONSTRAINT project_members_status_check 
  CHECK (status IN ('pending', 'accepted', 'declined'));

-- 6. Добавляем CHECK ограничения для поля role
ALTER TABLE project_members DROP CONSTRAINT IF EXISTS project_members_role_check;
ALTER TABLE project_members ADD CONSTRAINT project_members_role_check 
  CHECK (role IN ('owner', 'admin', 'member'));

-- 7. Временно отключаем RLS для project_members для отладки
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;

-- 8. Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_status ON project_members(status);
CREATE INDEX IF NOT EXISTS idx_project_members_role ON project_members(role);

-- 9. Проверяем внешние ключи
-- Добавляем внешний ключ для project_id если его нет
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'project_members_project_id_fkey'
  ) THEN
    ALTER TABLE project_members ADD CONSTRAINT project_members_project_id_fkey 
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Добавляем внешний ключ для user_id если его нет
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'project_members_user_id_fkey'
  ) THEN
    ALTER TABLE project_members ADD CONSTRAINT project_members_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Добавляем внешний ключ для invited_by если его нет
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'project_members_invited_by_fkey'
  ) THEN
    ALTER TABLE project_members ADD CONSTRAINT project_members_invited_by_fkey 
      FOREIGN KEY (invited_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 10. Создаем уникальный индекс для предотвращения дублирования
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_members_unique 
  ON project_members(project_id, user_id);

-- 11. Проверяем результат
SELECT 'Project members table fixed successfully!' as status;

-- 12. Показываем финальную структуру таблицы
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'project_members'
ORDER BY ordinal_position;

-- 13. Проверяем RLS статус
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename = 'project_members';
