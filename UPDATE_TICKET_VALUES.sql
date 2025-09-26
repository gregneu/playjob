-- Обновление ценности тикетов в зависимости от типа и приоритета
-- Выполните этот скрипт в Supabase SQL Editor

-- Обновляем ценность тикетов в зависимости от типа и приоритета
UPDATE object_tickets 
SET value = CASE 
  -- Story тикеты
  WHEN type = 'story' AND priority = 'veryhigh' THEN 5
  WHEN type = 'story' AND priority = 'high' THEN 4
  WHEN type = 'story' AND priority = 'medium' THEN 3
  WHEN type = 'story' AND priority = 'low' THEN 2
  WHEN type = 'story' AND priority = 'v-low' THEN 1
  
  -- Task тикеты
  WHEN type = 'task' AND priority = 'veryhigh' THEN 4
  WHEN type = 'task' AND priority = 'high' THEN 3
  WHEN type = 'task' AND priority = 'medium' THEN 2
  WHEN type = 'task' AND priority = 'low' THEN 1
  WHEN type = 'task' AND priority = 'v-low' THEN 1
  
  -- Bug тикеты (обычно более ценные)
  WHEN type = 'bug' AND priority = 'veryhigh' THEN 6
  WHEN type = 'bug' AND priority = 'high' THEN 5
  WHEN type = 'bug' AND priority = 'medium' THEN 4
  WHEN type = 'bug' AND priority = 'low' THEN 3
  WHEN type = 'bug' AND priority = 'v-low' THEN 2
  
  -- Test тикеты
  WHEN type = 'test' AND priority = 'veryhigh' THEN 3
  WHEN type = 'test' AND priority = 'high' THEN 2
  WHEN type = 'test' AND priority = 'medium' THEN 2
  WHEN type = 'test' AND priority = 'low' THEN 1
  WHEN type = 'test' AND priority = 'v-low' THEN 1
  
  ELSE 1
END;

-- Проверяем результат
SELECT 
  type,
  priority,
  value,
  COUNT(*) as count,
  SUM(value) as total_value
FROM object_tickets 
GROUP BY type, priority, value
ORDER BY type, priority;

-- Проверяем общую статистику
SELECT 
  COUNT(*) as total_tickets,
  COUNT(*) FILTER (WHERE status = 'done') as done_tickets,
  SUM(value) FILTER (WHERE status = 'done') as total_diamonds,
  SUM(value) FILTER (WHERE status = 'done' AND type = 'story') as story_diamonds,
  SUM(value) FILTER (WHERE status = 'done' AND type = 'task') as task_diamonds,
  SUM(value) FILTER (WHERE status = 'done' AND type = 'bug') as bug_diamonds,
  SUM(value) FILTER (WHERE status = 'done' AND type = 'test') as test_diamonds
FROM object_tickets;
