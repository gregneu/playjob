-- Заполнение email'ов через RPC функцию
-- Выполните этот скрипт ПОСЛЕ добавления поля email

-- 1. Создаем функцию для заполнения email'ов
CREATE OR REPLACE FUNCTION fill_profile_emails()
RETURNS TEXT AS $$
DECLARE
  profile_record RECORD;
  user_email TEXT;
  updated_count INTEGER := 0;
BEGIN
  -- Проходим по всем профилям без email
  FOR profile_record IN 
    SELECT id FROM profiles WHERE email IS NULL
  LOOP
    -- Получаем email из auth.users через RPC
    SELECT email INTO user_email 
    FROM auth.users 
    WHERE id = profile_record.id;
    
    -- Обновляем профиль если email найден
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

-- 2. Выполняем функцию
SELECT fill_profile_emails();

-- 3. Проверяем результат
SELECT 
  COUNT(*) as total_profiles,
  COUNT(email) as profiles_with_email,
  COUNT(*) - COUNT(email) as profiles_without_email
FROM profiles;

-- 4. Показываем несколько примеров
SELECT 
  id,
  full_name,
  email,
  username
FROM profiles 
WHERE email IS NOT NULL
LIMIT 5;
