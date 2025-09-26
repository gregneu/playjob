-- Исправление RLS политики для object_tickets таблицы
-- Проблема: политика tickets_update проверяет только старое значение zone_object_id
-- Решение: разрешить UPDATE если либо старое, либо новое значение zone_object_id принадлежит пользователю

-- Удаляем старую политику
DROP POLICY IF EXISTS "tickets_update" ON object_tickets;

-- Создаем новую политику, которая разрешает UPDATE если:
-- 1. Старое значение zone_object_id принадлежит пользователю (для проверки USING)
-- 2. Новое значение zone_object_id принадлежит пользователю (для проверки WITH CHECK)
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

-- Проверяем, что политика создана правильно
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'object_tickets' AND policyname = 'tickets_update';
