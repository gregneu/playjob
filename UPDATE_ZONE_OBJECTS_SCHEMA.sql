-- Обновление схемы zone_objects для поддержки новых типов объектов
-- Выполните этот скрипт в SQL Editor вашего проекта Supabase

-- Сначала проверим текущие данные
SELECT object_type, COUNT(*) as count 
FROM zone_objects 
GROUP BY object_type;

-- Обновляем существующие данные (если есть старые типы)
UPDATE zone_objects 
SET object_type = 'story' 
WHERE object_type NOT IN ('mountain', 'castle', 'house', 'garden', 'factory', 'helipad', 'story', 'task', 'bug', 'test');

-- Удаляем старый CHECK constraint
ALTER TABLE zone_objects DROP CONSTRAINT IF EXISTS zone_objects_object_type_check;

-- Добавляем новый CHECK constraint с поддержкой всех типов
ALTER TABLE zone_objects ADD CONSTRAINT zone_objects_object_type_check 
CHECK (object_type IN ('mountain', 'castle', 'house', 'garden', 'factory', 'helipad', 'story', 'task', 'bug', 'test'));

-- Проверяем результат
SELECT object_type, COUNT(*) as count 
FROM zone_objects 
GROUP BY object_type;

-- Проверяем constraint
SELECT constraint_name, check_clause 
FROM information_schema.check_constraints 
WHERE constraint_name = 'zone_objects_object_type_check'; 