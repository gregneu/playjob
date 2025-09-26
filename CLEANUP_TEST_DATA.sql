-- ОЧИСТКА ТЕСТОВЫХ ДАННЫХ
-- Запустите этот скрипт в Supabase SQL Editor для удаления тестовых проектов

-- 1. Удаляем тестовые тикеты
DELETE FROM object_tickets 
WHERE zone_object_id LIKE 'story_%' 
   OR zone_object_id LIKE 'task_%' 
   OR zone_object_id LIKE 'bug_%' 
   OR zone_object_id LIKE 'test_%'
   OR zone_object_id IN (
     SELECT id FROM zone_objects 
     WHERE zone_id IN (
       SELECT id FROM zones 
       WHERE project_id = '520a6177-9457-4657-86f9-e7fa3737ce5d'
     )
   );

-- 2. Удаляем объекты зон
DELETE FROM zone_objects 
WHERE zone_id IN (
  SELECT id FROM zones 
  WHERE project_id = '520a6177-9457-4657-86f9-e7fa3737ce5d'
);

-- 3. Удаляем зоны
DELETE FROM zones 
WHERE project_id = '520a6177-9457-4657-86f9-e7fa3737ce5d';

-- 4. Удаляем тестовые проекты
DELETE FROM projects 
WHERE name IN (
  'Test Project with Tickets',
  'Test Hexagonal Zones Project'
);

-- 5. Проверяем что все удалено
SELECT 'Test data cleaned up successfully!' as status;
SELECT COUNT(*) as remaining_test_tickets FROM object_tickets WHERE zone_object_id LIKE 'story_%' OR zone_object_id LIKE 'task_%' OR zone_object_id LIKE 'bug_%' OR zone_object_id LIKE 'test_%';
SELECT COUNT(*) as remaining_test_projects FROM projects WHERE name LIKE 'Test%';
