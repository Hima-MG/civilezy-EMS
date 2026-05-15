import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/services/auth.service";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { EmployeeTabs } from "@/components/employee/employee-tabs";
import type {
  AttendanceRecord,
  LeaveRequest,
  DailyTask,
} from "@/types";

export const metadata: Metadata = { title: "Employee Dashboard" };
export const dynamic = "force-dynamic";

export default async function EmployeeDashboard() {
  const { supabase, user, profile: userProfile, role } = await getAuthContext();

  if (!user || !userProfile || !role || userProfile.is_active === false) {
    redirect("/login");
  }

  // ── Date helpers ──────────────────────────────────────────
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const startOfMonth = `${year}-${month}-01`;
  const startOfYear = `${year}-01-01`;

  // ── All queries in one parallel batch (profile + data) ───
  const [
    todayAttRes,
    presentDaysRes,
    totalLeavesRes,
    pendingTasksRes,
    attendanceHistRes,
    leaveHistRes,
    tasksRes,
  ] = await Promise.all([
    supabase
      .from("attendance")
      .select("*")
      .eq("user_id", user.id)
      .eq("attendance_date", today)
      .maybeSingle(),

    supabase
      .from("attendance")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("attendance_date", startOfMonth)
      .not("punch_in", "is", null),

    supabase
      .from("leave_requests")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "approved")
      .gte("from_date", startOfYear),

    supabase
      .from("daily_tasks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "pending"),

    supabase
      .from("attendance")
      .select("*")
      .eq("user_id", user.id)
      .order("attendance_date", { ascending: false })
      .limit(30),

    supabase
      .from("leave_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),

    supabase
      .from("daily_tasks")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  // ── Derive summary stats ──────────────────────────────────
  const todayRecord = (todayAttRes.data ?? null) as AttendanceRecord | null;

  const presentDays = presentDaysRes.count ?? 0;
  const totalLeaves = totalLeavesRes.count ?? 0;
  const pendingTasks = pendingTasksRes.count ?? 0;

  const todayHours =
    todayRecord?.total_hours != null
      ? `${todayRecord.total_hours}h`
      : todayRecord?.punch_in
      ? "In progress"
      : "—";

  const attendanceHistory = (attendanceHistRes.data ?? []) as AttendanceRecord[];
  const leaveHistory = (leaveHistRes.data ?? []) as LeaveRequest[];
  const tasks = (tasksRes.data ?? []) as DailyTask[];

  return (
    <DashboardLayout
      profile={userProfile}
      role={role}
      title="My Dashboard"
      description={`Welcome back, ${userProfile.full_name?.split(" ")[0] ?? "there"}`}
    >
      <EmployeeTabs
        todayRecord={todayRecord}
        attendanceHistory={attendanceHistory}
        leaveHistory={leaveHistory}
        tasks={tasks}
        stats={{ presentDays, totalLeaves, todayHours, pendingTasks }}
        profile={userProfile}
      />
    </DashboardLayout>
  );
}
