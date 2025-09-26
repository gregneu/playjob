-- ПОЛУЧЕНИЕ ID ПРОЕКТА ИЗ БАЗЫ ДАННЫХ
-- Выполните эти команды в SQL Editor Supabase

-- Проверяем, есть ли проекты в таблице
SELECT id, name, created_at FROM projects ORDER BY created_at DESC;

-- Если проектов нет, создаем тестовый проект
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
  'test-user-id',
  'active',
  NOW(),
  NOW(),
  '#3B82F6',
  '🎮'
) ON CONFLICT DO NOTHING;

-- Получаем ID созданного проекта
SELECT id, name FROM projects WHERE name = 'PlayJob 3D Game' LIMIT 1; 