-- Тестирование создания объектов в зонах
-- Выполните этот скрипт в SQL Editor вашего проекта Supabase

-- 1. Проверяем, что таблица zone_objects существует
SELECT 
  table_name,
  table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'zone_objects';

-- 2. Проверяем структуру таблицы
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'zone_objects' 
ORDER BY ordinal_position;

-- 3. Проверяем ограничения для object_type
SELECT 
  constraint_name,
  check_clause
FROM information_schema.check_constraints 
WHERE constraint_schema = 'public'
  AND constraint_name = 'zone_objects_object_type_check';

-- 4. Создаем тестовую зону (если таблица zones существует)
INSERT INTO zones (id, name, color, project_id, created_by) 
VALUES (
  gen_random_uuid(),
  'Test Zone',
  '#FF6B6B',
  (SELECT id FROM projects LIMIT 1),
  (SELECT id FROM auth.users LIMIT 1)
) ON CONFLICT DO NOTHING;

-- 5. Создаем тестовые объекты в зоне
INSERT INTO zone_objects (
  zone_id,
  object_type,
  title,
  description,
  status,
  priority,
  story_points,
  q,
  r
) VALUES 
-- Story объект
(
  (SELECT id FROM zones WHERE name = 'Test Zone' LIMIT 1),
  'story',
  'User Authentication Story',
  'Implement user authentication system',
  'open',
  'high',
  8,
  1,
  1
),
-- Task объект
(
  (SELECT id FROM zones WHERE name = 'Test Zone' LIMIT 1),
  'task',
  'Database Setup Task',
  'Set up PostgreSQL database',
  'in_progress',
  'medium',
  5,
  2,
  1
),
-- Bug объект
(
  (SELECT id FROM zones WHERE name = 'Test Zone' LIMIT 1),
  'bug',
  'Login Button Bug',
  'Login button not responding',
  'open',
  'critical',
  3,
  1,
  2
),
-- Test объект
(
  (SELECT id FROM zones WHERE name = 'Test Zone' LIMIT 1),
  'test',
  'API Integration Test',
  'Test API endpoints',
  'done',
  'low',
  2,
  2,
  2
)
ON CONFLICT (zone_id, q, r) DO NOTHING;

-- 6. Проверяем созданные объекты
SELECT 
  id,
  object_type,
  title,
  status,
  priority,
  story_points,
  q,
  r,
  created_at
FROM zone_objects 
ORDER BY created_at DESC;

-- 7. Проверяем статистику по типам объектов
SELECT 
  object_type,
  COUNT(*) as count,
  AVG(story_points) as avg_story_points
FROM zone_objects 
GROUP BY object_type
ORDER BY count DESC;

-- 8. Проверяем статистику по статусам
SELECT 
  status,
  COUNT(*) as count
FROM zone_objects 
GROUP BY status
ORDER BY count DESC;

-- 9. Проверяем статистику по приоритетам
SELECT 
  priority,
  COUNT(*) as count
FROM zone_objects 
GROUP BY priority
ORDER BY count DESC; 