-- Исправление RLS политик для таблицы zones
-- Выполните этот скрипт в SQL Editor вашего проекта Supabase

-- Сначала удаляем существующие политики для zones
DROP POLICY IF EXISTS "Users can view zones in their projects" ON zones;
DROP POLICY IF EXISTS "Users can create zones in their projects" ON zones;
DROP POLICY IF EXISTS "Users can update zones in their projects" ON zones;
DROP POLICY IF EXISTS "Users can delete zones in their projects" ON zones;

-- Создаем новые, более простые политики для zones
-- Политика для просмотра зон - разрешаем всем аутентифицированным пользователям
CREATE POLICY "Enable read access for all users" ON zones
  FOR SELECT USING (true);

-- Политика для создания зон - разрешаем всем аутентифицированным пользователям
CREATE POLICY "Enable insert access for all users" ON zones
  FOR INSERT WITH CHECK (true);

-- Политика для обновления зон - разрешаем всем аутентифицированным пользователям
CREATE POLICY "Enable update access for all users" ON zones
  FOR UPDATE USING (true);

-- Политика для удаления зон - разрешаем всем аутентифицированным пользователям
CREATE POLICY "Enable delete access for all users" ON zones
  FOR DELETE USING (true);

-- Также исправляем политики для zone_cells
DROP POLICY IF EXISTS "Users can view zone cells in their projects" ON zone_cells;
DROP POLICY IF EXISTS "Users can create zone cells in their projects" ON zone_cells;
DROP POLICY IF EXISTS "Users can delete zone cells in their projects" ON zone_cells;

-- Создаем новые политики для zone_cells
CREATE POLICY "Enable read access for all users" ON zone_cells
  FOR SELECT USING (true);

CREATE POLICY "Enable insert access for all users" ON zone_cells
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Enable delete access for all users" ON zone_cells
  FOR DELETE USING (true);

-- Проверяем, что RLS включен
ALTER TABLE zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE zone_cells ENABLE ROW LEVEL SECURITY;

-- Проверяем статус политик
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename IN ('zones', 'zone_cells')
ORDER BY tablename, policyname; 