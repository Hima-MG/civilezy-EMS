-- ============================================================
-- Migration 009: Work report approval workflow + audit log
--
-- work_reports.status (pending/in_progress/completed) is the
-- employee's own self-reported progress and stays untouched.
-- This adds a SEPARATE approval_status that only HR/Admin can
-- set, plus an immutable audit log of every approval/rejection.
-- ============================================================

-- 1. Approval columns on work_reports
ALTER TABLE public.work_reports
  ADD COLUMN IF NOT EXISTS approval_status text NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_note text;

CREATE INDEX IF NOT EXISTS work_reports_approval_status_idx
  ON public.work_reports (approval_status);

-- 2. Audit log — one immutable row per approve/reject action
CREATE TABLE IF NOT EXISTS public.work_report_reviews (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_report_id  uuid NOT NULL REFERENCES public.work_reports(id) ON DELETE CASCADE,
  action          text NOT NULL CHECK (action IN ('approved', 'rejected')),
  reviewed_by     uuid NOT NULL REFERENCES public.profiles(id),
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS work_report_reviews_report_id_idx
  ON public.work_report_reviews (work_report_id);
CREATE INDEX IF NOT EXISTS work_report_reviews_reviewed_by_idx
  ON public.work_report_reviews (reviewed_by);

ALTER TABLE public.work_report_reviews ENABLE ROW LEVEL SECURITY;

-- Employees can read the review history of their own reports
CREATE POLICY "Users can view reviews of own reports" ON public.work_report_reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.work_reports wr
      WHERE wr.id = work_report_id AND wr.user_id = auth.uid()
    )
  );

-- HR/Admin can read all reviews
CREATE POLICY "HR and Admin can view all reviews" ON public.work_report_reviews
  FOR SELECT USING (public.get_my_role() IN ('hr_finance', 'admin'));

-- Only HR/Admin can write reviews, and only as themselves (no impersonation)
CREATE POLICY "HR and Admin can insert reviews" ON public.work_report_reviews
  FOR INSERT WITH CHECK (
    public.get_my_role() IN ('hr_finance', 'admin')
    AND reviewed_by = auth.uid()
  );

-- No UPDATE/DELETE policy on work_report_reviews — it is intentionally
-- append-only; nobody (not even admin) can edit history via the API.

-- 3. Restrict who can set approval_status on work_reports
--    The existing "Users can update own work reports" UPDATE policy
--    would otherwise let an employee set their own approval_status via
--    a crafted PATCH. Add a trigger that pins the approval columns back
--    to their previous values unless the actor is HR/Admin.
CREATE OR REPLACE FUNCTION public.protect_work_report_approval_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF public.get_my_role() NOT IN ('hr_finance', 'admin') THEN
    NEW.approval_status := OLD.approval_status;
    NEW.reviewed_by := OLD.reviewed_by;
    NEW.reviewed_at := OLD.reviewed_at;
    NEW.review_note := OLD.review_note;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS work_reports_protect_approval ON public.work_reports;
CREATE TRIGGER work_reports_protect_approval
  BEFORE UPDATE ON public.work_reports
  FOR EACH ROW EXECUTE FUNCTION public.protect_work_report_approval_fields();

-- 4. Let HR/Admin actually perform the UPDATE (previously only the
--    owning employee had an UPDATE policy on work_reports).
DROP POLICY IF EXISTS "HR and Admin can review work reports" ON public.work_reports;
CREATE POLICY "HR and Admin can review work reports" ON public.work_reports
  FOR UPDATE
  USING (public.get_my_role() IN ('hr_finance', 'admin'))
  WITH CHECK (public.get_my_role() IN ('hr_finance', 'admin'));
