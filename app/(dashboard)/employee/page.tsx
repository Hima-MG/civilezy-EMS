import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { EmployeeTabs } from "@/components/employee/employee-tabs";
import type {
  UserProfile,
  Role,
  AttendanceRecord,
  LeaveRequest,
  DailyTask,
} from "@/types";

export const metadata: Metadata = { title: "Employee Dashboard" };

export default async function EmployeeDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const userProfile = profile as UserProfile;
  const role = userProfile.role as Role;

  // ── Date helpers ──────────────────────────────────────────
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const startOfMonth = `${year}-${month}-01`;
  const startOfYear = `${year}-01-01`;

  // ── Fetch all employee module data in parallel ────────────
  const [
    todayAttRes,
    presentDaysRes,
    totalLeavesRes,
    pendingTasksRes,
    attendanceHistRes,
    leaveHistRes,
    tasksRes,
  ] = await Promise.all([
    // Today's attendance record
    supabase
      .from("attendance")
      .select("*")
      .eq("user_id", user.id)
      .eq("attendance_date", today)
      .maybeSingle(),

    // Days present this month
    supabase
      .from("attendance")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("attendance_date", startOfMonth)
      .not("punch_in", "is", null),

    // Approved leaves this year
    supabase
      .from("leave_requests")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "approved")
      .gte("from_date", startOfYear),

    // Pending tasks count
    supabase
      .from("daily_tasks")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("status", "pending"),

    // Attendance history (last 30 records)
    supabase
      .from("attendance")
      .select("*")
      .eq("user_id", user.id)
      .order("attendance_date", { ascending: false })
      .limit(30),

    // Leave history (latest 20)
    supabase
      .from("leave_requests")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),

    // All tasks
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
      />
    </DashboardLayout>
  );
}
