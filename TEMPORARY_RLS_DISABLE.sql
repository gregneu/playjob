-- Временное отключение RLS для отладки
-- ВНИМАНИЕ: Это только для отладки! Не используйте в продакшене!

-- Отключаем RLS для всех таблиц проекта
ALTER TABLE zones DISABLE ROW LEVEL SECURITY;
ALTER TABLE zone_cells DISABLE ROW LEVEL SECURITY;
ALTER TABLE hex_cells DISABLE ROW LEVEL SECURITY;
ALTER TABLE buildings DISABLE ROW LEVEL SECURITY;
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- Проверяем статус RLS
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('zones', 'zone_cells', 'hex_cells', 'buildings', 'projects')
ORDER BY tablename; 