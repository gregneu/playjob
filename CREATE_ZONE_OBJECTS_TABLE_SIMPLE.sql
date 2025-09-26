-- Упрощенный скрипт для создания таблицы zone_objects
-- Выполните этот скрипт в SQL Editor вашего проекта Supabase

-- Создаем таблицу объектов зон (если не существует)
CREATE TABLE IF NOT EXISTS zone_objects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_id UUID NOT NULL,
  object_type VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'open',
  priority VARCHAR(20) DEFAULT 'medium',
  story_points INTEGER DEFAULT 0,
  assignee_id UUID,
  q INTEGER NOT NULL,
  r INTEGER NOT NULL,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_zone_objects_zone_id ON zone_objects(zone_id);
CREATE INDEX IF NOT EXISTS idx_zone_objects_coordinates ON zone_objects(q, r);
CREATE INDEX IF NOT EXISTS idx_zone_objects_status ON zone_objects(status);
CREATE INDEX IF NOT EXISTS idx_zone_objects_priority ON zone_objects(priority);

-- Отключаем RLS для таблицы zone_objects (временно для тестирования)
ALTER TABLE zone_objects DISABLE ROW LEVEL SECURITY;

-- Создаем триггер для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

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
