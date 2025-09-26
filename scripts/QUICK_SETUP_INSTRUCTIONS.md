# 🚀 Быстрая настройка системы приглашений

## 📋 **Что нужно сделать:**

> ⚠️ **ВАЖНО**: Используйте чистую версию скрипта `scripts/setup_project_sharing_clean.sql` 
> или скопируйте код из инструкций ниже. Другие версии содержали ошибки.

### **1. Откройте Supabase Dashboard:**
- Перейдите на [supabase.com](https://supabase.com)
- Войдите в свой аккаунт
- Откройте проект PlayJob

### **2. Откройте SQL Editor:**
- В левом меню найдите **"SQL Editor"**
- Нажмите **"New query"**

### **3. Скопируйте и вставьте весь скрипт:**
```sql
-- Настройка системы совместной работы над проектами (ИСПРАВЛЕННАЯ ВЕРСИЯ)
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

-- 4. Обновляем существующие проекты (устанавливаем owner_id = created_by)
UPDATE projects SET owner_id = created_by WHERE owner_id IS NULL;

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

-- 11. Добавляем существующих владельцев проектов в project_members
INSERT INTO project_members (project_id, user_id, role, status, joined_at)
SELECT id, owner_id, 'owner', 'accepted', created_at
FROM projects 
WHERE owner_id IS NOT NULL
ON CONFLICT (project_id, user_id) DO NOTHING;

-- Проверяем результат
SELECT 'Project sharing system setup completed successfully!' as status;
```

### **4. Нажмите "Run" (▶️)**

### **5. Дождитесь выполнения и проверьте результат:**
Вы должны увидеть сообщение:
```
Project sharing system setup completed successfully!
```

## ✅ **Что будет создано:**

- **`project_members`** - таблица участников проекта
- **`project_invitations`** - таблица приглашений  
- **`owner_id`** - поле владельца в таблице projects
- **RLS политики** - безопасность доступа
- **Индексы** - для производительности
- **Триггеры** - автоматическое добавление владельцев

## 🎉 **После настройки:**

1. **Функциональность Share** будет работать полностью
2. **Приглашения пользователей** будут создаваться
3. **Участники проектов** будут отображаться
4. **Система безопасности** будет настроена

**Выполните скрипт и система приглашений будет готова!** 🚀
