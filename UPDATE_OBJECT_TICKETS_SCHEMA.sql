-- Расширение схемы таблицы object_tickets для поддержки всех полей тикета
-- Выполните этот скрипт в SQL Editor вашего проекта Supabase

-- Добавляем недостающие поля в таблицу object_tickets
ALTER TABLE object_tickets 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS links JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS comments JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]';

-- Обновляем существующие записи, устанавливая пустые массивы для новых полей
UPDATE object_tickets 
SET 
  checklist = '[]'::jsonb,
  links = '[]'::jsonb,
  comments = '[]'::jsonb,
  attachments = '[]'::jsonb
WHERE checklist IS NULL 
   OR links IS NULL 
   OR comments IS NULL 
   OR attachments IS NULL;

-- Создаем индексы для улучшения производительности поиска по новым полям
CREATE INDEX IF NOT EXISTS idx_object_tickets_checklist ON object_tickets USING GIN (checklist);
CREATE INDEX IF NOT EXISTS idx_object_tickets_links ON object_tickets USING GIN (links);
CREATE INDEX IF NOT EXISTS idx_object_tickets_comments ON object_tickets USING GIN (comments);
CREATE INDEX IF NOT EXISTS idx_object_tickets_attachments ON object_tickets USING GIN (attachments);

-- Проверяем структуру таблицы
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'object_tickets' 
ORDER BY ordinal_position;

-- Проверяем существующие записи
SELECT id, title, description, checklist, links, comments, attachments, created_at
FROM object_tickets 
LIMIT 5;
