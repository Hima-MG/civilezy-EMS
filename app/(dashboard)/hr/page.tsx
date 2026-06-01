import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/services/auth.service";
import { getRoleDashboardPath } from "@/lib/utils";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { HrTabs } from "@/components/hr/hr-tabs";
import type {
  UserProfile,
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
export const dynamic = "force-dynamic";

export default async function HRDashboard() {
  const { supabase, user, profile: userProfile, role } = await getAuthContext();

  if (!user || !userProfile || !role || userProfile.is_active === false) {
    redirect("/login");
  }

  if (role !== "hr_finance" && role !== "admin") {
    redirect(getRoleDashboardPath(role));
  }

  // ── Date helpers (before Promise.all — used in query filters) ─
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7); // "YYYY-MM"
  const today = now.toISOString().slice(0, 10);       // "YYYY-MM-DD"

  // Attendance window: first day of 5 months ago → covers 6 rolling months.
  const sixMonthsAgoStart = (() => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 5);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  })();

  // ── All queries in one parallel batch (profile + data) ───────
  const [
    profilesResult, attendanceResult, leavesResult, salaryResult,
    hrTodayAttRes, hrAttHistRes, hrLeaveHistRes,
  ] =
    await Promise.all([
      // All active employee profiles
      supabase
        .from("profiles")
        .select("*")
        .eq("is_active", true)
        .order("full_name", { ascending: true }),

      // Attendance for last 6 months (all staff)
      supabase
        .from("attendance")
        .select("*")
        .gte("attendance_date", sixMonthsAgoStart)
        .order("attendance_date", { ascending: false }),

      // Leave requests — capped at 500
      supabase
        .from("leave_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500),

      // All salary records
      supabase
        .from("salary_records")
        .select("*")
        .order("month", { ascending: false }),

      // HR's personal attendance today
      supabase
        .from("attendance")
        .select("*")
        .eq("user_id", user.id)
        .eq("attendance_date", today)
        .maybeSingle(),

      // HR's attendance history (last 30 days)
      supabase
        .from("attendance")
        .select("*")
        .eq("user_id", user.id)
        .order("attendance_date", { ascending: false })
        .limit(30),

      // HR's personal leave history
      supabase
        .from("leave_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  const allProfiles = (profilesResult.data ?? []) as UserProfile[];
  const rawAttendance = (attendanceResult.data ?? []) as AttendanceRecord[];
  const rawLeaves = (leavesResult.data ?? []) as LeaveRequest[];
  const rawSalary = (salaryResult.data ?? []) as SalaryRecord[];

  const hrTodayRecord = (hrTodayAttRes.data ?? null) as AttendanceRecord | null;
  const hrAttendanceHistory = (hrAttHistRes.data ?? []) as AttendanceRecord[];
  const hrLeaveHistory = (hrLeaveHistRes.data ?? []) as LeaveRequest[];

  // Employee-only profiles for dropdowns (exclude admin / hr from lists)
  const employeeProfiles = allProfiles.filter(
    (p) => p.role === "employee" || p.role === "cre"
  );

  // Filter leaves to only employee/cre for HR's leave management view
  const employeeUserIds = new Set(employeeProfiles.map((p) => p.id));

  // ── Build name lookup map ──────────────────────────────────
  const profileMap = new Map(allProfiles.map((p) => [p.id, p]));

  const attendance: AttendanceWithProfile[] = rawAttendance.map((a) => ({
    ...a,
    full_name: profileMap.get(a.user_id)?.full_name ?? "",
    email: profileMap.get(a.user_id)?.email ?? "",
  }));

  // Only employee/cre leaves for HR's leave management (HR leaves go to admin)
  const leaves: LeaveWithProfile[] = rawLeaves
    .filter((l) => employeeUserIds.has(l.user_id))
    .map((l) => ({
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

  // pendingLeaves counts only employee/cre leaves (HR leaves go to admin)
  const employeePendingLeaves = leaves.filter((l) => l.status === "pending").length;

  const analytics: HrAnalytics = {
    totalEmployees,
    pendingLeaves: employeePendingLeaves,
    presentToday,
    monthlyPayroll,
  };

  // ── Monthly payroll chart data (last 6 months) ─────────────
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
        hrTodayRecord={hrTodayRecord}
        hrAttendanceHistory={hrAttendanceHistory}
        hrLeaveHistory={hrLeaveHistory}
      />
    </DashboardLayout>
  );
}
