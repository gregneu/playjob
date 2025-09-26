-- SQL скрипт для создания тестовых пользователей в таблице profiles
-- Выполните этот скрипт в Supabase SQL Editor

-- Сначала создадим таблицу profiles, если её нет
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  username TEXT,
  bio TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем индексы для оптимизации
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);
CREATE INDEX IF NOT EXISTS profiles_username_idx ON profiles(username);

-- Включаем Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Создаем политики безопасности
-- Пользователи могут читать все профили
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (true);

-- Пользователи могут обновлять только свой профиль
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Пользователи могут вставлять только свой профиль
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Создаем функцию для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Создаем триггер для автоматического обновления updated_at
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Теперь добавляем тестовых пользователей
-- ВАЖНО: Замените UUID на реальные ID пользователей из auth.users

-- Тестовый пользователь 1: John Doe
INSERT INTO profiles (id, full_name, email, username, bio) VALUES 
(
  '11111111-1111-1111-1111-111111111111', -- Замените на реальный UUID
  'John Doe',
  'john.doe@example.com',
  'johndoe',
  'Frontend Developer, любит React и TypeScript'
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  username = EXCLUDED.username,
  bio = EXCLUDED.bio,
  updated_at = NOW();

-- Тестовый пользователь 2: Jane Smith
INSERT INTO profiles (id, full_name, email, username, bio) VALUES 
(
  '22222222-2222-2222-2222-222222222222', -- Замените на реальный UUID
  'Jane Smith',
  'jane.smith@example.com',
  'janesmith',
  'Backend Developer, эксперт по Node.js и PostgreSQL'
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  username = EXCLUDED.username,
  bio = EXCLUDED.bio,
  updated_at = NOW();

-- Тестовый пользователь 3: Mike Johnson
INSERT INTO profiles (id, full_name, email, username, bio) VALUES 
(
  '33333333-3333-3333-3333-333333333333', -- Замените на реальный UUID
  'Mike Johnson',
  'mike.johnson@example.com',
  'mikejohnson',
  'UI/UX Designer, создает красивые интерфейсы'
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  username = EXCLUDED.username,
  bio = EXCLUDED.bio,
  updated_at = NOW();

-- Тестовый пользователь 4: Sarah Wilson
INSERT INTO profiles (id, full_name, email, username, bio) VALUES 
(
  '44444444-4444-4444-4444-444444444444', -- Замените на реальный UUID
  'Sarah Wilson',
  'sarah.wilson@example.com',
  'sarahwilson',
  'Product Manager, управляет разработкой продукта'
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  username = EXCLUDED.username,
  bio = EXCLUDED.bio,
  updated_at = NOW();

-- Тестовый пользователь 5: Alex Brown
INSERT INTO profiles (id, full_name, email, username, bio) VALUES 
(
  '55555555-5555-5555-5555-555555555555', -- Замените на реальный UUID
  'Alex Brown',
  'alex.brown@example.com',
  'alexbrown',
  'DevOps Engineer, настраивает CI/CD и инфраструктуру'
)
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  username = EXCLUDED.username,
  bio = EXCLUDED.bio,
  updated_at = NOW();

-- Проверяем, что пользователи созданы
SELECT id, full_name, email, username, created_at FROM profiles ORDER BY created_at;

-- Создаем функцию для получения случайного пользователя (для тестирования)
CREATE OR REPLACE FUNCTION get_random_user()
RETURNS profiles AS $$
BEGIN
  RETURN (SELECT * FROM profiles ORDER BY RANDOM() LIMIT 1);
END;
$$ LANGUAGE plpgsql;
