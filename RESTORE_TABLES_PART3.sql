-- ЧАСТЬ 3: ИНДЕКСЫ И НАСТРОЙКИ
-- Выполните эту часть в SQL Editor Supabase

-- Создаем индексы для производительности
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_zones_project_id ON zones(project_id);
CREATE INDEX idx_zone_cells_zone_id ON zone_cells(zone_id);
CREATE INDEX idx_hex_cells_project_id ON hex_cells(project_id);
CREATE INDEX idx_buildings_project_id ON buildings(project_id);

-- Отключаем RLS для всех таблиц
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;
ALTER TABLE zones DISABLE ROW LEVEL SECURITY;
ALTER TABLE zone_cells DISABLE ROW LEVEL SECURITY;
ALTER TABLE hex_cells DISABLE ROW LEVEL SECURITY;
ALTER TABLE buildings DISABLE ROW LEVEL SECURITY; 