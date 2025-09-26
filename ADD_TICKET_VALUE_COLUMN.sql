-- Добавление поля value (ценность) в таблицу object_tickets
-- Выполните этот скрипт в Supabase SQL Editor

-- Добавляем поле value для хранения ценности тикета в алмазах
ALTER TABLE object_tickets 
ADD COLUMN IF NOT EXISTS value INTEGER DEFAULT 1 CHECK (value > 0);

-- Обновляем существующие записи, устанавливая значение по умолчанию
UPDATE object_tickets 
SET value = 1 
WHERE value IS NULL;

-- Создаем индекс для оптимизации запросов по ценности
CREATE INDEX IF NOT EXISTS idx_object_tickets_value ON object_tickets(value);

-- Проверяем структуру таблицы
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'object_tickets' 
ORDER BY ordinal_position;

-- Проверяем существующие записи с новым полем
SELECT id, title, type, priority, value, status, created_at
FROM object_tickets 
LIMIT 5;
