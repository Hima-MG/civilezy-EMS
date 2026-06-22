-- ============================================================
-- Migration 010: Dashboard aggregation views
--
-- Moves a few hot aggregations (lead status distribution, monthly
-- payroll totals, monthly attendance presence) out of "fetch every
-- row and reduce in JS" and into the database, where Postgres can
-- aggregate without shipping full row sets over the wire.
--
-- security_invoker = true (PG15+) makes each view respect the RLS
-- policies of the querying user on the underlying tables — a CRE
-- querying lead_status_summary only ever sees counts for their own
-- leads, exactly as the existing leads RLS policies intend.
-- ============================================================

CREATE OR REPLACE VIEW public.lead_status_summary
WITH (security_invoker = true) AS
SELECT status, count(*) AS count
FROM public.leads
GROUP BY status;

CREATE OR REPLACE VIEW public.lead_monthly_summary
WITH (security_invoker = true) AS
SELECT to_char(created_at, 'YYYY-MM') AS month, count(*) AS count
FROM public.leads
GROUP BY to_char(created_at, 'YYYY-MM');

CREATE OR REPLACE VIEW public.monthly_payroll_summary
WITH (security_invoker = true) AS
SELECT month, sum(final_salary) AS total
FROM public.salary_records
GROUP BY month;

CREATE OR REPLACE VIEW public.monthly_attendance_summary
WITH (security_invoker = true) AS
SELECT to_char(attendance_date, 'YYYY-MM') AS month, status, count(*) AS count
FROM public.attendance
GROUP BY to_char(attendance_date, 'YYYY-MM'), status;
