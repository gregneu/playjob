-- ОБНОВЛЕНИЕ ПОЛЬЗОВАТЕЛЯ ПРОЕКТА В SUPABASE
-- Выполните эти команды в SQL Editor Supabase

-- Сначала проверим, какие пользователи есть в системе
SELECT id, email FROM auth.users LIMIT 5;

-- Обновляем проект с правильным пользователем (замените 'your-user-id' на реальный ID)
UPDATE projects 
SET user_id = 'your-user-id' -- Замените на реальный ID пользователя
WHERE name = 'PlayJob 3D Game';

-- Или создаем новый проект с правильным пользователем
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
  'your-user-id', -- Замените на реальный ID пользователя
  'active',
  NOW(),
  NOW(),
  '#3B82F6',
  '🎮'
) ON CONFLICT DO NOTHING;

-- Проверяем результат
SELECT id, name, user_id FROM projects WHERE name = 'PlayJob 3D Game'; 