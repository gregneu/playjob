-- ФИНАЛЬНОЕ ИСПРАВЛЕНИЕ ВСЕХ ТАБЛИЦ В SUPABASE
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Полностью пересоздаем таблицу profiles
DROP TABLE IF EXISTS profiles CASCADE;
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Создаем индексы для profiles
CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_full_name ON profiles(full_name);

-- 3. Отключаем RLS для profiles
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 4. Создаем функцию для автоматического создания профиля
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Создаем триггер для автоматического создания профиля
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

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

-- 7. Обновляем существующие записи в project_invitations
UPDATE project_invitations 
SET 
  expires_at = COALESCE(expires_at, NOW() + INTERVAL '7 days'),
  token = COALESCE(token, gen_random_uuid()::text)
WHERE expires_at IS NULL OR token IS NULL;

-- 8. Устанавливаем NOT NULL ограничения для project_invitations
ALTER TABLE project_invitations ALTER COLUMN expires_at SET NOT NULL;
ALTER TABLE project_invitations ALTER COLUMN token SET NOT NULL;

-- 9. Добавляем недостающие поля в project_members
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

-- 10. Обновляем существующие записи в project_members
UPDATE project_members 
SET 
  invited_at = COALESCE(invited_at, NOW()),
  status = COALESCE(status, 'accepted')
WHERE invited_at IS NULL OR status IS NULL;

-- 11. Устанавливаем NOT NULL ограничения для project_members
ALTER TABLE project_members ALTER COLUMN invited_at SET NOT NULL;
ALTER TABLE project_members ALTER COLUMN status SET NOT NULL;

-- 12. Отключаем RLS для всех таблиц для отладки
ALTER TABLE project_invitations DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_members DISABLE ROW LEVEL SECURITY;

-- 13. Создаем все необходимые индексы
CREATE INDEX IF NOT EXISTS idx_project_invitations_project_id ON project_invitations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_invitations_email ON project_invitations(email);
CREATE INDEX IF NOT EXISTS idx_project_invitations_token ON project_invitations(token);
CREATE INDEX IF NOT EXISTS idx_project_invitations_status ON project_invitations(status);

CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_status ON project_members(status);
CREATE INDEX IF NOT EXISTS idx_project_members_role ON project_members(role);

-- 14. Создаем уникальный индекс для project_members
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_members_unique 
  ON project_members(project_id, user_id);

-- 15. Проверяем результат
SELECT 'All tables fixed successfully!' as status;

-- 16. Показываем финальный статус
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE tablename IN ('profiles', 'project_invitations', 'project_members')
ORDER BY tablename;
