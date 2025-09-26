-- Быстрое исправление RLS политики для drag & drop
-- Выполните этот SQL в Supabase SQL Editor

-- Удаляем старую политику
DROP POLICY IF EXISTS "tickets_update" ON object_tickets;

-- Создаем новую политику с правильной логикой
CREATE POLICY "tickets_update" ON object_tickets
  FOR UPDATE USING (
    zone_object_id IN (
      SELECT o.id
      FROM zone_objects o
      JOIN zones z ON z.id = o.zone_id
      JOIN projects p ON p.id = z.project_id
      WHERE p.user_id = auth.uid()
    )
  ) WITH CHECK (
    zone_object_id IN (
      SELECT o.id
      FROM zone_objects o
      JOIN zones z ON z.id = o.zone_id
      JOIN projects p ON p.id = z.project_id
      WHERE p.user_id = auth.uid()
    )
  );
