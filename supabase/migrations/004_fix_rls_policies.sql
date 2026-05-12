-- ============================================================
-- Fix 1: Break recursive profiles RLS + standardise all HR policies
-- Run this entire script in your Supabase SQL Editor
-- ============================================================

-- ── Root cause of Issue 1 ─────────────────────────────────────
-- The previous "HR can view all profiles" policy queried `profiles`
-- FROM INSIDE a `profiles` RLS policy.  PostgreSQL evaluates RLS
-- policies before executing the row expression, so the inner query
-- also hits RLS for `profiles`, which again checks the same policy
-- → stack overflow / empty result.
--
-- Fix: wrap the role lookup in a SECURITY DEFINER function.
-- A SECURITY DEFINER function runs with the privileges of its owner
-- (the postgres/service role), completely bypassing RLS for the inner
-- SELECT.  The outer policies are still enforced correctly.
-- ─────────────────────────────────────────────────────────────

-- 1. Create (or replace) the helper — reads the current user's role
--    without triggering RLS on profiles.
CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role::TEXT FROM public.profiles WHERE id = auth.uid();
$$;

-- Grant execute to the anon and authenticated roles so RLS policies
-- can call it.
GRANT EXECUTE ON FUNCTION public.get_my_role() TO anon, authenticated;

-- ── 2. Fix self-referencing policy on profiles ────────────────

DROP POLICY IF EXISTS "HR can view all profiles" ON profiles;

-- Now safe: get_my_role() fetches the role bypassing RLS on profiles
CREATE POLICY "HR can view all profiles" ON profiles
  FOR SELECT USING (
    public.get_my_role() IN ('hr_finance', 'admin')
  );

-- ── 3. Refresh salary_records HR policies (use function) ──────
--    The old EXISTS(...FROM profiles...) pattern works on other
--    tables but we standardise everything to the faster function.

DROP POLICY IF EXISTS "HR can view all salary records" ON salary_records;
DROP POLICY IF EXISTS "HR can insert salary records"   ON salary_records;
DROP POLICY IF EXISTS "HR can update salary records"   ON salary_records;
DROP POLICY IF EXISTS "HR can delete salary records"   ON salary_records;

CREATE POLICY "HR can view all salary records" ON salary_records
  FOR SELECT USING (public.get_my_role() IN ('hr_finance', 'admin'));

CREATE POLICY "HR can insert salary records" ON salary_records
  FOR INSERT WITH CHECK (public.get_my_role() IN ('hr_finance', 'admin'));

CREATE POLICY "HR can update salary records" ON salary_records
  FOR UPDATE USING (public.get_my_role() IN ('hr_finance', 'admin'));

CREATE POLICY "HR can delete salary records" ON salary_records
  FOR DELETE USING (public.get_my_role() IN ('hr_finance', 'admin'));

-- ── 4. Refresh leave_requests HR policies ────────────────────

DROP POLICY IF EXISTS "HR can view all leaves"     ON leave_requests;
DROP POLICY IF EXISTS "HR can update leave status" ON leave_requests;
DROP POLICY IF EXISTS "HR can delete leaves"       ON leave_requests;

CREATE POLICY "HR can view all leaves" ON leave_requests
  FOR SELECT USING (public.get_my_role() IN ('hr_finance', 'admin'));

CREATE POLICY "HR can update leave status" ON leave_requests
  FOR UPDATE USING (public.get_my_role() IN ('hr_finance', 'admin'));

CREATE POLICY "HR can delete leaves" ON leave_requests
  FOR DELETE USING (public.get_my_role() IN ('hr_finance', 'admin'));

-- ── 5. Refresh attendance HR policy ──────────────────────────

DROP POLICY IF EXISTS "HR can view all attendance" ON attendance;

CREATE POLICY "HR can view all attendance" ON attendance
  FOR SELECT USING (public.get_my_role() IN ('hr_finance', 'admin'));

-- ── 6. Verify salary_records unique constraint is in place ────
--    (Already created in 003 — this is a no-op if it exists;
--     listed here for documentation clarity.)
-- CONSTRAINT salary_user_month_unique UNIQUE (user_id, month)
-- The upsert onConflict: "user_id,month" targets this constraint.
