-- Удаляем поле color из таблицы zone_objects
-- Цвет зоны должен храниться только в таблице zones.color

-- Сначала обновляем все zone_objects, чтобы их цвет соответствовал цвету зоны
UPDATE zone_objects 
SET color = zones.color
FROM zones 
WHERE zone_objects.zone_id = zones.id;

-- Удаляем поле color из zone_objects
ALTER TABLE zone_objects DROP COLUMN IF EXISTS color;

-- Добавляем комментарий для ясности
COMMENT ON TABLE zone_objects IS 'Objects within zones. Zone color is stored in zones.color, not here.';
