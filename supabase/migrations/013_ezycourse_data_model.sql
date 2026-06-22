-- ============================================================
-- Migration 013: EzyCourse production data model
--
-- Built from the ONLY two real captured payload shapes so far:
--   - "course-purchase" (product_type, product_id, interval, etc.)
--   - "renew-order"      (membership_id, membership_status, change_type)
--
-- students / course_purchases / membership_renewals / activity_logs
-- are fully designed against verified fields and actively populated
-- by the processing service.
--
-- payments and membership_expiry are PROVISIONAL: no real
-- payment-success / payment-failed / refund / membership-expired
-- payload has been captured yet. Their schemas are intentionally
-- minimal + payload-preserving (raw jsonb) so they don't lock in a
-- guessed shape — DO NOT build typed columns or processing logic
-- against them until real payloads confirm field names. They exist
-- now only so FK/RLS plumbing is ready when that data arrives.
-- ============================================================

-- ── webhook_logs: processing state + retry (centralizes pending/
--    processed/failed + retry_count here, since this table is the
--    single queue every event passes through before becoming a typed
--    row elsewhere) ──────────────────────────────────────────────
ALTER TABLE public.webhook_logs
  ADD COLUMN IF NOT EXISTS processing_status text NOT NULL DEFAULT 'pending'
    CHECK (processing_status IN ('pending', 'processed', 'failed')),
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS processed_at timestamptz;

CREATE INDEX IF NOT EXISTS webhook_logs_processing_status_idx ON public.webhook_logs (processing_status);

