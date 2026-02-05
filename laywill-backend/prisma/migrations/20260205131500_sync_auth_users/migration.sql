-- Allow Supabase Auth users without local passwords
ALTER TABLE "User" ALTER COLUMN "password" DROP NOT NULL;

-- Create User row when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public."User" (id, email, name, "emailVerifiedAt", "createdAt", "updatedAt")
  VALUES (
    NEW.id::text,
    LOWER(NEW.email),
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email_confirmed_at,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    name = EXCLUDED.name,
    "emailVerifiedAt" = EXCLUDED."emailVerifiedAt",
    "updatedAt" = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Keep profile data in sync when auth user is updated/confirmed
CREATE OR REPLACE FUNCTION public.handle_auth_user_updated()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public."User"
  SET
    email = LOWER(NEW.email),
    name = NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    "emailVerifiedAt" = NEW.email_confirmed_at,
    "updatedAt" = NOW()
  WHERE id = NEW.id::text;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
CREATE TRIGGER on_auth_user_updated
AFTER UPDATE OF email, raw_user_meta_data, email_confirmed_at ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_auth_user_updated();
