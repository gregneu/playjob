-- ЧАСТЬ 4: СОЗДАНИЕ ТЕСТОВОГО ПРОЕКТА
-- Выполните эту часть в SQL Editor Supabase

-- Создаем тестовый проект для текущего пользователя
INSERT INTO projects (
  id,
  name,
  description,
  user_id,
  status,
  color,
  icon,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'PlayJob 3D Game',
  'Разработка 3D игры в стиле PlayJob с гексагональной картой',
  '520a6177-9457-4657-86f9-e7fa3737ce5d',
  'active',
  '#3B82F6',
  '🎮',
  NOW(),
  NOW()
);

-- Проверяем созданные таблицы
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('projects', 'zones', 'zone_cells', 'hex_cells', 'buildings')
ORDER BY table_name;

-- Проверяем созданный проект
SELECT id, name, user_id FROM projects; 