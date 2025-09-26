-- ДИАГНОСТИКА И ИСПРАВЛЕНИЕ ПРОБЛЕМ С ТАБЛИЦАМИ
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Проверяем существование таблиц
SELECT 
  schemaname,
  tablename,
  tableowner,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('profiles', 'project_invitations', 'project_members', 'projects')
ORDER BY tablename;

-- 2. Проверяем структуру таблицы profiles
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 3. Проверяем структуру таблицы project_invitations
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'project_invitations'
ORDER BY ordinal_position;

-- 4. Создаем таблицу profiles если её нет
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Временно отключаем RLS для profiles для отладки
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 6. Добавляем недостающие поля в project_invitations
DO $$ 
BEGIN
  -- Добавляем поле expires_at если его нет
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'project_invitations' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE project_invitations ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days');
  END IF;
  
  -- Добавляем поле token если его нет
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'project_invitations' AND column_name = 'token'
  ) THEN
    ALTER TABLE project_invitations ADD COLUMN token TEXT UNIQUE DEFAULT gen_random_uuid()::text;
  END IF;
END $$;

-- 7. Обновляем существующие записи
UPDATE project_invitations 
SET 
  expires_at = COALESCE(expires_at, NOW() + INTERVAL '7 days'),
  token = COALESCE(token, gen_random_uuid()::text)
WHERE expires_at IS NULL OR token IS NULL;

-- 8. Устанавливаем NOT NULL ограничения
ALTER TABLE project_invitations ALTER COLUMN expires_at SET NOT NULL;
ALTER TABLE project_invitations ALTER COLUMN token SET NOT NULL;

-- 9. Временно отключаем RLS для project_invitations
ALTER TABLE project_invitations DISABLE ROW LEVEL SECURITY;

-- 10. Создаем индексы
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_project_invitations_project_id ON project_invitations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_invitations_email ON project_invitations(email);
CREATE INDEX IF NOT EXISTS idx_project_invitations_token ON project_invitations(token);

-- 11. Проверяем результат
SELECT 'Diagnosis and fixes completed!' as status;

-- 12. Показываем финальную структуру таблиц
SELECT '=== PROFILES TABLE ===' as info;
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

SELECT '=== PROJECT_INVITATIONS TABLE ===' as info;
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'project_invitations'
ORDER BY ordinal_position;

-- 13. Проверяем RLS статус
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('profiles', 'project_invitations')
ORDER BY tablename;
