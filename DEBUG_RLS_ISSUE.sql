-- Диагностика RLS проблемы для object_tickets
-- Выполните этот SQL в Supabase SQL Editor для диагностики

-- 1. Проверяем текущие RLS политики для object_tickets
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
WHERE tablename = 'object_tickets';

-- 2. Проверяем конкретный тикет, который не обновляется
SELECT 
  ot.id,
  ot.zone_object_id,
  ot.title,
  zo.zone_id,
  z.name as zone_name,
  p.id as project_id,
  p.user_id as project_owner
FROM object_tickets ot
JOIN zone_objects zo ON zo.id = ot.zone_object_id
JOIN zones z ON z.id = zo.zone_id
JOIN projects p ON p.id = z.project_id
WHERE ot.id = '0526b979-de4d-41b7-a3c6-eeed817a4b71';

-- 3. Проверяем, какие зоны принадлежат текущему пользователю
SELECT 
  z.id as zone_id,
  z.name as zone_name,
  p.id as project_id,
  p.user_id as project_owner,
  auth.uid() as current_user
FROM zones z
JOIN projects p ON p.id = z.project_id
WHERE p.user_id = auth.uid();

-- 4. Проверяем, какие zone_objects принадлежат текущему пользователю
SELECT 
  zo.id as zone_object_id,
  zo.title as object_title,
  z.id as zone_id,
  z.name as zone_name,
  p.id as project_id,
  p.user_id as project_owner
FROM zone_objects zo
JOIN zones z ON z.id = zo.zone_id
JOIN projects p ON p.id = z.project_id
WHERE p.user_id = auth.uid();
