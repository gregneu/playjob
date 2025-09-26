-- Проверка и исправление схемы таблицы zone_objects
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Проверяем текущую схему таблицы zone_objects
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'zone_objects'
ORDER BY ordinal_position;

-- 2. Проверяем ограничения для поля status
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'zone_objects'::regclass
AND contype = 'c'; -- check constraints

-- 3. Проверяем значения в поле status
SELECT DISTINCT status, COUNT(*) as count
FROM zone_objects
GROUP BY status;

-- 4. Если есть проблемы с ограничениями, удаляем их
-- (выполните только если есть проблемные ограничения)
-- ALTER TABLE zone_objects DROP CONSTRAINT IF EXISTS zone_objects_status_check;

-- 5. Обновляем схему для поля status (если нужно)
ALTER TABLE zone_objects 
ALTER COLUMN status TYPE text,
ALTER COLUMN status SET DEFAULT 'open';

-- 6. Добавляем проверочное ограничение для статусов
ALTER TABLE zone_objects 
DROP CONSTRAINT IF EXISTS zone_objects_status_check;

ALTER TABLE zone_objects 
ADD CONSTRAINT zone_objects_status_check 
CHECK (status IN ('open', 'in_progress', 'done'));

-- 7. Обновляем схему для поля priority (если нужно)
ALTER TABLE zone_objects 
ALTER COLUMN priority TYPE text,
ALTER COLUMN priority SET DEFAULT 'medium';

-- 8. Добавляем проверочное ограничение для приоритетов
ALTER TABLE zone_objects 
DROP CONSTRAINT IF EXISTS zone_objects_priority_check;

ALTER TABLE zone_objects 
ADD CONSTRAINT zone_objects_priority_check 
CHECK (priority IN ('v-low', 'low', 'medium', 'high', 'veryhigh'));

-- 9. Проверяем RLS политики
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'zone_objects';

-- 10. Если RLS включен, убеждаемся что политики позволяют обновление
-- (выполните только если RLS блокирует обновления)
/*
-- Пример политики для обновления (адаптируйте под ваши нужды)
CREATE POLICY "Users can update their own zone objects" ON zone_objects
FOR UPDATE USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);
*/

-- 11. Проверяем финальную схему
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'zone_objects'
AND column_name IN ('status', 'priority', 'title', 'description', 'story_points')
ORDER BY ordinal_position;

-- 12. Тестовое обновление
-- (выполните только для тестирования)
/*
UPDATE zone_objects 
SET status = 'done', 
    priority = 'high',
    updated_at = NOW()
WHERE id = (SELECT id FROM zone_objects LIMIT 1)
RETURNING id, status, priority, updated_at;
*/
