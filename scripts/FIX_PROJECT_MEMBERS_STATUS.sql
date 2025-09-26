-- ИСПРАВЛЕНИЕ СТАТУСА УЧАСТНИКОВ ПРОЕКТОВ
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Проверяем текущий статус участников
SELECT '=== CURRENT PROJECT MEMBERS STATUS ===' as info;
SELECT 
  pm.project_id,
  pm.user_id,
  pm.role,
  pm.status,
  p.name as project_name,
  pr.email as user_email,
  pr.full_name as user_full_name
FROM project_members pm
JOIN projects p ON pm.project_id = p.id
JOIN profiles pr ON pm.user_id = pr.id
ORDER BY p.created_at DESC;

-- 2. Обновляем статус создателей проектов на 'accepted'
UPDATE project_members 
SET status = 'accepted'
WHERE role = 'owner' AND status = 'pending';

-- 3. Обновляем статус всех участников на 'accepted' (если они были приглашены)
UPDATE project_members 
SET status = 'accepted'
WHERE status = 'pending';

-- 4. Проверяем результат обновления
SELECT '=== UPDATED PROJECT MEMBERS STATUS ===' as info;
SELECT 
  pm.project_id,
  pm.user_id,
  pm.role,
  pm.status,
  p.name as project_name,
  pr.email as user_email,
  pr.full_name as user_full_name
FROM project_members pm
JOIN projects p ON pm.project_id = p.id
JOIN profiles pr ON pm.user_id = pr.id
ORDER BY p.created_at DESC;

-- 5. Изменяем значение по умолчанию для поля status
ALTER TABLE project_members 
ALTER COLUMN status SET DEFAULT 'accepted';

-- 6. Добавляем CHECK ограничение для поля status
ALTER TABLE project_members DROP CONSTRAINT IF EXISTS project_members_status_check;
ALTER TABLE project_members ADD CONSTRAINT project_members_status_check 
  CHECK (status IN ('pending', 'accepted', 'declined'));

-- 7. Проверяем финальную структуру таблицы
SELECT '=== FINAL TABLE STRUCTURE ===' as info;
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'project_members'
ORDER BY ordinal_position;

-- 8. Проверяем количество участников по статусам
SELECT '=== MEMBERS COUNT BY STATUS ===' as info;
SELECT 
  status,
  COUNT(*) as count
FROM project_members 
GROUP BY status
ORDER BY status;
