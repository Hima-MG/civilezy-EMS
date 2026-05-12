import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { HrTabs } from "@/components/hr/hr-tabs";
import type {
  UserProfile,
  Role,
  AttendanceRecord,
  LeaveRequest,
  SalaryRecord,
  AttendanceWithProfile,
  LeaveWithProfile,
  SalaryWithProfile,
  HrAnalytics,
  MonthlyPayrollPoint,
} from "@/types";

export const metadata: Metadata = { title: "HR & Finance Dashboard" };

export default async function HRDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // Fetch current user's profile + role check
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const userProfile = profile as UserProfile;
  const role = userProfile.role as Role;

  // Only hr_finance and admin may access this page
  if (role !== "hr_finance" && role !== "admin") {
    redirect("/employee");
  }

  // ── Parallel data fetching ─────────────────────────────────
  const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const today = new Date().toISOString().slice(0, 10);       // "YYYY-MM-DD"

  // Attendance window: first day of 5 months ago → covers 6 rolling months.
  // This gives the salary form enough data to auto-fill present_days for any
  // month in that window, and lets HR browse/filter older records.
  const sixMonthsAgoStart = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 5);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  })();

  const [profilesResult, attendanceResult, leavesResult, salaryResult] =
    await Promise.all([
      // All employee profiles (fixed HR RLS policy via get_my_role())
      supabase
        .from("profiles")
        .select("*")
        .eq("is_active", true)
        .order("full_name", { ascending: true }),

      // Attendance for last 6 months (was: current month only)
      supabase
        .from("attendance")
        .select("*")
        .gte("attendance_date", sixMonthsAgoStart)
        .order("attendance_date", { ascending: false }),

      // All leave requests
      supabase
        .from("leave_requests")
        .select("*")
        .order("created_at", { ascending: false }),

      // All salary records
      supabase
        .from("salary_records")
        .select("*")
        .order("month", { ascending: false }),
    ]);

  const allProfiles = (profilesResult.data ?? []) as UserProfile[];
  const rawAttendance = (attendanceResult.data ?? []) as AttendanceRecord[];
  const rawLeaves = (leavesResult.data ?? []) as LeaveRequest[];
  const rawSalary = (salaryResult.data ?? []) as SalaryRecord[];

  // Employee-only profiles for dropdowns (exclude admin / hr from lists)
  const employeeProfiles = allProfiles.filter(
    (p) => p.role === "employee" || p.role === "cre"
  );

  // ── Build name lookup map ──────────────────────────────────
  const profileMap = new Map(allProfiles.map((p) => [p.id, p]));

  const attendance: AttendanceWithProfile[] = rawAttendance.map((a) => ({
    ...a,
    full_name: profileMap.get(a.user_id)?.full_name ?? "",
    email: profileMap.get(a.user_id)?.email ?? "",
  }));

  const leaves: LeaveWithProfile[] = rawLeaves.map((l) => ({
    ...l,
    full_name: profileMap.get(l.user_id)?.full_name ?? "",
    email: profileMap.get(l.user_id)?.email ?? "",
  }));

  const salaryRecords: SalaryWithProfile[] = rawSalary.map((s) => ({
    ...s,
    full_name: profileMap.get(s.user_id)?.full_name ?? "",
    email: profileMap.get(s.user_id)?.email ?? "",
  }));

  // ── Analytics ──────────────────────────────────────────────
  const totalEmployees = employeeProfiles.length;
  const pendingLeaves = rawLeaves.filter((l) => l.status === "pending").length;
  const presentToday = rawAttendance.filter(
    (a) => a.attendance_date === today && a.status === "present"
  ).length;
  const monthlyPayroll = rawSalary
    .filter((s) => s.month === currentMonth)
    .reduce((sum, s) => sum + s.final_salary, 0);

  const analytics: HrAnalytics = {
    totalEmployees,
    pendingLeaves,
    presentToday,
    monthlyPayroll,
  };

  // ── Monthly payroll chart data (last 6 months) ─────────────
  const now = new Date();
  const monthlyPayrollData: MonthlyPayrollPoint[] = Array.from(
    { length: 6 },
    (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
      return {
        month: label,
        total: rawSalary
          .filter((s) => s.month === key)
          .reduce((sum, s) => sum + s.final_salary, 0),
      };
    }
  );

  return (
    <DashboardLayout
      profile={userProfile}
      role={role}
      title="HR & Finance"
      description="Human Resources and Financial Overview"
    >
      <HrTabs
        profiles={employeeProfiles}
        attendance={attendance}
        leaves={leaves}
        salaryRecords={salaryRecords}
        analytics={analytics}
        monthlyPayrollData={monthlyPayrollData}
      />
    </DashboardLayout>
  );
}
