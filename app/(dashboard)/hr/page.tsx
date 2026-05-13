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

export default async function HRDashboard({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

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
  // Profile and all data queries run together — saves one sequential RTT vs.
  // the old pattern of fetching the profile first, then starting the data.
  const [profileResult, profilesResult, attendanceResult, leavesResult, salaryResult] =
    await Promise.all([
      // Current user's profile (for role check)
      supabase.from("profiles").select("*").eq("id", user.id).single(),

      // All active employee profiles (fixed HR RLS policy via get_my_role())
      supabase
        .from("profiles")
        .select("*")
        .eq("is_active", true)
        .order("full_name", { ascending: true }),

      // Attendance for last 6 months
      supabase
        .from("attendance")
        .select("*")
        .gte("attendance_date", sixMonthsAgoStart)
        .order("attendance_date", { ascending: false }),

      // Leave requests — capped at 500 to bound payload size
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
    ]);

  if (!profileResult.data) redirect("/login");
  const userProfile = profileResult.data as UserProfile;
  const role = userProfile.role as Role;

  // Only hr_finance and admin may access this page
  if (role !== "hr_finance" && role !== "admin") {
    redirect("/employee");
  }

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

  const VALID_TABS = ["overview", "attendance", "leaves", "payroll", "employees", "payments"] as const;
  type ValidTab = typeof VALID_TABS[number];
  const defaultTab: ValidTab = VALID_TABS.includes(tab as ValidTab) ? (tab as ValidTab) : "overview";

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
        defaultTab={defaultTab}
      />
    </DashboardLayout>
  );
}
