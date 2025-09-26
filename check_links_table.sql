-- Проверка существования таблицы zone_object_links
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'zone_object_links'
) as table_exists;

-- Если таблица существует, покажем её структуру
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'zone_object_links' 
ORDER BY ordinal_position;

-- Покажем все связи (если есть)
SELECT * FROM zone_object_links LIMIT 10;
