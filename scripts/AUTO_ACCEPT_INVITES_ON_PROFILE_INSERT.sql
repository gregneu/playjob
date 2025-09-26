CREATE OR REPLACE FUNCTION public.accept_invitations_on_profile_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Add to members all pending invites for this email
  INSERT INTO project_members (project_id, user_id, role, status, invited_by, invited_at, joined_at)
  SELECT pi.project_id,
         NEW.id,
         COALESCE(pi.role, 'member'),
         'accepted',
         pi.invited_by,
         pi.invited_at,
         now()
  FROM project_invitations pi
  WHERE lower(pi.email) = lower(NEW.email)
    AND pi.status IN ('pending');

  -- Mark invitations as accepted
  UPDATE project_invitations
  SET status = 'accepted'
  WHERE lower(email) = lower(NEW.email)
    AND status IN ('pending');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS accept_invites_on_profile_insert ON public.profiles;
CREATE TRIGGER accept_invites_on_profile_insert
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.accept_invitations_on_profile_insert();
