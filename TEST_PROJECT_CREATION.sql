-- ТЕСТ СОЗДАНИЯ ПРОЕКТА
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Проверяем текущего пользователя
SELECT auth.uid() as current_user_id;

-- 2. Получаем ID пользователя из auth.users
SELECT id as user_id FROM auth.users WHERE email = 'grigoryneupokoev@gmail.com' LIMIT 1;

-- 3. Пробуем создать тестовый проект с конкретным user_id
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
  'Test Project',
  'Test Description',
  '#3B82F6',
  '🎯',
  (SELECT id FROM auth.users WHERE email = 'grigoryneupokoev@gmail.com' LIMIT 1),
  'active',
  NOW(),
  NOW()
) RETURNING *;

-- 3. Проверяем что проект создался
SELECT * FROM projects WHERE name = 'Test Project';

-- 4. Удаляем тестовый проект
DELETE FROM projects WHERE name = 'Test Project';

SELECT 'Test completed successfully!' as status;
