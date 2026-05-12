-- ============================================================
-- HR + Finance Module: Salary Records + HR RLS Policies
-- Run this entire script in your Supabase SQL Editor
-- ============================================================

-- 1. Salary Records
CREATE TABLE IF NOT EXISTS salary_records (
  id            UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  month         TEXT         NOT NULL,          -- "YYYY-MM" format, e.g. "2026-05"
  working_days  INTEGER      NOT NULL CHECK (working_days > 0),
  present_days  INTEGER      NOT NULL CHECK (present_days >= 0),
  base_salary   NUMERIC(12,2) NOT NULL CHECK (base_salary >= 0),
  bonus         NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (bonus >= 0),
  deductions    NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (deductions >= 0),
  final_salary  NUMERIC(12,2) NOT NULL CHECK (final_salary >= 0),
  status        TEXT         NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'paid')),
  created_at    TIMESTAMPTZ  DEFAULT NOW(),
  CONSTRAINT salary_user_month_unique UNIQUE (user_id, month)
);

-- Indexes
CREATE INDEX IF NOT EXISTS salary_records_user_id_idx ON salary_records (user_id);
CREATE INDEX IF NOT EXISTS salary_records_month_idx   ON salary_records (month);

-- ============================================================
-- Row Level Security — salary_records
-- ============================================================
ALTER TABLE salary_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "HR can view all salary records"   ON salary_records;
DROP POLICY IF EXISTS "HR can insert salary records"     ON salary_records;
DROP POLICY IF EXISTS "HR can update salary records"     ON salary_records;
DROP POLICY IF EXISTS "Employees can view own salary"    ON salary_records;

CREATE POLICY "Employees can view own salary" ON salary_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "HR can view all salary records" ON salary_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('hr_finance', 'admin')
    )
  );

CREATE POLICY "HR can insert salary records" ON salary_records
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('hr_finance', 'admin')
    )
  );

CREATE POLICY "HR can update salary records" ON salary_records
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('hr_finance', 'admin')
    )
  );

-- ============================================================
-- Extend profiles RLS so HR can read all employee profiles
-- ============================================================
DROP POLICY IF EXISTS "HR can view all profiles" ON profiles;

CREATE POLICY "HR can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p2
      WHERE p2.id = auth.uid()
        AND p2.role IN ('hr_finance', 'admin')
    )
  );

-- ============================================================
-- Extend leave_requests: HR can also delete (for cleanup)
-- ============================================================
DROP POLICY IF EXISTS "HR can delete leaves" ON leave_requests;

CREATE POLICY "HR can delete leaves" ON leave_requests
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('hr_finance', 'admin')
    )
  );
