-- Проверяем существование таблицы object_tickets
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('object_tickets', 'zone_objects', 'projects', 'project_members')
ORDER BY table_name;

-- Проверяем структуру таблицы object_tickets (если она существует)
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'object_tickets'
ORDER BY ordinal_position;
