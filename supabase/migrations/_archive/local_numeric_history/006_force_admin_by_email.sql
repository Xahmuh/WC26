-- ============================================================================
-- Force admin role for ahmedelsherbiinii@gmail.com
-- ============================================================================

-- 1. Upgrade existing user if they already exist
UPDATE public.users
SET role = 'admin'
WHERE LOWER(email) = 'ahmedelsherbiinii@gmail.com';

-- 2. Modify handle_new_user trigger function to force admin role for this email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, display_name, email, avatar_url, role, last_login)
  VALUES (
    new.id,
    COALESCE(
      new.raw_user_meta_data->>'display_name',
      new.raw_user_meta_data->>'full_name',
      split_part(new.email, '@', 1)
    ),
    new.email,
    COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    CASE 
      WHEN LOWER(new.email) = 'ahmedelsherbiinii@gmail.com' THEN 'admin'
      ELSE COALESCE(new.raw_user_meta_data->>'role', 'user')
    END,
    new.last_sign_in_at
  )
  ON CONFLICT (id) DO UPDATE
  SET
    email = excluded.email,
    role = CASE 
      WHEN LOWER(excluded.email) = 'ahmedelsherbiinii@gmail.com' THEN 'admin'
      ELSE COALESCE(excluded.role, users.role)
    END,
    avatar_url = COALESCE(excluded.avatar_url, users.avatar_url),
    last_login = COALESCE(excluded.last_login, users.last_login);
  RETURN new;
END;
$$;

-- 3. Modify handle_user_update trigger function to preserve/force admin role
CREATE OR REPLACE FUNCTION public.handle_user_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users
  SET
    email = new.email,
    role = CASE 
      WHEN LOWER(new.email) = 'ahmedelsherbiinii@gmail.com' THEN 'admin'
      ELSE role
    END,
    avatar_url = COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', avatar_url),
    display_name = COALESCE(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'full_name', display_name),
    last_login = COALESCE(new.last_sign_in_at, last_login)
  WHERE id = new.id;
  RETURN new;
END;
$$;
