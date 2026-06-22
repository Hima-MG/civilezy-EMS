import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/services/auth.service";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { unwrap } from "@/lib/supabase/query";
import type {
  UserProfile,
  AttendanceRecord,
  LeaveRequest,
  SalaryRecord,
  Lead,
  AdminStats,
  AdminActivityItem,
  RoleDistributionPoint,
  LeadStatusPoint,
  AttendanceTrendPoint,
  MonthlyPayrollPoint,
} from "@/types";

export const metadata: Metadata = { title: "Admin Dashboard" };
export const dynamic = "force-dynamic";

const ROLE_COLORS: Record<string, string> = {
  employee: "#3b82f6",
  cre: "#a855f7",
  hr_finance: "#10b981",
  admin: "#f97316",
};

const ROLE_LABELS: Record<string, string> = {
  employee: "Employee",
  cre: "CRE",
  hr_finance: "HR Finance",
  admin: "Admin",
};

const LEAD_STATUS_COLORS: Record<string, string> = {
  new: "#3b82f6",
  contacted: "#a855f7",
  interested: "#22c55e",
  follow_up: "#eab308",
  converted: "#10b981",
  lost: "#ef4444",
};

const LEAD_STATUS_LABELS: Record<string, string> = {
  new: "New",
  contacted: "Contacted",
  interested: "Interested",
  follow_up: "Follow Up",
  converted: "Converted",
  lost: "Lost",
};

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

