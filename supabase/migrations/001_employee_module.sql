-- ============================================================
-- Employee Module: Attendance, Leave Requests, Daily Tasks
-- Run this entire script in your Supabase SQL Editor
-- ============================================================

-- 1. Attendance
CREATE TABLE IF NOT EXISTS attendance (
  id               UUID         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id          UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  attendance_date  DATE         NOT NULL DEFAULT CURRENT_DATE,
  punch_in         TIMESTAMPTZ,
  punch_out        TIMESTAMPTZ,
  total_hours      NUMERIC(4,2),
  status           TEXT         NOT NULL DEFAULT 'present'
                                CHECK (status IN ('present','absent','half_day','late')),
  created_at       TIMESTAMPTZ  DEFAULT NOW(),
  CONSTRAINT attendance_user_date_unique UNIQUE (user_id, attendance_date)
);

-- 2. Leave Requests
CREATE TABLE IF NOT EXISTS leave_requests (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leave_type  TEXT        NOT NULL
              CHECK (leave_type IN ('casual','sick','earned','maternity','paternity','other')),
  from_date   DATE        NOT NULL,
  to_date     DATE        NOT NULL,
  reason      TEXT        NOT NULL,
  status      TEXT        NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','approved','rejected')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Daily Tasks
CREATE TABLE IF NOT EXISTS daily_tasks (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT        NOT NULL,
  description TEXT,
  status      TEXT        NOT NULL DEFAULT 'pending'
              CHECK (status IN ('pending','in_progress','completed')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE attendance    ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_tasks   ENABLE ROW LEVEL SECURITY;

-- Attendance policies
DROP POLICY IF EXISTS "Users can view own attendance"   ON attendance;
DROP POLICY IF EXISTS "Users can insert own attendance" ON attendance;
DROP POLICY IF EXISTS "Users can update own attendance" ON attendance;

CREATE POLICY "Users can view own attendance"   ON attendance FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own attendance" ON attendance FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own attendance" ON attendance FOR UPDATE USING (auth.uid() = user_id);

-- Leave policies
DROP POLICY IF EXISTS "Users can view own leaves"   ON leave_requests;
DROP POLICY IF EXISTS "Users can insert own leaves"  ON leave_requests;

CREATE POLICY "Users can view own leaves"  ON leave_requests FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own leaves" ON leave_requests FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Task policies
DROP POLICY IF EXISTS "Users can view own tasks"   ON daily_tasks;
DROP POLICY IF EXISTS "Users can insert own tasks"  ON daily_tasks;
DROP POLICY IF EXISTS "Users can update own tasks"  ON daily_tasks;
DROP POLICY IF EXISTS "Users can delete own tasks"  ON daily_tasks;

CREATE POLICY "Users can view own tasks"   ON daily_tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tasks"  ON daily_tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tasks"  ON daily_tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tasks"  ON daily_tasks FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- HR Finance: allow managers to view/update employee leaves
-- ============================================================
DROP POLICY IF EXISTS "HR can view all leaves"   ON leave_requests;
DROP POLICY IF EXISTS "HR can update leave status" ON leave_requests;

CREATE POLICY "HR can view all leaves" ON leave_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('hr_finance', 'admin')
    )
  );

CREATE POLICY "HR can update leave status" ON leave_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('hr_finance', 'admin')
    )
  );

-- HR can view all attendance
DROP POLICY IF EXISTS "HR can view all attendance" ON attendance;

CREATE POLICY "HR can view all attendance" ON attendance
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('hr_finance', 'admin')
    )
  );
