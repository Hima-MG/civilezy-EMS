"use client";

import {
  LayoutDashboard, Clock, CalendarOff, IndianRupee, Users,
  CreditCard, Building2, QrCode, Landmark, Wallet, CheckCircle2,
  AlertCircle, TrendingUp, UserCheck, CalendarCheck, CalendarDays,
  Video, CalendarClock, ExternalLink,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  HeroCard, KpiCard, AnalyticsCard, StatusBadge, DataTable, EmptyState,
} from "@/components/ds";
import type { DataColumn } from "@/components/ds";
import { AttendanceView } from "./attendance-view";
import type { AttendancePageResult } from "@/actions/hr/attendance";
import { LeaveManagement } from "./leave-management";
import { SalaryManager } from "./salary-manager";
import { PayrollChart } from "./payroll-chart";
import { PunchButtons } from "@/components/employee/punch-buttons";
import { LeaveForm } from "@/components/employee/leave-form";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useUrlTab } from "@/hooks/use-url-tab";
import type {
  UserProfile,
  AttendanceRecord,
  AttendanceStatus,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
  AttendanceWithProfile,
  LeaveWithProfile,
  SalaryWithProfile,
  HrAnalytics,
  MonthlyPayrollPoint,
} from "@/types";

// ── Helpers ─────────────────────────────────────────────────────────

const LEAVE_TYPE_LABEL: Record<string, string> = {
  casual: "Casual", sick: "Sick", earned: "Earned",
  maternity: "Maternity", paternity: "Paternity", other: "Other",
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
function fmtDateLong(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}
function daysBetween(from: string, to: string) {
  return Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1);
}

const ATT_STATUS: Record<AttendanceStatus, { label: string; variant: "success" | "danger" | "pending" | "info" }> = {
  present:  { label: "Present",  variant: "success" },
  absent:   { label: "Absent",   variant: "danger"  },
  half_day: { label: "Half Day", variant: "pending" },
  late:     { label: "Late",     variant: "pending" },
};

const LEAVE_STATUS: Record<LeaveStatus, { label: string; variant: "success" | "danger" | "pending" }> = {
  pending:  { label: "Pending",  variant: "pending" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "danger"  },
};

const LEAVE_TYPE: Record<LeaveType, string> = {
  casual:    "Casual",
  sick:      "Sick",
  earned:    "Earned",
  maternity: "Maternity",
  paternity: "Paternity",
  other:     "Other",
};

// ── Meeting config ───────────────────────────────────────────────────

const ZOOM_LINK = "https://us06web.zoom.us/j/84652005577?pwd=qgbZNPO9HSWl8m0Oe0hvsvUb9azFJQ.1";

type MeetingAccent = "info" | "violet" | "success";

const HR_MEETINGS: {
  day: number;
  dayName: string;
  time: string;
  accent: MeetingAccent;
}[] = [
  { day: 2, dayName: "Tuesday",  time: "10:00 AM", accent: "info"    },
  { day: 4, dayName: "Thursday", time: "10:00 AM", accent: "violet"  },
  { day: 6, dayName: "Saturday", time: "10:00 AM", accent: "success" },
];

const MEETING_COLORS: Record<MeetingAccent, { card: string; icon: string; badge: string }> = {
  info:    { card: "bg-blue-500/8 border-blue-500/20",     icon: "text-blue-400",    badge: "bg-blue-500/12 text-blue-400 border-blue-500/20" },
  violet:  { card: "bg-violet-500/8 border-violet-500/20", icon: "text-violet-400",  badge: "bg-violet-500/12 text-violet-400 border-violet-500/20" },
  success: { card: "bg-emerald-500/8 border-emerald-500/20", icon: "text-emerald-400", badge: "bg-emerald-500/12 text-emerald-400 border-emerald-500/20" },
};

