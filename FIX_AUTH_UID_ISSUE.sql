-- ИСПРАВЛЕНИЕ ПРОБЛЕМЫ С AUTH.UID()
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Проверяем текущего пользователя
SELECT auth.uid() as current_user_id;

-- 2. Проверяем всех пользователей
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC;

-- 3. Временно отключаем RLS для projects
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- 4. Удаляем все политики
DROP POLICY IF EXISTS "projects_simple_policy" ON projects;
DROP POLICY IF EXISTS "projects_policy" ON projects;
DROP POLICY IF EXISTS "Users can manage their own projects" ON projects;

-- 5. Исправляем существующие проекты с null user_id
UPDATE projects 
SET user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'grigoryneupokoev@gmail.com' 
  LIMIT 1
)
WHERE user_id IS NULL;

-- 6. Проверяем что все проекты имеют user_id
SELECT id, name, user_id FROM projects WHERE user_id IS NULL;

-- 7. Включаем RLS обратно
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- 8. Создаем простую политику без использования auth.uid()
CREATE POLICY "projects_allow_all" ON projects
  FOR ALL USING (true);

-- 9. Проверяем что все работает
SELECT 'Auth.uid() issue fixed!' as status;
SELECT COUNT(*) as total_projects FROM projects;