-- ── students ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.students (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email               text NOT NULL UNIQUE,
  first_name          text,
  last_name           text,
  full_name           text,
  phone_number        text,
  city                text,
  state               text,
  country             text,
  postal_code         text,
  address_line_1      text,
  address_line_2      text,
  ezycourse_school_id text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS students_email_idx ON public.students (email);

CREATE TRIGGER students_updated_at
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ── course_purchases (from verified "course-purchase" payload) ──
CREATE TABLE IF NOT EXISTS public.course_purchases (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ezycourse_order_id   text NOT NULL UNIQUE,
  student_id           uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  product_id           text NOT NULL,
  product_name         text NOT NULL,
  product_type         text NOT NULL,
  product_owner_id     text,
  product_owner_email  text,
  price                numeric(12, 2) NOT NULL,
  gateway              text,
  "interval"           text,
  interval_count       integer,
  coupon_code          text,
  expiry_date          timestamptz,
  metadata             jsonb,
  webhook_log_id       uuid REFERENCES public.webhook_logs(id) ON DELETE SET NULL,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS course_purchases_student_id_idx ON public.course_purchases (student_id);
CREATE INDEX IF NOT EXISTS course_purchases_product_id_idx ON public.course_purchases (product_id);
CREATE INDEX IF NOT EXISTS course_purchases_created_at_idx ON public.course_purchases (created_at DESC);

CREATE TRIGGER course_purchases_updated_at
  BEFORE UPDATE ON public.course_purchases
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

-- ── membership_renewals (from verified "renew-order" payload) ───
-- No per-event id exists in the real payload — (membership_id, expiry_date)
-- is the idempotency key: a duplicate webhook delivery for the same
-- membership at the same expiry_date is a no-op, not a new row.
CREATE TABLE IF NOT EXISTS public.membership_renewals (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  membership_id     text NOT NULL,
  student_id        uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  membership_type   text,
  membership_status text,
  change_type       text,
  product_name      text,
  price             numeric(12, 2),
  gateway           text,
  currency          text,
  school_id         text,
  seller_id         text,
  expiry_date       timestamptz,
  webhook_log_id    uuid REFERENCES public.webhook_logs(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (membership_id, expiry_date)
);

CREATE INDEX IF NOT EXISTS membership_renewals_student_id_idx ON public.membership_renewals (student_id);
CREATE INDEX IF NOT EXISTS membership_renewals_membership_id_idx ON public.membership_renewals (membership_id);
CREATE INDEX IF NOT EXISTS membership_renewals_expiry_date_idx ON public.membership_renewals (expiry_date);

-- Latest renewal per membership = current membership state. Derived from
-- the immutable renewal log rather than a separately-mutated "current
-- status" column, so it can never drift out of sync with the events that
-- produced it.
CREATE OR REPLACE VIEW public.current_memberships
WITH (security_invoker = true) AS
SELECT DISTINCT ON (membership_id)
  membership_id, student_id, membership_type, membership_status,
  change_type, product_name, price, currency, expiry_date, created_at
FROM public.membership_renewals
ORDER BY membership_id, created_at DESC;

-- Revenue from both verified money-generating events, unified for the
-- "Revenue Today" / "Revenue This Month" dashboard widgets.
CREATE OR REPLACE VIEW public.ezycourse_revenue_events
WITH (security_invoker = true) AS
SELECT id, student_id, price AS amount, 'purchase' AS source_type, created_at
FROM public.course_purchases
UNION ALL
SELECT id, student_id, price AS amount, 'renewal' AS source_type, created_at
FROM public.membership_renewals
WHERE price IS NOT NULL;

-- ── activity_logs (internal unified timeline, fed by the processing
--    service — not an EzyCourse payload, so no "use real fields only"
--    constraint applies here) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  activity_type text NOT NULL
    CHECK (activity_type IN ('registration', 'purchase', 'renewal', 'expiry', 'payment', 'refund')),
  description   text,
  metadata      jsonb,
  source_table  text,
  source_id     uuid,
  occurred_at   timestamptz NOT NULL DEFAULT now(),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_logs_student_id_idx ON public.activity_logs (student_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS activity_logs_activity_type_idx ON public.activity_logs (activity_type);

-- ── payments (PROVISIONAL — no real payment-success/payment-failed/
--    refund payload captured yet; raw jsonb is the source of truth
--    until field names are confirmed) ────────────────────────────
CREATE TABLE IF NOT EXISTS public.payments (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id        uuid REFERENCES public.students(id) ON DELETE SET NULL,
  attempt_type      text CHECK (attempt_type IN ('success', 'failed', 'refund')),
  raw_payload       jsonb NOT NULL,
  webhook_log_id    uuid REFERENCES public.webhook_logs(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_student_id_idx ON public.payments (student_id);
CREATE INDEX IF NOT EXISTS payments_attempt_type_idx ON public.payments (attempt_type);

-- ── membership_expiry (PROVISIONAL — same reasoning as payments;
--    "Renewals Due" / "Expired Memberships" widgets currently read
--    current_memberships instead, which IS built from verified data) ──
CREATE TABLE IF NOT EXISTS public.membership_expiry (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id      uuid REFERENCES public.students(id) ON DELETE SET NULL,
  membership_id   text,
  raw_payload     jsonb NOT NULL,
  webhook_log_id  uuid REFERENCES public.webhook_logs(id) ON DELETE SET NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS membership_expiry_student_id_idx ON public.membership_expiry (student_id);
CREATE INDEX IF NOT EXISTS membership_expiry_membership_id_idx ON public.membership_expiry (membership_id);

-- ── RLS — admin-only read on every table here. All writes go through
--    the service-role processing service (same justification as
--    webhook_logs: this data arrives from an unauthenticated webhook,
--    there is no end-user session to scope RLS to). ─────────────────
ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_renewals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_expiry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view students" ON public.students
  FOR SELECT USING (public.get_my_role() = 'admin');
CREATE POLICY "Admin can view course purchases" ON public.course_purchases
  FOR SELECT USING (public.get_my_role() = 'admin');
CREATE POLICY "Admin can view membership renewals" ON public.membership_renewals
  FOR SELECT USING (public.get_my_role() = 'admin');
CREATE POLICY "Admin can view activity logs" ON public.activity_logs
  FOR SELECT USING (public.get_my_role() = 'admin');
CREATE POLICY "Admin can view payments" ON public.payments
  FOR SELECT USING (public.get_my_role() = 'admin');
CREATE POLICY "Admin can view membership expiry" ON public.membership_expiry
  FOR SELECT USING (public.get_my_role() = 'admin');
