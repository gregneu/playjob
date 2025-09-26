-- Обновление ограничения object_type в таблице zone_objects
-- Выполните этот скрипт в SQL Editor вашего проекта Supabase, если таблица уже существует

-- Удаляем старое ограничение
ALTER TABLE zone_objects DROP CONSTRAINT IF EXISTS zone_objects_object_type_check;

-- Добавляем новое ограничение с расширенными типами
ALTER TABLE zone_objects ADD CONSTRAINT zone_objects_object_type_check 
CHECK (object_type IN ('story', 'task', 'bug', 'test', 'mountain', 'castle', 'house', 'garden', 'factory', 'helipad'));

-- Проверяем, что ограничение обновлено
SELECT 
  constraint_name,
  check_clause
FROM information_schema.check_constraints 
WHERE constraint_schema = 'public'
  AND constraint_name = 'zone_objects_object_type_check'; 