-- ============================================================
-- Migration 011: Webhook discovery infrastructure
--
-- EzyCourse has no REST/GraphQL API — only outbound "Data Out"
-- webhooks whose exact payload shape is unknown. This table exists
-- to capture every raw payload byte-for-byte BEFORE we design any
-- typed schema around it. Steps 2+ of the EzyCourse integration
-- (students/purchases/payments tables, processing logic) are
-- deliberately deferred until real captured payloads in this table
-- tell us what fields EzyCourse actually sends.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source       text NOT NULL DEFAULT 'ezycourse',
  event_type   text,
  payload      jsonb NOT NULL,
  headers      jsonb NOT NULL,
  processed    boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhook_logs_source_idx ON public.webhook_logs (source);
CREATE INDEX IF NOT EXISTS webhook_logs_event_type_idx ON public.webhook_logs (event_type);
CREATE INDEX IF NOT EXISTS webhook_logs_processed_idx ON public.webhook_logs (processed);
CREATE INDEX IF NOT EXISTS webhook_logs_created_at_idx ON public.webhook_logs (created_at DESC);

ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;

-- Diagnostic data — admin only. The webhook endpoint itself writes via
-- the service-role client (EzyCourse calls it unauthenticated, with no
-- Supabase session), so no INSERT policy is needed or granted here.
CREATE POLICY "Admin can view webhook logs" ON public.webhook_logs
  FOR SELECT USING (public.get_my_role() = 'admin');
