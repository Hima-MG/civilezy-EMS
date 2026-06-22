-- ============================================================
-- Migration 012: Backfill unknown event_type
--
-- Rows captured before route-based event identification (no
-- [eventType] URL segment, no discriminator field in the payload)
-- were stored with event_type = NULL. The app now always writes a
-- non-null event_type ("unknown" or "unknown:<segment>"), so
-- normalize the historical rows to match — keeps the admin filter
-- UI from needing a separate "is null" case.
-- ============================================================

UPDATE public.webhook_logs
SET event_type = 'unknown'
WHERE event_type IS NULL;
