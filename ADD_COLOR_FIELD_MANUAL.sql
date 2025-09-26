-- SQL скрипт для добавления поля color в таблицу zone_objects
-- Выполните этот скрипт в Supabase Dashboard -> SQL Editor

-- 1. Добавляем поле color в таблицу zone_objects
ALTER TABLE zone_objects 
ADD COLUMN IF NOT EXISTS color VARCHAR(7) DEFAULT '#ef4444';

-- 2. Добавляем комментарий к полю
COMMENT ON COLUMN zone_objects.color IS 'Hex color code for the zone object (e.g., #ff0000)';

-- 3. Обновляем существующие записи с дефолтными цветами
UPDATE zone_objects 
SET color = CASE 
  WHEN object_type = 'castle' THEN '#ef4444'  -- красный для замков
  WHEN object_type = 'mountain' THEN '#8b5cf6'  -- фиолетовый для спринтов
  WHEN object_type = 'house' THEN '#10b981'  -- зеленый для домов
  WHEN object_type = 'tower' THEN '#f59e0b'  -- оранжевый для башен
  WHEN object_type = 'garden' THEN '#22c55e'  -- зеленый для садов
  WHEN object_type = 'factory' THEN '#6b7280'  -- серый для фабрик
  WHEN object_type = 'helipad' THEN '#3b82f6'  -- синий для вертолетных площадок
  ELSE '#ef4444'  -- дефолтный красный
END
WHERE color IS NULL OR color = '#ef4444';

-- 4. Проверяем результат
SELECT id, object_type, title, color 
FROM zone_objects 
LIMIT 10;