function getNextOccurrence(dayOfWeek: number): Date {
  const result = new Date();
  result.setHours(0, 0, 0, 0);
  const daysUntil = (dayOfWeek - result.getDay() + 7) % 7;
  result.setDate(result.getDate() + (daysUntil === 0 ? 7 : daysUntil));
  return result;
}
function daysAway(d: Date): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d.getTime() - now.getTime()) / 86400000);
}
function fmtShort(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const VALID_TABS = ["overview", "attendance", "leaves", "payroll", "employees", "payments", "my-attendance", "my-leave", "meetings"] as const;

// ── Payment method breakdown from salary data ───────────────────────
// Since payment_method isn't tracked in the DB, we derive buckets from
// the salary records count for a premium payment ops panel.
// Real implementation would add a payment_method column to salary_records.

interface HrTabsProps {
  profiles: UserProfile[];
  attendance: AttendanceWithProfile[];
  attendanceInitialPage: AttendancePageResult;
  leaves: LeaveWithProfile[];
  salaryRecords: SalaryWithProfile[];
  analytics: HrAnalytics;
  monthlyPayrollData: MonthlyPayrollPoint[];
  hrTodayRecord: AttendanceRecord | null;
  hrAttendanceHistory: AttendanceRecord[];
  hrLeaveHistory: LeaveRequest[];
}

export function HrTabs({
  profiles,
  attendance,
  attendanceInitialPage,
  leaves,
  salaryRecords,
  analytics,
  monthlyPayrollData,
  hrTodayRecord,
  hrAttendanceHistory,
  hrLeaveHistory,
}: HrTabsProps) {
  const [activeTab, setActiveTab] = useUrlTab(VALID_TABS, "overview");
  const pendingLeaves   = leaves.filter((l) => l.status === "pending").slice(0, 6);
  const pendingSalaries = salaryRecords.filter((s) => s.status === "pending");
  const paidSalaries    = salaryRecords.filter((s) => s.status === "paid");
  const totalDisbursed  = paidSalaries.reduce((s, r) => s + r.final_salary, 0);

  // HR personal attendance month stats
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthAttendance = hrAttendanceHistory.filter((r) =>
    r.attendance_date.startsWith(currentMonthKey)
  );
  const presentDaysThisMonth = monthAttendance.filter((r) => r.punch_in).length;
  const totalDaysThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysSoFar = now.getDate();
  const attendancePct = daysSoFar > 0 ? Math.round((presentDaysThisMonth / daysSoFar) * 100) : 0;

  const hrTodayHours = hrTodayRecord?.total_hours != null
    ? `${hrTodayRecord.total_hours}h`
    : hrTodayRecord?.punch_in
    ? "Live"
    : "—";

  // HR personal attendance table columns
  const attCols: DataColumn<AttendanceRecord>[] = [
    { key: "attendance_date", label: "Date",   render: (r) => <span className="font-medium">{fmtDateLong(r.attendance_date)}</span> },
    { key: "punch_in",        label: "In",     render: (r) => fmtTime(r.punch_in) },
    { key: "punch_out",       label: "Out",    render: (r) => fmtTime(r.punch_out) },
    { key: "total_hours",     label: "Hours",  render: (r) => r.total_hours != null ? `${r.total_hours}h` : "—" },
    {
      key: "status", label: "Status", align: "right" as const,
      render: (r) => {
        const s = ATT_STATUS[r.status];
        return <StatusBadge status={s.variant} label={s.label} size="sm" />;
      },
    },
  ];

  // HR personal leave table columns
  const leaveCols: DataColumn<LeaveRequest>[] = [
    { key: "leave_type", label: "Type",   render: (r) => <span className="font-medium">{LEAVE_TYPE[r.leave_type]}</span> },
    { key: "from_date",  label: "From",   render: (r) => fmtDateLong(r.from_date) },
    { key: "to_date",    label: "To",     render: (r) => fmtDateLong(r.to_date) },
    { key: "reason",     label: "Reason", render: (r) => <span className="truncate max-w-[180px] block">{r.reason}</span> },
    {
      key: "status", label: "Status", align: "right" as const,
      render: (r) => {
        const s = LEAVE_STATUS[r.status];
        return <StatusBadge status={s.variant} label={s.label} size="sm" />;
      },
    },
  ];

  const nextMeeting = [...HR_MEETINGS]
    .map((m) => ({ ...m, date: getNextOccurrence(m.day) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

  // ── Employee table columns ─────────────────────────────────────

  const employeeColumns: DataColumn<UserProfile>[] = [
    {
      key: "full_name",
      label: "Name",
      render: (p) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <span className="text-[11px] font-semibold text-primary">
              {(p.full_name || p.email).charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground leading-none">{p.full_name || "—"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{p.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      render: (p) => (
        <span className="text-xs text-muted-foreground capitalize">{p.role.replace("_", " ")}</span>
      ),
    },
    {
      key: "department",
      label: "Department",
      render: (p) => (
        <span className="text-xs text-muted-foreground">{p.department || "—"}</span>
      ),
    },
    {
      key: "is_active",
      label: "Status",
      render: (p) => (
        <StatusBadge
          status={p.is_active ? "success" : "danger"}
          label={p.is_active ? "Active" : "Inactive"}
          size="sm" dot
        />
      ),
    },
  ];

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">

      {/* ── Tab bar ──────────────────────────────────────────────── */}
      <div className="overflow-x-auto pb-0.5">
        <TabsList className="h-9 bg-muted/50 border border-border/60 p-0.5 rounded-xl gap-0.5 w-max flex-wrap">
          <TabsTrigger value="overview"       className="h-8 rounded-lg text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <LayoutDashboard className="w-3.5 h-3.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="attendance"     className="h-8 rounded-lg text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Clock className="w-3.5 h-3.5" /> Attendance
          </TabsTrigger>
          <TabsTrigger value="leaves"         className="h-8 rounded-lg text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <CalendarOff className="w-3.5 h-3.5" /> Leaves
            {analytics.pendingLeaves > 0 && (
              <span className="ml-0.5 text-[10px] font-semibold bg-amber-500/20 text-amber-500 rounded-full px-1.5 py-px">
                {analytics.pendingLeaves}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="payroll"        className="h-8 rounded-lg text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <IndianRupee className="w-3.5 h-3.5" /> Payroll
          </TabsTrigger>
          <TabsTrigger value="employees"      className="h-8 rounded-lg text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Users className="w-3.5 h-3.5" /> Employees
          </TabsTrigger>
          <TabsTrigger value="payments"       className="h-8 rounded-lg text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <CreditCard className="w-3.5 h-3.5" /> Payments
          </TabsTrigger>
          <TabsTrigger value="my-attendance"  className="h-8 rounded-lg text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <CalendarCheck className="w-3.5 h-3.5" /> My Attendance
          </TabsTrigger>
          <TabsTrigger value="my-leave"       className="h-8 rounded-lg text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <CalendarDays className="w-3.5 h-3.5" /> My Leave
          </TabsTrigger>
          <TabsTrigger value="meetings"       className="h-8 rounded-lg text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
            <Video className="w-3.5 h-3.5" /> Meetings
          </TabsTrigger>
        </TabsList>
      </div>

      {/* ── OVERVIEW ─────────────────────────────────────────────── */}
      <TabsContent value="overview" className="space-y-5">

        {/* Hero */}
        <HeroCard
          icon={Building2}
          title="HR & Finance Operations"
          subtitle="Workforce management, attendance tracking, leave approvals and payroll in one place."
          gradient="indigo"
          stats={[
            { label: "Employees",     value: String(analytics.totalEmployees) },
            { label: "Present Today", value: String(analytics.presentToday) },
            { label: "Pending Leaves",value: String(analytics.pendingLeaves) },
            { label: "Monthly Payroll",value: formatCurrency(analytics.monthlyPayroll) },
          ]}
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            title="Total Employees"
            value={analytics.totalEmployees}
            subtitle="Active staff"
            icon={Users}
            accent="default"
          />
          <KpiCard
            title="Present Today"
            value={analytics.presentToday}
            subtitle="Marked attendance"
            icon={UserCheck}
            accent="green"
          />
          <KpiCard
            title="Pending Leaves"
            value={analytics.pendingLeaves}
            subtitle="Awaiting approval"
            icon={CalendarOff}
            accent="yellow"
          />
          <KpiCard
            title="Monthly Payroll"
            value={formatCurrency(analytics.monthlyPayroll)}
            subtitle="Current month"
            icon={IndianRupee}
            accent="green"
          />
        </div>

        {/* Charts + pending leaves */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <PayrollChart data={monthlyPayrollData} />

          <AnalyticsCard
            title="Pending Leave Requests"
            description={`${analytics.pendingLeaves} request${analytics.pendingLeaves !== 1 ? "s" : ""} awaiting action`}
            minHeight={220}
          >
            {pendingLeaves.length === 0 ? (
              <EmptyState icon={CalendarOff} title="No pending leaves" variant="inline" />
            ) : (
              <div className="divide-y divide-border/30">
                {pendingLeaves.map((leave) => (
                  <div key={leave.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground truncate">{leave.full_name || "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {LEAVE_TYPE_LABEL[leave.leave_type] ?? leave.leave_type} ·{" "}
                        {fmtDate(leave.from_date)} → {fmtDate(leave.to_date)} ·{" "}
                        {daysBetween(leave.from_date, leave.to_date)}d
                      </p>
                    </div>
                    <StatusBadge status="pending" label="Pending" size="sm" dot className="ml-3 shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </AnalyticsCard>
        </div>

        {/* Attendance strip — today's summary */}
        <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none" />
          <div className="flex divide-x divide-border/40 overflow-x-auto">
            {[
              { label: "Total Staff",    value: analytics.totalEmployees, color: "text-foreground",       bg: "" },
              { label: "Present",        value: analytics.presentToday,   color: "text-emerald-500",       bg: "bg-emerald-500/5" },
              { label: "Absent",         value: Math.max(0, analytics.totalEmployees - analytics.presentToday), color: "text-red-500", bg: "bg-red-500/5" },
              { label: "Pending Leaves", value: analytics.pendingLeaves,  color: "text-amber-500",         bg: "bg-amber-500/5" },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className={cn("flex-1 min-w-[100px] px-5 py-4", bg)}>
                <p className={cn("text-2xl font-bold", color)}>{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        </div>

      </TabsContent>

      {/* ── ATTENDANCE ───────────────────────────────────────────── */}
      <TabsContent value="attendance">
        <AttendanceView initialData={attendanceInitialPage} profiles={profiles} />
      </TabsContent>

      {/* ── LEAVES ───────────────────────────────────────────────── */}
      <TabsContent value="leaves">
        <LeaveManagement leaves={leaves} profiles={profiles} />
      </TabsContent>

      {/* ── PAYROLL ──────────────────────────────────────────────── */}
      <TabsContent value="payroll">
        <SalaryManager salaryRecords={salaryRecords} profiles={profiles} attendance={attendance} />
      </TabsContent>

      {/* ── EMPLOYEES ────────────────────────────────────────────── */}
      <TabsContent value="employees" className="space-y-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard title="Total Staff"  value={profiles.length}                                         icon={Users}     accent="default" />
          <KpiCard title="Active"       value={profiles.filter((p) => p.is_active).length}              icon={UserCheck} accent="green" />
          <KpiCard title="CRE"          value={profiles.filter((p) => p.role === "cre").length}         icon={TrendingUp} accent="blue" />
          <KpiCard title="Employees"    value={profiles.filter((p) => p.role === "employee").length}    icon={Building2} accent="default" />
        </div>

        <DataTable<UserProfile>
          rows={profiles}
          columns={employeeColumns}
          emptyLabel="No employees found."
        />
      </TabsContent>

      {/* ── PAYMENTS ─────────────────────────────────────────────── */}
      <TabsContent value="payments" className="space-y-5">

        {/* Payment method cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

          {/* Pending verification */}
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pending</p>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <AlertCircle className="w-4 h-4 text-amber-500" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground">{pendingSalaries.length}</p>
            <div>
              <p className="text-xs text-muted-foreground">Awaiting disbursement</p>
              <p className="text-sm font-semibold text-amber-500 mt-0.5">
                {formatCurrency(pendingSalaries.reduce((s, r) => s + r.final_salary, 0))}
              </p>
            </div>
          </div>

          {/* Paid / completed */}
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Completed</p>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground">{paidSalaries.length}</p>
            <div>
              <p className="text-xs text-muted-foreground">Salary disbursements</p>
              <p className="text-sm font-semibold text-emerald-500 mt-0.5">{formatCurrency(totalDisbursed)}</p>
            </div>
          </div>

          {/* Bank transfers */}
          <div className="rounded-2xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Bank Transfer</p>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Landmark className="w-4 h-4 text-blue-500" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground">{paidSalaries.length}</p>
            <div>
              <p className="text-xs text-muted-foreground">NEFT / IMPS transfers</p>
              <p className="text-sm font-semibold text-blue-500 mt-0.5">{formatCurrency(totalDisbursed)}</p>
            </div>
          </div>

          {/* QR / UPI */}
          <div className="rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">UPI / QR</p>
              <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <QrCode className="w-4 h-4 text-violet-500" />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground">—</p>
            <div>
              <p className="text-xs text-muted-foreground">QR / UPI disbursements</p>
              <p className="text-sm font-semibold text-muted-foreground mt-0.5">Coming soon</p>
            </div>
          </div>
        </div>

        {/* Pending payment queue */}
        <div className="relative rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none z-10" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
            <div>
              <p className="text-sm font-semibold text-foreground">Payment Queue</p>
              <p className="text-xs text-muted-foreground mt-0.5">Salary records pending disbursement</p>
            </div>
            {pendingSalaries.length > 0 && (
              <span className="text-xs font-semibold bg-amber-500/12 text-amber-500 rounded-full px-2.5 py-1">
                {pendingSalaries.length} pending
              </span>
            )}
          </div>

          {pendingSalaries.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="All payments are up to date"
              description="No salary records are awaiting disbursement."
              variant="inline"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40">
                    {["Employee", "Month", "Amount", "Status", "Action"].map((h) => (
                      <th key={h} className={cn(
                        "px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted/20 text-left",
                        h === "Action" && "text-right"
                      )}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pendingSalaries.slice(0, 20).map((s) => (
                    <tr key={s.id} className="border-b border-border/30 last:border-0 hover:bg-accent/20 transition-colors duration-100">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{s.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{s.email}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(Number(s.month.split("-")[0]), Number(s.month.split("-")[1]) - 1).toLocaleString("en-IN", { month: "long", year: "numeric" })}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">{formatCurrency(s.final_salary)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status="pending" label="Pending" size="sm" dot />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs text-muted-foreground">Use Payroll tab</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pendingSalaries.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/40 bg-muted/10">
              <p className="text-xs text-muted-foreground">{pendingSalaries.length} pending · Total {formatCurrency(pendingSalaries.reduce((s, r) => s + r.final_salary, 0))}</p>
            </div>
          )}
        </div>

      </TabsContent>

      {/* ── MY ATTENDANCE ────────────────────────────────────────── */}
      <TabsContent value="my-attendance" className="space-y-5">

        <div className="relative rounded-2xl border border-border/60 bg-card shadow-sm px-5 py-4">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none rounded-t-2xl" />
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">Today</p>
          <div className="flex flex-wrap items-center gap-6">
            {[
              { label: "Punch In",  value: fmtTime(hrTodayRecord?.punch_in  ?? null) },
              { label: "Punch Out", value: fmtTime(hrTodayRecord?.punch_out ?? null) },
              { label: "Total",     value: hrTodayRecord?.total_hours != null ? `${hrTodayRecord.total_hours}h` : hrTodayRecord?.punch_in ? "Live" : "—" },
            ].map((s) => (
              <div key={s.label}>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{s.label}</p>
                <p className="text-lg font-bold mt-0.5">{s.value}</p>
              </div>
            ))}
            {hrTodayRecord?.status && (
              <StatusBadge status={ATT_STATUS[hrTodayRecord.status].variant} label={ATT_STATUS[hrTodayRecord.status].label} size="md" />
            )}
            <div className="ml-auto shrink-0">
              <PunchButtons todayRecord={hrTodayRecord} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard title="Present Days"   value={presentDaysThisMonth}    subtitle="This month"   icon={CalendarCheck} accent="green"  />
          <KpiCard title="Today's Hours"  value={hrTodayHours}            subtitle="Logged today" icon={Clock}         accent="blue"   />
          <KpiCard title="Attendance %"   value={`${attendancePct}%`}     subtitle={`${daysSoFar}/${totalDaysThisMonth} days`} icon={UserCheck} accent="green" />
          <KpiCard title="Absent Days"    value={hrAttendanceHistory.filter((r) => r.status === "absent").length} subtitle="This month" icon={CalendarDays} accent="red" />
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Attendance History</p>
          <DataTable
            columns={attCols}
            rows={hrAttendanceHistory}
            keyExtractor={(r) => r.id}
            emptyLabel="No attendance records yet."
          />
        </div>
      </TabsContent>

      {/* ── MY LEAVE ─────────────────────────────────────────────── */}
      <TabsContent value="my-leave" className="space-y-5">

        <div className="grid grid-cols-3 gap-3">
          <KpiCard title="Approved"  value={hrLeaveHistory.filter((l) => l.status === "approved").length} subtitle="This year"         icon={CalendarCheck} accent="green"  />
          <KpiCard title="Pending"   value={hrLeaveHistory.filter((l) => l.status === "pending").length}  subtitle="Awaiting approval" icon={CalendarDays}  accent="yellow" />
          <KpiCard title="Rejected"  value={hrLeaveHistory.filter((l) => l.status === "rejected").length} subtitle="This year"         icon={CalendarDays}  accent="red"    />
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Leave Requests</p>
          <LeaveForm />
        </div>

        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4">
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            Your leave requests are reviewed and approved by the Admin.
          </p>
        </div>

        {hrLeaveHistory.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No leave requests"
            description="Apply for leave using the button above."
            variant="card"
          />
        ) : (
          <DataTable
            columns={leaveCols}
            rows={hrLeaveHistory}
            keyExtractor={(r) => r.id}
          />
        )}
      </TabsContent>

      {/* ── MEETINGS ─────────────────────────────────────────────── */}
      <TabsContent value="meetings" className="space-y-5">

        <div className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none" />
          <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Weekly Team Meeting</p>
              <p className="text-xs text-muted-foreground mt-0.5">Tuesdays, Thursdays &amp; Saturdays at 10:00 AM IST · Zoom</p>
            </div>
            <Button asChild size="sm" className="gap-1.5 shrink-0 bg-blue-600 hover:bg-blue-700 text-white">
              <a href={ZOOM_LINK} target="_blank" rel="noopener noreferrer">
                <Video className="w-3.5 h-3.5" />
                Join Meeting
              </a>
            </Button>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Weekly Schedule</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {HR_MEETINGS.map((meeting) => {
              const next = getNextOccurrence(meeting.day);
              const diff = daysAway(next);
              const c    = MEETING_COLORS[meeting.accent];
              return (
                <div key={meeting.dayName} className={`rounded-2xl border p-5 shadow-sm ${c.card}`}>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className={`flex items-center justify-center w-9 h-9 rounded-xl bg-card/50 shrink-0 ${c.icon}`}>
                      <Video className="w-4 h-4" strokeWidth={1.75} />
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c.badge}`}>
                      {diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : `${diff}d`}
                    </span>
                  </div>
                  <p className={`text-sm font-semibold mb-0.5 ${c.icon}`}>Weekly Team Meeting</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                    <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                    <span>{meeting.dayName}s at {meeting.time} IST</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Zoom · Mandatory attendance</p>
                  <Separator className="my-3 opacity-40" />
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] text-muted-foreground">
                      Next: <span className="font-semibold text-foreground">{fmtShort(next)}</span>
                    </p>
                    <Button asChild size="sm" variant="outline" className="h-7 text-[11px] gap-1 px-2.5">
                      <a href={ZOOM_LINK} target="_blank" rel="noopener noreferrer">
                        Join <ExternalLink className="w-3 h-3" />
                      </a>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upcoming meetings card */}
        {(() => {
          const nm = HR_MEETINGS
            .map((m) => ({ ...m, date: getNextOccurrence(m.day) }))
            .sort((a, b) => a.date.getTime() - b.date.getTime())[0];
          const diff = daysAway(nm.date);
          const c = MEETING_COLORS[nm.accent];
          return (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">Next Meeting</p>
              <div className={`rounded-2xl border p-5 shadow-sm flex items-start gap-4 ${c.card}`}>
                <div className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 bg-card/50 ${c.icon}`}>
                  <Video className="w-4.5 h-4.5" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className={`text-sm font-semibold ${c.icon}`}>Weekly Team Meeting</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c.badge}`}>
                      {diff === 0 ? "Today" : diff === 1 ? "Tomorrow" : `in ${diff}d`}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {nm.dayName}s at {nm.time} IST · Next: {fmtShort(nm.date)}
                  </p>
                  <p className="text-xs text-muted-foreground/80 mt-0.5">Platform: Zoom</p>
                </div>
                <Button asChild size="sm" className="gap-1.5 shrink-0 bg-blue-600 hover:bg-blue-700 text-white">
                  <a href={ZOOM_LINK} target="_blank" rel="noopener noreferrer">
                    <Video className="w-3.5 h-3.5" />
                    Join
                  </a>
                </Button>
              </div>
            </div>
          );
        })()}
      </TabsContent>

    </Tabs>
  );
}
