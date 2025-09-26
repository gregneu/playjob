-- Обновление типов приоритетов для тикетов
-- Добавляем поддержку 'v-low' и 'veryhigh' вместо 'critical'

-- Сначала удаляем старое ограничение
ALTER TABLE object_tickets DROP CONSTRAINT IF EXISTS object_tickets_priority_check;

-- Добавляем новое ограничение с поддержкой всех типов приоритетов
ALTER TABLE object_tickets ADD CONSTRAINT object_tickets_priority_check 
CHECK (priority IN ('v-low', 'low', 'medium', 'high', 'veryhigh'));

-- Обновляем существующие записи с 'critical' на 'veryhigh'
UPDATE object_tickets 
SET priority = 'veryhigh' 
WHERE priority = 'critical';

-- Проверяем результат
SELECT DISTINCT priority FROM object_tickets ORDER BY priority;
