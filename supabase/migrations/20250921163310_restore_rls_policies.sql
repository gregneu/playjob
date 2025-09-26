-- Восстановление RLS политик для object_tickets после успешного тестирования drag & drop
-- Теперь, когда логика исправлена, можем безопасно включить RLS обратно

-- Включаем RLS обратно
ALTER TABLE object_tickets ENABLE ROW LEVEL SECURITY;

-- Удаляем старую политику и создаем правильную политику UPDATE с проверкой как старого, так и нового значения
DROP POLICY IF EXISTS "tickets_update" ON object_tickets;
CREATE POLICY "tickets_update" ON object_tickets
  FOR UPDATE USING (
    -- USING: проверяем старое значение zone_object_id
    zone_object_id IN (
      SELECT o.id
      FROM zone_objects o
      JOIN zones z ON z.id = o.zone_id
      JOIN projects p ON p.id = z.project_id
      WHERE p.user_id = auth.uid()
    )
  ) WITH CHECK (
    -- WITH CHECK: проверяем новое значение zone_object_id
    zone_object_id IN (
      SELECT o.id
      FROM zone_objects o
      JOIN zones z ON z.id = o.zone_id
      JOIN projects p ON p.id = z.project_id
      WHERE p.user_id = auth.uid()
    )
  );

-- Удаляем комментарий о временном отключении
COMMENT ON TABLE object_tickets IS 'RLS enabled with proper policies for drag & drop functionality';
