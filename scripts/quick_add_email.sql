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
