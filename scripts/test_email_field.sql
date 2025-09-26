-- Тестирование поля email в profiles
-- Выполните этот скрипт для проверки

-- 1. Проверяем структуру таблицы
SELECT '=== СТРУКТУРА ТАБЛИЦЫ ===' as info;
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. Проверяем количество профилей
SELECT '=== СТАТИСТИКА ===' as info;
SELECT 
  COUNT(*) as total_profiles,
  COUNT(email) as profiles_with_email,
  COUNT(*) - COUNT(email) as profiles_without_email
FROM profiles;

-- 3. Показываем несколько профилей
SELECT '=== ПРИМЕРЫ ПРОФИЛЕЙ ===' as info;
SELECT 
  id,
  full_name,
  email,
  username,
  created_at
FROM profiles 
ORDER BY created_at DESC
LIMIT 5;

-- 4. Проверяем индекс
SELECT '=== ИНДЕКСЫ ===' as info;
SELECT 
  indexname,
  indexdef
FROM pg_indexes 
WHERE tablename = 'profiles' 
  AND indexdef LIKE '%email%';
