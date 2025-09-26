-- AVATAR DEFAULT + SIGNUP 500 FIX
-- Run this in Supabase SQL editor

-- 1) Ensure columns exist
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_config jsonb;

-- 2) Set default placeholder for avatar_url
ALTER TABLE profiles ALTER COLUMN avatar_url SET DEFAULT '/Avatars/placeholder.png';

-- 3) Backfill existing NULL/empty avatar_url values
UPDATE profiles
SET avatar_url = '/Avatars/placeholder.png'
WHERE avatar_url IS NULL OR trim(avatar_url) = '';

-- 4) Make avatar_url required (after backfill)
ALTER TABLE profiles ALTER COLUMN avatar_url SET NOT NULL;

-- 5) Prevent signup 500 caused by UNIQUE(email) conflicts in orphaned rows
DO $$
DECLARE
  conname text;
BEGIN
  SELECT conname INTO conname
  FROM pg_constraint
  WHERE conrelid = 'public.profiles'::regclass
    AND contype = 'u'
    AND conname LIKE '%email%';

  IF conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', conname);
  END IF;
END $$;

-- Recreate a non-unique index for email lookup performance
CREATE INDEX IF NOT EXISTS profiles_email_idx ON profiles(email);

-- 6) Ensure trigger inserts with defaults (no need to pass avatar_url explicitly)
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

-- 7) (Re)create trigger if missing
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 8) Quick sanity
SELECT 'OK' AS status,
       COUNT(*) FILTER (WHERE avatar_url = '/Avatars/placeholder.png') AS placeholders,
       COUNT(*) AS total
FROM profiles;


