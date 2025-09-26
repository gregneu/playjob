-- Функция для получения количества алмазов проекта
-- Алмазы = сумма ценности всех завершенных тикетов в проекте (всех пользователей)
-- Выполните этот скрипт в Supabase SQL Editor

-- Создаем функцию для подсчета алмазов проекта
CREATE OR REPLACE FUNCTION get_project_diamonds(project_uuid UUID)
RETURNS INTEGER AS $$
DECLARE
  total_diamonds INTEGER;
BEGIN
  SELECT COALESCE(SUM(ot.value), 0) INTO total_diamonds
  FROM object_tickets ot
  JOIN zone_objects zo ON zo.id = ot.zone_object_id
  JOIN zones z ON z.id = zo.zone_id
  WHERE z.project_id = project_uuid
    AND ot.status = 'done';
  
  RETURN total_diamonds;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Создаем функцию для получения статистики по типам тикетов проекта
CREATE OR REPLACE FUNCTION get_project_ticket_stats(project_uuid UUID)
RETURNS TABLE(
  total_tickets INTEGER,
  done_tickets INTEGER,
  total_diamonds INTEGER,
  story_diamonds INTEGER,
  task_diamonds INTEGER,
  bug_diamonds INTEGER,
  test_diamonds INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_tickets,
    COUNT(*) FILTER (WHERE ot.status = 'done')::INTEGER as done_tickets,
    COALESCE(SUM(ot.value) FILTER (WHERE ot.status = 'done'), 0)::INTEGER as total_diamonds,
    COALESCE(SUM(ot.value) FILTER (WHERE ot.status = 'done' AND ot.type = 'story'), 0)::INTEGER as story_diamonds,
    COALESCE(SUM(ot.value) FILTER (WHERE ot.status = 'done' AND ot.type = 'task'), 0)::INTEGER as task_diamonds,
    COALESCE(SUM(ot.value) FILTER (WHERE ot.status = 'done' AND ot.type = 'bug'), 0)::INTEGER as bug_diamonds,
    COALESCE(SUM(ot.value) FILTER (WHERE ot.status = 'done' AND ot.type = 'test'), 0)::INTEGER as test_diamonds
  FROM object_tickets ot
  JOIN zone_objects zo ON zo.id = ot.zone_object_id
  JOIN zones z ON z.id = zo.zone_id
  WHERE z.project_id = project_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Тестируем функции (замените на ваш UUID)
-- SELECT get_project_diamonds('your-project-uuid-here');
-- SELECT * FROM get_project_ticket_stats('your-project-uuid-here');
