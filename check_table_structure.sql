-- Проверка структуры таблицы zone_object_links
SELECT 
  column_name, 
  data_type, 
  is_nullable, 
  column_default
FROM information_schema.columns 
WHERE table_name = 'zone_object_links' 
ORDER BY ordinal_position;

-- Покажем все связи (если есть)
SELECT * FROM zone_object_links LIMIT 5;
