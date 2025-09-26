-- Быстрый скрипт для добавления тестовых пользователей
-- Выполните в Supabase SQL Editor

-- Создаем таблицу profiles, если её нет
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  username TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Добавляем тестовых пользователей (без привязки к auth.users)
-- Это позволит тестировать аватары без реальной авторизации

INSERT INTO profiles (id, full_name, email, username) VALUES 
  ('11111111-1111-1111-1111-111111111111', 'John Doe', 'john@example.com', 'johndoe'),
  ('22222222-2222-2222-2222-222222222222', 'Jane Smith', 'jane@example.com', 'janesmith'),
  ('33333333-3333-3333-3333-333333333333', 'Mike Johnson', 'mike@example.com', 'mikejohnson'),
  ('44444444-4444-4444-4444-444444444444', 'Sarah Wilson', 'sarah@example.com', 'sarahwilson'),
  ('55555555-5555-5555-5555-555555555555', 'Alex Brown', 'alex@example.com', 'alexbrown')
ON CONFLICT (id) DO NOTHING;

-- Проверяем результат
SELECT * FROM profiles;
