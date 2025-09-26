-- Настройка системы совместной работы над проектами
-- Запустите этот скрипт в Supabase SQL Editor

-- 1. Создаем таблицу участников проекта
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  invited_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  joined_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  UNIQUE(project_id, user_id)
);

-- 2. Создаем таблицу приглашений
CREATE TABLE IF NOT EXISTS project_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  token TEXT UNIQUE NOT NULL DEFAULT gen_random_uuid()::text,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member'))
);

-- 3. Добавляем поле owner_id в projects если его нет
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN owner_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- 4. Обновляем существующие проекты (устанавливаем owner_id = id первого пользователя)
-- Если у вас есть пользователи, можете указать конкретный UUID
UPDATE projects SET owner_id = (SELECT id FROM auth.users LIMIT 1) WHERE owner_id IS NULL;

-- 5. Включаем RLS для новых таблиц
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_invitations ENABLE ROW LEVEL SECURITY;

-- 6. Создаем RLS политики для project_members
CREATE POLICY "Project members can view project members" ON project_members
  FOR SELECT USING (
    auth.uid() IN (
      SELECT user_id FROM project_members 
      WHERE project_id = project_members.project_id
    )
  );

CREATE POLICY "Project owners and admins can manage members" ON project_members
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM project_members 
      WHERE project_id = project_members.project_id AND role IN ('owner', 'admin')
    )
  );

-- 7. Создаем RLS политики для project_invitations
CREATE POLICY "Project owners and admins can manage invitations" ON project_invitations
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM project_members 
      WHERE project_id = project_invitations.project_id AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can view their own invitations" ON project_invitations
  FOR SELECT USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- 8. Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_invitations_project_id ON project_invitations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_invitations_email ON project_invitations(email);
CREATE INDEX IF NOT EXISTS idx_project_invitations_token ON project_invitations(token);

-- 9. Создаем функцию для автоматического добавления владельца проекта
CREATE OR REPLACE FUNCTION add_project_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_members (project_id, user_id, role, status, joined_at)
  VALUES (NEW.id, NEW.owner_id, 'owner', 'accepted', NOW())
  ON CONFLICT (project_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 10. Создаем триггер для автоматического добавления владельца
DROP TRIGGER IF EXISTS trigger_add_project_owner ON projects;
CREATE TRIGGER trigger_add_project_owner
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION add_project_owner();

-- 11. Создаем функцию для приглашения пользователя
CREATE OR REPLACE FUNCTION invite_user_to_project(
  p_project_id UUID,
  p_email TEXT,
  p_role TEXT DEFAULT 'member'
)
RETURNS TEXT AS $$
DECLARE
  v_token TEXT;
  v_invitation_id UUID;
BEGIN
  -- Проверяем права доступа
  IF NOT EXISTS (
    SELECT 1 FROM project_members 
    WHERE project_id = p_project_id 
    AND user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  ) THEN
    RAISE EXCEPTION 'Access denied: insufficient permissions';
  END IF;
  
  -- Создаем приглашение
  INSERT INTO project_invitations (project_id, email, invited_by, role)
  VALUES (p_project_id, p_email, auth.uid(), p_role)
  RETURNING id, token INTO v_invitation_id, v_token;
  
  -- TODO: Здесь можно добавить отправку email с приглашением
  
  RETURN v_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Проверяем результат
SELECT 'Project sharing setup completed successfully!' as status;

-- Показываем созданные таблицы
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name IN ('project_members', 'project_invitations')
ORDER BY table_name, ordinal_position;
