-- Функция для получения количества тикетов, назначенных пользователю в проекте
-- Выполните этот скрипт в Supabase SQL Editor

-- Создаем функцию для подсчета назначенных тикетов пользователю в проекте
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

-- Тестируем функцию (замените на ваши UUID)
-- SELECT get_user_assigned_tickets_count('your-project-uuid-here', 'your-user-uuid-here');
