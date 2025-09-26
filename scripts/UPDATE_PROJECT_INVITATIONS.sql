-- ОБНОВЛЕНИЕ ТАБЛИЦЫ PROJECT_INVITATIONS В SUPABASE
-- Выполните этот скрипт в SQL Editor Supabase

-- 1. Добавляем недостающие поля если их нет
DO $$ 
BEGIN
  -- Добавляем поле expires_at если его нет
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'project_invitations' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE project_invitations ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days');
  END IF;
  
  -- Добавляем поле token если его нет
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'project_invitations' AND column_name = 'token'
  ) THEN
    ALTER TABLE project_invitations ADD COLUMN token TEXT UNIQUE DEFAULT gen_random_uuid()::text;
  END IF;
END $$;

-- 2. Обновляем существующие записи, добавляя недостающие значения
UPDATE project_invitations 
SET 
  expires_at = COALESCE(expires_at, NOW() + INTERVAL '7 days'),
  token = COALESCE(token, gen_random_uuid()::text)
WHERE expires_at IS NULL OR token IS NULL;

-- 3. Устанавливаем NOT NULL ограничения для новых полей
ALTER TABLE project_invitations ALTER COLUMN expires_at SET NOT NULL;
ALTER TABLE project_invitations ALTER COLUMN token SET NOT NULL;

-- 4. Добавляем CHECK ограничения для поля status
ALTER TABLE project_invitations DROP CONSTRAINT IF EXISTS project_invitations_status_check;
ALTER TABLE project_invitations ADD CONSTRAINT project_invitations_status_check 
  CHECK (status IN ('pending', 'accepted', 'expired'));

-- 5. Добавляем CHECK ограничения для поля role
ALTER TABLE project_invitations DROP CONSTRAINT IF EXISTS project_invitations_role_check;
ALTER TABLE project_invitations ADD CONSTRAINT project_invitations_role_check 
  CHECK (role IN ('owner', 'admin', 'member'));

-- 6. Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_project_invitations_project_id ON project_invitations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_invitations_email ON project_invitations(email);
CREATE INDEX IF NOT EXISTS idx_project_invitations_token ON project_invitations(token);
CREATE INDEX IF NOT EXISTS idx_project_invitations_status ON project_invitations(status);
CREATE INDEX IF NOT EXISTS idx_project_invitations_expires_at ON project_invitations(expires_at);

-- 7. Включаем RLS если еще не включен
ALTER TABLE project_invitations ENABLE ROW LEVEL SECURITY;

-- 8. Удаляем существующие политики если есть
DROP POLICY IF EXISTS "Project owners and admins can manage invitations" ON project_invitations;
DROP POLICY IF EXISTS "Users can view their own invitations" ON project_invitations;

-- 9. Создаем RLS политики для project_invitations
CREATE POLICY "Project owners and admins can manage invitations" ON project_invitations
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM project_members 
      WHERE project_id = project_invitations.project_id AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can view their own invitations" ON project_invitations
  FOR SELECT USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- 10. Создаем функцию для автоматического обновления expires_at и token
CREATE OR REPLACE FUNCTION update_invitation_defaults()
RETURNS TRIGGER AS $$
BEGIN
  -- Устанавливаем expires_at если не задан
  IF NEW.expires_at IS NULL THEN
    NEW.expires_at = NOW() + INTERVAL '7 days';
  END IF;
  
  -- Генерируем token если не задан
  IF NEW.token IS NULL THEN
    NEW.token = gen_random_uuid()::text;
  END IF;
  
  -- Устанавливаем invited_at если не задан
  IF NEW.invited_at IS NULL THEN
    NEW.invited_at = NOW();
  END IF;
  
  -- Устанавливаем status если не задан
  IF NEW.status IS NULL THEN
    NEW.status = 'pending';
  END IF;
  
  -- Устанавливаем role если не задан
  IF NEW.role IS NULL THEN
    NEW.role = 'member';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 11. Создаем триггер для автоматического обновления значений по умолчанию
DROP TRIGGER IF EXISTS trigger_update_invitation_defaults ON project_invitations;
CREATE TRIGGER trigger_update_invitation_defaults
  BEFORE INSERT ON project_invitations
  FOR EACH ROW
  EXECUTE FUNCTION update_invitation_defaults();

-- Проверяем результат
SELECT 'Project invitations table updated successfully!' as status;

-- Показываем обновленную таблицу
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'project_invitations'
ORDER BY ordinal_position;
