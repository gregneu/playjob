# 📧 Добавление поля email в Supabase

## 🎯 **Цель:**
Добавить поле `email` в таблицу `profiles` для возможности поиска пользователей по email при приглашении в проекты.

## 🗄️ **Что нужно сделать:**

### **1. Откройте Supabase Dashboard:**
- Перейдите на [supabase.com](https://supabase.com)
- Войдите в свой аккаунт
- Откройте проект PlayJob

### **2. Откройте SQL Editor:**
- В левом меню найдите **"SQL Editor"**
- Нажмите **"New query"**

### **3. Выполните SQL скрипт:**

#### **Шаг 1: Добавление поля email**
```sql
-- Быстрое добавление поля email в profiles
-- Просто скопируйте и вставьте в Supabase SQL Editor

-- Добавляем поле email (если его нет)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- Создаем индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);

-- Проверяем результат
SELECT 'Email field added successfully!' as status;

-- Показываем структуру таблицы
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
```

#### **Шаг 2: Заполнение email'ов (опционально)**
```sql
-- Заполнение email'ов через RPC функцию
-- Выполните ПОСЛЕ добавления поля email

-- Создаем функцию для заполнения email'ов
CREATE OR REPLACE FUNCTION fill_profile_emails()
RETURNS TEXT AS $$
DECLARE
  profile_record RECORD;
  user_email TEXT;
  updated_count INTEGER := 0;
BEGIN
  FOR profile_record IN 
    SELECT id FROM profiles WHERE email IS NULL
  LOOP
    SELECT email INTO user_email 
    FROM auth.users 
    WHERE id = profile_record.id;
    
    IF user_email IS NOT NULL THEN
      UPDATE profiles 
      SET email = user_email 
      WHERE id = profile_record.id;
      updated_count := updated_count + 1;
    END IF;
  END LOOP;
  
  RETURN 'Updated ' || updated_count || ' profiles with email addresses';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Выполняем функцию
SELECT fill_profile_emails();
```

#### **Вариант 2: Подробный**
```sql
-- Подробное добавление поля email в profiles
-- Запустите полный скрипт: scripts/add_email_to_profiles.sql
```

### **4. Проверьте результат:**
После выполнения **Шага 1** вы должны увидеть:
- ✅ Сообщение "Email field added successfully!"
- ✅ Поле `email` добавлено в таблицу `profiles`
- ✅ Индекс создан для быстрого поиска
- ✅ Структура таблицы показана

После выполнения **Шага 2** (опционально):
- ✅ Сообщение о количестве обновленных профилей
- ✅ Email'ы заполнены для существующих пользователей

## 🔍 **Проверка структуры таблицы:**

```sql
-- Посмотреть структуру таблицы profiles
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'profiles'
ORDER BY ordinal_position;
```

## 👥 **Проверка данных:**

```sql
-- Посмотреть несколько профилей с email
SELECT 
  id,
  full_name,
  email,
  username
FROM profiles 
LIMIT 5;
```

## 🚀 **После добавления поля email:**

### **Функциональность Share будет работать:**
1. **При вводе email зарегистрированного пользователя** → он автоматически добавляется в проект
2. **При вводе email незарегистрированного пользователя** → создается приглашение
3. **Аватары участников** отображаются рядом с кнопкой Share

### **Что нужно настроить дополнительно:**
1. **Запустить скрипт** `scripts/setup_project_sharing.sql` для создания таблиц приглашений
2. **Настроить RLS политики** для безопасности
3. **Создать функции** для управления участниками

## ⚠️ **Важные моменты:**

- **Поле `email`** будет автоматически заполнено для существующих пользователей
- **Индекс** создается для быстрого поиска по email
- **RLS политики** остаются без изменений
- **Существующие данные** не теряются

## 🎉 **Результат:**

После выполнения скрипта:
- ✅ Поиск пользователей по email будет работать
- ✅ Автоматическое добавление в проект будет функционировать
- ✅ Система приглашений будет готова к настройке

**Выполните скрипт в Supabase SQL Editor, и поле email будет добавлено!** 🚀
