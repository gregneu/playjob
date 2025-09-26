-- Создание таблицы zone_objects
-- Выполните этот скрипт в SQL Editor вашего проекта Supabase

-- Создаем таблицу объектов зон
CREATE TABLE IF NOT EXISTS zone_objects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_id UUID NOT NULL REFERENCES zones(id) ON DELETE CASCADE,
  object_type VARCHAR(20) NOT NULL CHECK (object_type IN ('story', 'task', 'bug', 'test', 'mountain', 'castle', 'house', 'garden', 'factory', 'helipad')),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'done', 'backlog', 'ready_for_dev', 'ready_for_review', 'in_review', 'in_test', 'completed', 'blocked', 'paused', 'archived', 'dropped')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('v-low', 'low', 'medium', 'high', 'veryhigh')),
  story_points INTEGER DEFAULT 0,
  assignee_id UUID,
  q INTEGER NOT NULL, -- гексагональная координата q
  r INTEGER NOT NULL, -- гексагональная координата r
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(zone_id, q, r) -- только один объект на ячейку в зоне
);

-- Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_zone_objects_zone_id ON zone_objects(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_objects_coordinates ON zone_objects(q, r);
CREATE INDEX IF NOT EXISTS idx_zone_objects_status ON zone_objects(status);
CREATE INDEX IF NOT EXISTS idx_zone_objects_priority ON zone_objects(priority);

-- Отключаем RLS для таблицы zone_objects (временно для тестирования)
ALTER TABLE zone_objects DISABLE ROW LEVEL SECURITY;

-- Создаем триггер для автоматического обновления updated_at
CREATE TRIGGER update_zone_objects_updated_at BEFORE UPDATE ON zone_objects
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Проверяем созданную таблицу
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'zone_objects';

-- Проверяем структуру таблицы
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'zone_objects' 
ORDER BY ordinal_position; 