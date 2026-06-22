-- ============================================================
-- Security hardening follow-up from full codebase audit (2026-06-22)
-- 1. profiles "Admins" policies still used the recursive EXISTS
--    pattern that 004 fixed only for the HR policy.
-- 2. leads/attendance UPDATE policies had USING but no WITH CHECK,
--    so a row could be updated to values outside the policy's scope.
-- 3. leads/lead_notes admin policies never moved to get_my_role().
-- 4. Missing indexes on FK columns used in frequent lookups.
-- ============================================================

-- ── 1. Fix recursive admin policies on profiles ──────────────
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (public.get_my_role() = 'admin');

DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles" ON profiles
  FOR UPDATE USING (public.get_my_role() = 'admin')
  WITH CHECK (public.get_my_role() = 'admin');

-- ── 2. Add WITH CHECK to symmetric UPDATE policies ───────────
DROP POLICY IF EXISTS "CRE can update own leads" ON leads;
CREATE POLICY "CRE can update own leads" ON leads
  FOR UPDATE
  USING (auth.uid() = created_by OR auth.uid() = assigned_to)
  WITH CHECK (auth.uid() = created_by OR auth.uid() = assigned_to);

DROP POLICY IF EXISTS "Users can update own attendance" ON attendance;
CREATE POLICY "Users can update own attendance" ON attendance
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 3. Standardise leads/lead_notes admin policies on get_my_role() ──
DROP POLICY IF EXISTS "Admin can view all leads" ON leads;
CREATE POLICY "Admin can view all leads" ON leads
  FOR SELECT USING (public.get_my_role() IN ('admin', 'hr_finance'));

DROP POLICY IF EXISTS "Admin can view all notes" ON lead_notes;
CREATE POLICY "Admin can view all notes" ON lead_notes
  FOR SELECT USING (public.get_my_role() IN ('admin', 'hr_finance'));

-- ── 4. Missing indexes on frequently-filtered FK columns ─────
CREATE INDEX IF NOT EXISTS leave_requests_user_id_idx ON leave_requests (user_id);
CREATE INDEX IF NOT EXISTS leave_requests_status_idx ON leave_requests (status, from_date);
CREATE INDEX IF NOT EXISTS daily_tasks_user_id_idx ON daily_tasks (user_id);
CREATE INDEX IF NOT EXISTS lead_notes_created_by_idx ON lead_notes (created_by);
CREATE INDEX IF NOT EXISTS attendance_date_idx ON attendance (attendance_date);
