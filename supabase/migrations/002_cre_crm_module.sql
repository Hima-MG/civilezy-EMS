-- ============================================================
-- CRE CRM Module: Leads and Lead Notes
-- Run this entire script in your Supabase SQL Editor
-- ============================================================

-- 1. Leads
CREATE TABLE IF NOT EXISTS leads (
  id              UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  name            TEXT        NOT NULL,
  phone           TEXT        NOT NULL,
  email           TEXT,
  course_interest TEXT,
  source          TEXT,
  status          TEXT        NOT NULL DEFAULT 'new'
                              CHECK (status IN ('new','contacted','interested','follow_up','converted','lost')),
  assigned_to     UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Lead Notes
CREATE TABLE IF NOT EXISTS lead_notes (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id     UUID        NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  note        TEXT        NOT NULL,
  created_by  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS leads_created_by_idx  ON leads (created_by);
CREATE INDEX IF NOT EXISTS leads_assigned_to_idx ON leads (assigned_to);
CREATE INDEX IF NOT EXISTS leads_status_idx      ON leads (status);
CREATE INDEX IF NOT EXISTS lead_notes_lead_id_idx ON lead_notes (lead_id);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE leads      ENABLE ROW LEVEL SECURITY;
ALTER TABLE lead_notes ENABLE ROW LEVEL SECURITY;

-- ── Leads policies ────────────────────────────────────────────

DROP POLICY IF EXISTS "CRE can view own leads"   ON leads;
DROP POLICY IF EXISTS "CRE can insert own leads"  ON leads;
DROP POLICY IF EXISTS "CRE can update own leads"  ON leads;
DROP POLICY IF EXISTS "Admin can view all leads"  ON leads;

-- CRE sees leads they created or are assigned to
CREATE POLICY "CRE can view own leads" ON leads
  FOR SELECT USING (
    auth.uid() = created_by OR auth.uid() = assigned_to
  );

CREATE POLICY "CRE can insert own leads" ON leads
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "CRE can update own leads" ON leads
  FOR UPDATE USING (
    auth.uid() = created_by OR auth.uid() = assigned_to
  );

-- Admin / HR can view all leads
CREATE POLICY "Admin can view all leads" ON leads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'hr_finance')
    )
  );

-- ── Lead Notes policies ───────────────────────────────────────

DROP POLICY IF EXISTS "CRE can view notes on own leads"   ON lead_notes;
DROP POLICY IF EXISTS "CRE can insert notes on own leads"  ON lead_notes;
DROP POLICY IF EXISTS "Admin can view all notes"           ON lead_notes;

CREATE POLICY "CRE can view notes on own leads" ON lead_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_notes.lead_id
        AND (leads.created_by = auth.uid() OR leads.assigned_to = auth.uid())
    )
  );

CREATE POLICY "CRE can insert notes on own leads" ON lead_notes
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = lead_notes.lead_id
        AND (leads.created_by = auth.uid() OR leads.assigned_to = auth.uid())
    )
  );

CREATE POLICY "Admin can view all notes" ON lead_notes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('admin', 'hr_finance')
    )
  );