export default async function AdminDashboard() {
  const { supabase, user, profile: userProfile, role } = await getAuthContext();

  if (!user || !userProfile || !role || userProfile.is_active === false) {
    redirect("/login");
  }

  // Role gate is centralized in app/(dashboard)/admin/layout.tsx

  // ── Date helpers (before Promise.all — used in query filters) ─
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const currentMonth = now.toISOString().slice(0, 7);

  const sixMonthsAgoStart = (() => {
    const d = new Date(now);
    d.setMonth(d.getMonth() - 5);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  })();
  const sixMonthsAgoKey = sixMonthsAgoStart.slice(0, 7);

  const [
    profilesResult,
    attendanceResult,
    leavesResult,
    salaryResult,
    leadsResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, role, is_active, employee_category, phone, department, created_at")
      .order("created_at", { ascending: false }),

    // Only columns used by analytics — skips punch_out, total_hours
    supabase
      .from("attendance")
      .select("id, user_id, attendance_date, punch_in, status, created_at")
      .gte("attendance_date", sixMonthsAgoStart)
      .order("attendance_date", { ascending: false }),

    // Leave requests — capped at 500 to bound payload size
    supabase
      .from("leave_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500),

    // Only columns used by analytics — skips base_salary, bonus, deductions, etc.
    supabase
      .from("salary_records")
      .select("id, user_id, month, final_salary, status, created_at")
      .gte("month", sixMonthsAgoKey)
      .order("created_at", { ascending: false }),

    // Only columns used by analytics — skips email, phone
    supabase
      .from("leads")
      .select("id, name, course_interest, source, status, created_by, created_at")
      .order("created_at", { ascending: false }),
  ]);

  const allProfiles = unwrap(profilesResult, "profiles") as UserProfile[];
  const rawAttendance = unwrap(attendanceResult, "attendance") as AttendanceRecord[];
  const rawLeaves = unwrap(leavesResult, "leave requests") as LeaveRequest[];
  const rawSalary = unwrap(salaryResult, "salary records") as SalaryRecord[];
  const rawLeads = unwrap(leadsResult, "leads") as Lead[];

  // ── Profile lookup map ─────────────────────────────────────
  const profileMap = new Map(allProfiles.map((p) => [p.id, p]));

  // ── Stats ──────────────────────────────────────────────────
  const stats: AdminStats = {
    totalEmployees: allProfiles.filter((p) => p.role !== "admin").length,
    totalLeads: rawLeads.length,
    attendanceToday: rawAttendance.filter(
      (a) => a.attendance_date === today && a.status === "present"
    ).length,
    pendingLeaves: rawLeaves.filter((l) => l.status === "pending").length,
    monthlyPayroll: rawSalary
      .filter((s) => s.month === currentMonth)
      .reduce((sum, s) => sum + s.final_salary, 0),
    convertedLeads: rawLeads.filter((l) => l.status === "converted").length,
  };

  // ── Role distribution chart ────────────────────────────────
  const roleCountMap: Record<string, number> = {
    employee: 0,
    cre: 0,
    hr_finance: 0,
    admin: 0,
  };
  allProfiles.forEach((p) => {
    roleCountMap[p.role] = (roleCountMap[p.role] ?? 0) + 1;
  });
  const roleDistribution: RoleDistributionPoint[] = Object.entries(
    roleCountMap
  ).map(([r, count]) => ({
    role: ROLE_LABELS[r] ?? r,
    count,
    color: ROLE_COLORS[r] ?? "#6b7280",
  }));

  // ── Lead status distribution chart ────────────────────────
  const statusCountMap: Record<string, number> = {};
  rawLeads.forEach((l) => {
    statusCountMap[l.status] = (statusCountMap[l.status] ?? 0) + 1;
  });
  const leadStatusData: LeadStatusPoint[] = Object.keys(
    LEAD_STATUS_LABELS
  ).map((status) => ({
    status: LEAD_STATUS_LABELS[status],
    count: statusCountMap[status] ?? 0,
    color: LEAD_STATUS_COLORS[status] ?? "#6b7280",
  }));

  // ── Attendance trend (last 6 months) ──────────────────────
  const attendanceTrend: AttendanceTrendPoint[] = Array.from(
    { length: 6 },
    (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("en-IN", {
        month: "short",
        year: "2-digit",
      });
      const present = rawAttendance.filter(
        (a) => a.attendance_date.startsWith(key) && a.status === "present"
      ).length;
      return { month: label, present };
    }
  );

  // ── Payroll trend (last 6 months) ─────────────────────────
  const payrollTrend: MonthlyPayrollPoint[] = Array.from(
    { length: 6 },
    (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("en-IN", {
        month: "short",
        year: "2-digit",
      });
      const total = rawSalary
        .filter((s) => s.month === key)
        .reduce((sum, s) => sum + s.final_salary, 0);
      return { month: label, total };
    }
  );

  // ── Recent activity items ──────────────────────────────────
  const recentAttendance: AdminActivityItem[] = rawAttendance
    .slice(0, 10)
    .map((a) => ({
      id: a.id,
      type: "attendance" as const,
      name: profileMap.get(a.user_id)?.full_name ?? "Unknown",
      detail: `${fmtDate(a.attendance_date)} · ${a.punch_in ? "Punched in" : "No punch"}`,
      status: a.status,
      time: a.created_at,
    }));

  const recentLeaves: AdminActivityItem[] = rawLeaves.slice(0, 10).map((l) => ({
    id: l.id,
    type: "leave" as const,
    name: profileMap.get(l.user_id)?.full_name ?? "Unknown",
    detail: `${l.leave_type} · ${fmtDate(l.from_date)}`,
    status: l.status,
    time: l.created_at,
  }));

  const recentLeads: AdminActivityItem[] = rawLeads.slice(0, 10).map((l) => ({
    id: l.id,
    type: "lead" as const,
    name: l.name,
    detail:
      [l.course_interest, l.source].filter(Boolean).join(" · ") || "New Lead",
    status: l.status,
    time: l.created_at,
  }));

  const recentSalary: AdminActivityItem[] = rawSalary.slice(0, 10).map((s) => ({
    id: s.id,
    type: "salary" as const,
    name: profileMap.get(s.user_id)?.full_name ?? "Unknown",
    detail: `${s.month} · ₹${new Intl.NumberFormat("en-IN").format(s.final_salary)}`,
    status: s.status,
    time: s.created_at,
  }));

  // ── Enrich leaves and salary with names for admin tabs ────────
  const leavesEnriched = rawLeaves.slice(0, 200).map((l) => ({
    ...l,
    full_name: profileMap.get(l.user_id)?.full_name ?? "Unknown",
    email: profileMap.get(l.user_id)?.email ?? "",
  }));

  const salaryEnriched = rawSalary.slice(0, 200).map((s) => ({
    ...s,
    full_name: profileMap.get(s.user_id)?.full_name ?? "Unknown",
    email: profileMap.get(s.user_id)?.email ?? "",
  }));

  // ── CRM: per-CRE lead counts ────────────────────────────────
  const creLeadCounts: Record<string, { name: string; total: number; converted: number }> = {};
  for (const lead of rawLeads) {
    const creId = lead.created_by;
    if (!creLeadCounts[creId]) {
      creLeadCounts[creId] = {
        name: profileMap.get(creId)?.full_name ?? "Unknown",
        total: 0,
        converted: 0,
      };
    }
    creLeadCounts[creId].total += 1;
    if (lead.status === "converted") creLeadCounts[creId].converted += 1;
  }
  const topCre = Object.entries(creLeadCounts)
    .map(([id, v]) => ({ id, ...v }))
    .sort((a, b) => b.converted - a.converted)
    .slice(0, 5);

  return (
    <DashboardLayout
      profile={userProfile}
      role={role}
      title="Admin Dashboard"
      description="Organisation-wide overview"
    >
      <AdminTabs
        stats={stats}
        users={allProfiles}
        currentUserId={user.id}
        roleDistribution={roleDistribution}
        leadStatusData={leadStatusData}
        attendanceTrend={attendanceTrend}
        payrollTrend={payrollTrend}
        recentAttendance={recentAttendance}
        recentLeaves={recentLeaves}
        recentLeads={recentLeads}
        recentSalary={recentSalary}
        leavesEnriched={leavesEnriched}
        salaryEnriched={salaryEnriched}
        topCre={topCre}
      />
    </DashboardLayout>
  );
}
