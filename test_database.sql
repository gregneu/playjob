-- Тестовый скрипт для проверки состояния базы данных
-- Выполните этот скрипт в SQL Editor вашего проекта Supabase

-- Проверяем существование таблицы zone_objects
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'zone_objects';

-- Проверяем структуру таблицы zone_objects
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'zone_objects' 
ORDER BY ordinal_position;

-- Проверяем текущие CHECK constraints для object_type
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name LIKE '%object_type%';

-- Проверяем текущие данные в таблице zone_objects
SELECT object_type, COUNT(*) as count 
FROM zone_objects 
GROUP BY object_type;

-- Проверяем таблицу zones
SELECT COUNT(*) as zones_count FROM zones;

-- Проверяем таблицу zone_cells
SELECT COUNT(*) as zone_cells_count FROM zone_cells; 