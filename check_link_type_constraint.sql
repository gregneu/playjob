-- Проверка ограничения для link_type
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'zone_object_links'::regclass 
AND contype = 'c';

-- Проверка текущих значений link_type в таблице
SELECT DISTINCT link_type FROM zone_object_links;
