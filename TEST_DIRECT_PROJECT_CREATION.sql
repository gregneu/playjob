-- ТЕСТ ПРЯМОГО СОЗДАНИЯ ПРОЕКТА
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Проверяем текущего пользователя
SELECT auth.uid() as current_user_id;

-- 2. Проверяем всех пользователей
SELECT id, email FROM auth.users ORDER BY created_at DESC LIMIT 5;

-- 3. Пробуем создать проект напрямую
INSERT INTO projects (
  name,
  description,
  color,
  icon,
  user_id,
  status,
  created_at,
  updated_at
) VALUES (
  'Direct Test Project',
  'Test Description',
  '#3B82F6',
  '🎯',
  '520a6177-9457-4657-86f9-e7fa3737ce5d',
  'active',
  NOW(),
  NOW()
) RETURNING *;

-- 4. Проверяем что проект создался
SELECT * FROM projects WHERE name = 'Direct Test Project';

-- 5. Проверяем что НЕ создались project_members
SELECT * FROM project_members WHERE project_id = (
  SELECT id FROM projects WHERE name = 'Direct Test Project'
);

-- 6. Удаляем тестовый проект
DELETE FROM projects WHERE name = 'Direct Test Project';

SELECT 'Direct project creation test completed!' as status;
