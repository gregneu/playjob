-- Adds planned_ticket_ids and done_ticket_ids columns to sprints table for ghost ticket persistence
ALTER TABLE public.sprints
  ADD COLUMN IF NOT EXISTS planned_ticket_ids UUID[] NOT NULL DEFAULT '{}'::uuid[];

ALTER TABLE public.sprints
  ADD COLUMN IF NOT EXISTS done_ticket_ids UUID[] NOT NULL DEFAULT '{}'::uuid[];

-- Ensure existing rows use array defaults instead of NULL
UPDATE public.sprints
SET planned_ticket_ids = '{}'::uuid[]
WHERE planned_ticket_ids IS NULL;

UPDATE public.sprints
SET done_ticket_ids = '{}'::uuid[]
WHERE done_ticket_ids IS NULL;
