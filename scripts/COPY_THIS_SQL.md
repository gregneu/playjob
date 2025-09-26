# 📋 Скопируйте этот SQL код в Supabase

```sql
-- Настройка системы совместной работы над проектами
-- Запустите этот скрипт в Supabase SQL Editor

-- 0. Создаем таблицу profiles если её нет (нужна для системы приглашений)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Включаем RLS для profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Создаем политики RLS для profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Создаем индексы для profiles
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_full_name ON profiles(full_name);

-- Функция для автоматического создания профиля при регистрации
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Триггер для автоматического создания профиля
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ПРИМЕЧАНИЕ: Таблицы project_members и project_invitations уже существуют

-- 1. Добавляем поле owner_id в projects если его нет
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'projects' AND column_name = 'owner_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN owner_id UUID REFERENCES auth.users(id);
  END IF;
END $$;

-- 2. Устанавливаем owner_id для существующих проектов (используем первого пользователя)
UPDATE projects 
SET owner_id = (
  SELECT id FROM auth.users 
  WHERE id IN (SELECT id FROM profiles LIMIT 1)
  LIMIT 1
) 
WHERE owner_id IS NULL;

-- 3. Включаем RLS для таблиц (если еще не включен)
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_invitations ENABLE ROW LEVEL SECURITY;

-- 4. Удаляем существующие политики (если есть) и создаем новые
DROP POLICY IF EXISTS "Project members can view project members" ON project_members;
DROP POLICY IF EXISTS "Project owners and admins can manage members" ON project_members;
DROP POLICY IF EXISTS "Project owners and admins can manage invitations" ON project_invitations;
DROP POLICY IF EXISTS "Users can view their own invitations" ON project_invitations;

-- 5. Создаем RLS политики для project_members
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

-- 6. Создаем RLS политики для project_invitations
CREATE POLICY "Project owners and admins can manage invitations" ON project_invitations
  FOR ALL USING (
    auth.uid() IN (
      SELECT user_id FROM project_members 
      WHERE project_id = project_invitations.project_id AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can view their own invitations" ON project_invitations
  FOR SELECT USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

-- 7. Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_invitations_project_id ON project_invitations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_invitations_email ON project_invitations(email);
CREATE INDEX IF NOT EXISTS idx_project_invitations_token ON project_invitations(token);

-- 8. Создаем функцию для автоматического добавления владельца проекта
CREATE OR REPLACE FUNCTION add_project_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_members (project_id, user_id, role, status, joined_at)
  VALUES (NEW.id, NEW.owner_id, 'owner', 'accepted', NOW())
  ON CONFLICT (project_id, user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Создаем триггер для автоматического добавления владельца
DROP TRIGGER IF EXISTS trigger_add_project_owner ON projects;
CREATE TRIGGER trigger_add_project_owner
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION add_project_owner();

-- 10. Добавляем существующих владельцев проектов в project_members
INSERT INTO project_members (project_id, user_id, role, status, joined_at)
SELECT id, owner_id, 'owner', 'accepted', NOW()
FROM projects 
WHERE owner_id IS NOT NULL
ON CONFLICT (project_id, user_id) DO NOTHING;

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
```

## 🚀 **Как использовать:**

1. **Скопируйте весь код** выше (от `-- Настройка системы...` до последней строки)
2. **Вставьте в Supabase SQL Editor**
3. **Нажмите "Run" (▶️)**
4. **Дождитесь выполнения**

## ✅ **Ожидаемый результат:**

```
Project sharing setup completed successfully!
```

И список созданных таблиц.

## 📝 **Что делает этот скрипт:**

- ✅ **Создает таблицу profiles** для пользователей (если её нет)
- 🔐 **Настраивает RLS политики** для безопасности
- 📊 **Создает индексы** для производительности
- ⚡ **Добавляет триггеры** для автоматического управления
- 🎯 **Создает функции** для приглашения пользователей
- 👤 **Автоматически создает профили** при регистрации новых пользователей
