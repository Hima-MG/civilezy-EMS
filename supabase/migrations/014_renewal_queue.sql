-- ============================================================
-- Migration 014: Renewal queue (manual HR workflow)
--
-- Civilezy's actual renewal process is NOT automated: a student gets a
-- Razorpay payment link or pays via UPI, sends HR a screenshot over
-- WhatsApp, HR manually verifies it, then manually applies the renewal
-- inside EzyCourse's own admin panel (which eventually fires the
-- "renew-order" webhook we already capture in membership_renewals).
--
-- renewal_queue tracks THIS manual workflow — it is intentionally
-- separate from membership_renewals (the EzyCourse-confirmed historical
-- record). A queue entry's lifecycle ends when HR marks it "renewed"
-- after actually doing the renewal in EzyCourse; it is not auto-closed
-- by the webhook, since there's no reliable link between the two without
-- guessing at timing.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.renewal_queue (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  membership_id     text,
  product_name      text,
  amount            numeric(12, 2),
  due_date          timestamptz,
  status            text NOT NULL DEFAULT 'pending_payment'
    CHECK (status IN (
      'pending_payment', 'payment_received', 'verification_pending',
      'ready_for_renewal', 'renewed', 'follow_up_required'
    )),
  payment_reference text,
  notes             text,
  assigned_to       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_by        uuid NOT NULL REFERENCES public.profiles(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS renewal_queue_student_id_idx ON public.renewal_queue (student_id);
CREATE INDEX IF NOT EXISTS renewal_queue_status_idx ON public.renewal_queue (status);
CREATE INDEX IF NOT EXISTS renewal_queue_due_date_idx ON public.renewal_queue (due_date);

CREATE TRIGGER renewal_queue_updated_at
  BEFORE UPDATE ON public.renewal_queue
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE public.renewal_queue ENABLE ROW LEVEL SECURITY;

-- This is an internal HR/Admin operations tool (not webhook-sourced data),
-- so unlike students/course_purchases/etc. it needs write policies for
-- authenticated HR/Admin users, not just admin-only read via service role.
CREATE POLICY "HR and Admin can view renewal queue" ON public.renewal_queue
  FOR SELECT USING (public.get_my_role() IN ('hr_finance', 'admin'));

CREATE POLICY "HR and Admin can insert renewal queue entries" ON public.renewal_queue
  FOR INSERT WITH CHECK (
    public.get_my_role() IN ('hr_finance', 'admin')
    AND created_by = auth.uid()
  );

CREATE POLICY "HR and Admin can update renewal queue entries" ON public.renewal_queue
  FOR UPDATE
  USING (public.get_my_role() IN ('hr_finance', 'admin'))
  WITH CHECK (public.get_my_role() IN ('hr_finance', 'admin'));

-- Students table also needs HR (not just admin) read access now that the
-- Students/Renewals modules live in the Admin dashboard but are an
-- HR-operated workflow in practice.
DROP POLICY IF EXISTS "Admin can view students" ON public.students;
CREATE POLICY "Admin and HR can view students" ON public.students
  FOR SELECT USING (public.get_my_role() IN ('admin', 'hr_finance'));

DROP POLICY IF EXISTS "Admin can view course purchases" ON public.course_purchases;
CREATE POLICY "Admin and HR can view course purchases" ON public.course_purchases
  FOR SELECT USING (public.get_my_role() IN ('admin', 'hr_finance'));

DROP POLICY IF EXISTS "Admin can view membership renewals" ON public.membership_renewals;
CREATE POLICY "Admin and HR can view membership renewals" ON public.membership_renewals
  FOR SELECT USING (public.get_my_role() IN ('admin', 'hr_finance'));

DROP POLICY IF EXISTS "Admin can view activity logs" ON public.activity_logs;
CREATE POLICY "Admin and HR can view activity logs" ON public.activity_logs
  FOR SELECT USING (public.get_my_role() IN ('admin', 'hr_finance'));
