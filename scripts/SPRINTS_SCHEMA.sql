-- SPRINTS AND ARCHIVE SCHEMA
-- Run in Supabase SQL editor

-- 1) Projects: add crystals counter (gems)
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS crystals INTEGER NOT NULL DEFAULT 0;

-- 2) Sprints table
CREATE TABLE IF NOT EXISTS public.sprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  zone_object_id UUID REFERENCES public.zone_objects(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  weeks INTEGER NOT NULL DEFAULT 2 CHECK (weeks BETWEEN 1 AND 4),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','completed')),
  planned_ticket_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
  done_ticket_ids UUID[] NOT NULL DEFAULT '{}'::uuid[],
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sprints_project ON public.sprints(project_id);

ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;

-- RLS: members of project can work with its sprints
DROP POLICY IF EXISTS sprints_select ON public.sprints;
CREATE POLICY sprints_select ON public.sprints
  FOR SELECT USING (
    public.is_project_member(project_id, auth.uid())
  );

DROP POLICY IF EXISTS sprints_insert ON public.sprints;
CREATE POLICY sprints_insert ON public.sprints
  FOR INSERT WITH CHECK (
    public.is_project_member(project_id, auth.uid())
  );

DROP POLICY IF EXISTS sprints_update ON public.sprints;
CREATE POLICY sprints_update ON public.sprints
  FOR UPDATE USING (
    public.is_project_member(project_id, auth.uid())
  );

-- 3) Tickets: add board column, value, archived marker and sprint_id
ALTER TABLE public.object_tickets
  ADD COLUMN IF NOT EXISTS board_column TEXT NOT NULL DEFAULT 'planned' CHECK (board_column IN ('planned','in_sprint','archived')),
  ADD COLUMN IF NOT EXISTS value INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sprint_id UUID;

-- Add FK after sprints exist
DO $$ BEGIN
  ALTER TABLE public.object_tickets
    ADD CONSTRAINT object_tickets_sprint_fk
    FOREIGN KEY (sprint_id) REFERENCES public.sprints(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 4) Helper function to touch updated_at
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sprints_touch ON public.sprints;
CREATE TRIGGER trg_sprints_touch BEFORE UPDATE ON public.sprints
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 5) Complete sprint function: archive items and award crystals
CREATE OR REPLACE FUNCTION public.complete_sprint(p_sprint_id UUID)
RETURNS TABLE(archived_count INTEGER) 
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_project_id UUID;
  v_count INTEGER := 0;
BEGIN
  SELECT project_id INTO v_project_id FROM public.sprints WHERE id = p_sprint_id;
  IF v_project_id IS NULL THEN
    RETURN QUERY SELECT 0; RETURN;
  END IF;

  -- Archive in-sprint tickets
  UPDATE public.object_tickets
  SET board_column = 'archived', archived_at = now()
  WHERE sprint_id = p_sprint_id AND board_column = 'in_sprint';
  GET DIAGNOSTICS v_count = ROW_COUNT;

  -- Mark sprint completed
  UPDATE public.sprints SET status = 'completed', ended_at = now() WHERE id = p_sprint_id;

  -- Award crystals to the project
  UPDATE public.projects SET crystals = coalesce(crystals,0) + v_count WHERE id = v_project_id;

  RETURN QUERY SELECT v_count;
END;$$;

