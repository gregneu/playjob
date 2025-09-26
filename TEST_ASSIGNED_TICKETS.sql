-- Тестовый скрипт для проверки функции подсчета назначенных тикетов
-- Выполните этот скрипт в Supabase SQL Editor

-- 1. Сначала создаем функцию (если еще не создана)
CREATE OR REPLACE FUNCTION get_user_assigned_tickets_count(project_uuid UUID, user_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  assigned_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO assigned_count
  FROM object_tickets ot
  JOIN zone_objects zo ON zo.id = ot.zone_object_id
  JOIN zones z ON z.id = zo.zone_id
  WHERE z.project_id = project_uuid
    AND ot.assignee_id = user_uuid
    AND ot.status != 'done'; -- Только активные тикеты (не завершенные)
  
  RETURN COALESCE(assigned_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Проверяем структуру таблиц
SELECT 'object_tickets' as table_name, COUNT(*) as count FROM object_tickets
UNION ALL
SELECT 'zone_objects' as table_name, COUNT(*) as count FROM zone_objects
UNION ALL
SELECT 'zones' as table_name, COUNT(*) as count FROM zones;

-- 3. Показываем примеры данных
SELECT 
  'object_tickets sample' as info,
  ot.id,
  ot.assignee_id,
  ot.status,
  ot.type,
  zo.id as zone_object_id,
  z.id as zone_id,
  z.project_id
FROM object_tickets ot
JOIN zone_objects zo ON zo.id = ot.zone_object_id
JOIN zones z ON z.id = zo.zone_id
LIMIT 5;

-- 4. Тестируем функцию с реальными данными
-- Замените UUID на ваши реальные значения
SELECT 
  'Test function' as info,
  get_user_assigned_tickets_count(
    (SELECT id FROM zones LIMIT 1), 
    (SELECT assignee_id FROM object_tickets WHERE assignee_id IS NOT NULL LIMIT 1)
  ) as assigned_count;
