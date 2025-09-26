-- Создание таблицы sprints если она не существует
-- Выполните этот скрипт в SQL Editor Supabase

-- Создаем таблицу sprints
CREATE TABLE IF NOT EXISTS public.sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  zone_object_id UUID REFERENCES public.zone_objects(id) ON DELETE SET NULL,
  name TEXT NOT NULL DEFAULT 'Sprint',
  weeks INTEGER NOT NULL DEFAULT 2 CHECK (weeks BETWEEN 1 AND 4),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','completed')),
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Создаем индексы
CREATE INDEX IF NOT EXISTS idx_sprints_project ON public.sprints(project_id);
CREATE INDEX IF NOT EXISTS idx_sprints_zone_object ON public.sprints(zone_object_id);
CREATE INDEX IF NOT EXISTS idx_sprints_status ON public.sprints(status);

-- Отключаем RLS временно для тестирования
ALTER TABLE public.sprints DISABLE ROW LEVEL SECURITY;

-- Создаем триггер для обновления updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sprints_touch ON public.sprints;
CREATE TRIGGER trg_sprints_touch BEFORE UPDATE ON public.sprints
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Проверяем созданную таблицу
SELECT 'Sprints table created successfully' as status;
SELECT COUNT(*) as sprint_count FROM public.sprints;
