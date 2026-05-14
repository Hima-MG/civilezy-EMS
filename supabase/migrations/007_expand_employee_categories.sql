-- ============================================================
-- Migration 007: Expand employee_category enum
--
-- Adds content_manager, management, finance, sales to the
-- allowed values for profiles.employee_category and
-- work_reports.category.
--
-- Run in Supabase SQL Editor after migration 006.
-- ============================================================

-- 1. Drop the old check constraint on profiles
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_employee_category_check;

-- 2. Re-add with the full set of categories
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_employee_category_check
  CHECK (employee_category IN (
    'content_creator',
    'content_manager',
    'tech_lead',
    'digital_marketer',
    'management',
    'finance',
    'sales'
  ));

-- 3. Drop the old check constraint on work_reports
ALTER TABLE public.work_reports
  DROP CONSTRAINT IF EXISTS work_reports_category_check;

-- 4. Re-add with the full set of categories
ALTER TABLE public.work_reports
  ADD CONSTRAINT work_reports_category_check
  CHECK (category IN (
    'content_creator',
    'content_manager',
    'tech_lead',
    'digital_marketer',
    'management',
    'finance',
    'sales'
  ));

-- 5. Update handle_new_user to carry role + employee_category from metadata
--    so that the app-layer UPSERT in signupAction always wins over the trigger.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, role, employee_category)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'avatar_url',
    -- Fall back to 'employee' if no role provided in metadata
    COALESCE(
      (NEW.raw_user_meta_data->>'role')::public.user_role,
      'employee'
    ),
    NEW.raw_user_meta_data->>'employee_category'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
