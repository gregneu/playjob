-- СОЗДАНИЕ ТЕСТОВОГО ПРОЕКТА В SUPABASE
-- Выполните эти команды в SQL Editor Supabase

-- Сначала отключаем RLS для таблицы projects (временно)
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- Создаем тестовый проект
INSERT INTO projects (
  id,
  name,
  description,
  user_id,
  status,
  created_at,
  updated_at,
  color,
  icon
) VALUES (
  gen_random_uuid(),
  'PlayJob 3D Game',
  'Разработка 3D игры в стиле PlayJob с гексагональной картой',
  'test-user-id', -- временный ID пользователя
  'active',
  NOW(),
  NOW(),
  '#3B82F6',
  '🎮'
);

-- Проверяем, что проект создался
SELECT * FROM projects ORDER BY created_at DESC LIMIT 5;

-- Включаем RLS обратно
ALTER TABLE projects ENABLE ROW LEVEL SECURITY; 