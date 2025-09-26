-- Проверка структуры таблицы projects
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Показываем структуру таблицы projects
SELECT '=== СТРУКТУРА ТАБЛИЦЫ PROJECTS ===' as info;
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'projects'
ORDER BY ordinal_position;

-- 2. Показываем несколько примеров проектов
SELECT '=== ПРИМЕРЫ ПРОЕКТОВ ===' as info;
SELECT * FROM projects LIMIT 3;

-- 3. Проверяем, есть ли поле owner_id
SELECT '=== ПРОВЕРКА OWNER_ID ===' as info;
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'projects' AND column_name = 'owner_id'
    ) THEN 'Поле owner_id существует'
    ELSE 'Поле owner_id НЕ существует'
  END as owner_id_status;
