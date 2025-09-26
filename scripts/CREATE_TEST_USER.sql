-- СОЗДАНИЕ ТЕСТОВОГО ПОЛЬЗОВАТЕЛЯ ДЛЯ ПРОВЕРКИ СИСТЕМЫ ПРИГЛАШЕНИЙ
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Создаем тестового пользователя в profiles (если его нет)
-- Замените 'test-user-id' на реальный UUID пользователя из auth.users
INSERT INTO profiles (id, email, full_name, created_at, updated_at)
VALUES (
  'test-user-id', -- Замените на реальный UUID
  'mishel@gmail.com',
  'Михаил Тестовый',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = NOW();

-- 2. Альтернативный способ - создать пользователя с случайным UUID
-- Раскомментируйте следующие строки, если хотите создать пользователя с случайным UUID
/*
INSERT INTO profiles (id, email, full_name, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  'test@example.com',
  'Тестовый Пользователь',
  NOW(),
  NOW()
);
*/

-- 3. Проверяем созданного пользователя
SELECT '=== TEST USER CREATED ===' as info;
SELECT * FROM profiles WHERE email = 'mishel@gmail.com';

-- 4. Показываем всех пользователей в profiles
SELECT '=== ALL PROFILES ===' as info;
SELECT id, email, full_name, created_at FROM profiles ORDER BY created_at DESC;

-- 5. Проверяем, что таблица project_members готова к работе
SELECT '=== PROJECT_MEMBERS READY ===' as info;
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'project_members'
ORDER BY ordinal_position;
