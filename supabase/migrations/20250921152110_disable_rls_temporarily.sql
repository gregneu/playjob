-- Временное отключение RLS для object_tickets для тестирования drag & drop
-- ВНИМАНИЕ: Это временное решение только для тестирования!

-- Отключаем RLS для object_tickets
ALTER TABLE object_tickets DISABLE ROW LEVEL SECURITY;

-- Добавляем комментарий для напоминания
COMMENT ON TABLE object_tickets IS 'RLS temporarily disabled for drag & drop testing - ENABLE AFTER TESTING!';
