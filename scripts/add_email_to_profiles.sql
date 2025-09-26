-- Добавление поля email в таблицу profiles
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Проверяем, существует ли поле email
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'email'
  ) THEN
    -- Добавляем поле email
    ALTER TABLE profiles ADD COLUMN email TEXT;
    RAISE NOTICE 'Поле email добавлено в таблицу profiles';
  ELSE
    RAISE NOTICE 'Поле email уже существует в таблице profiles';
  END IF;
END $$;

-- 2. Создаем индекс для поля email для быстрого поиска
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);

-- 3. Обновляем существующие профили, устанавливая email из auth.users
UPDATE profiles 
SET email = auth_users.email
FROM auth.users 
WHERE profiles.id = auth_users.id 
  AND profiles.email IS NULL;

-- 4. Показываем текущую структуру таблицы profiles
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 5. Показываем несколько примеров профилей с email
SELECT 
  id,
  full_name,
  email,
  username,
  created_at
FROM profiles 
LIMIT 5;

-- 6. Проверяем количество профилей с заполненным email
SELECT 
  COUNT(*) as total_profiles,
  COUNT(email) as profiles_with_email,
  COUNT(*) - COUNT(email) as profiles_without_email
FROM profiles;
