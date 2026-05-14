-- ============================================================
-- Migration 006: Profile auth hardening
--
-- 1. Allow users to INSERT their own profile row
--    (covers fresh projects where the trigger hasn't fired,
--     and the app-layer auto-create fallback in loginAction)
--
-- 2. Make handle_new_user trigger idempotent with ON CONFLICT DO NOTHING
--    (safe to re-run, prevents duplicate-key errors on retries)
--
-- 3. Fix recursive RLS on work_reports HR policy
--    (replace self-referencing EXISTS with get_my_role() which
--     already exists from migration 004)
-- ============================================================

-- 1. INSERT policy for own profile row
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 2. Idempotent handle_new_user trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Recreate trigger in case it was dropped
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Fix work_reports HR policy (was using recursive EXISTS on profiles)
DROP POLICY IF EXISTS "Admin and HR can view all work reports" ON public.work_reports;
CREATE POLICY "Admin and HR can view all work reports"
  ON public.work_reports FOR SELECT
  USING (public.get_my_role() IN ('admin', 'hr_finance'));
