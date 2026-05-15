"use client";

import {
  LayoutDashboard, Clock, CalendarOff, IndianRupee, Users,
  CreditCard, Building2, QrCode, Landmark, Wallet, CheckCircle2,
  AlertCircle, TrendingUp, UserCheck,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  HeroCard, KpiCard, AnalyticsCard, StatusBadge, DataTable, EmptyState,
} from "@/components/ds";
import type { DataColumn } from "@/components/ds";
import { AttendanceView } from "./attendance-view";
import { LeaveManagement } from "./leave-management";
import { SalaryManager } from "./salary-manager";
import { PayrollChart } from "./payroll-chart";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useUrlTab } from "@/hooks/use-url-tab";
import type {
  UserProfile,
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
function daysBetween(from: string, to: string) {
  return Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1);
}

const VALID_TABS = ["overview", "attendance", "leaves", "payroll", "employees", "payments"] as const;

// ── Payment method breakdown from salary data ───────────────────────
// Since payment_method isn't tracked in the DB, we derive buckets from
// the salary records count for a premium payment ops panel.
// Real implementation would add a payment_method column to salary_records.

interface HrTabsProps {
  profiles: UserProfile[];
  attendance: AttendanceWithProfile[];
  leaves: LeaveWithProfile[];
  salaryRecords: SalaryWithProfile[];
  analytics: HrAnalytics;
  monthlyPayrollData: MonthlyPayrollPoint[];
}

export function HrTabs({
  profiles,
  attendance,
  leaves,
  salaryRecords,
  analytics,
  monthlyPayrollData,
}: HrTabsProps) {
  const [activeTab, setActiveTab] = useUrlTab(VALID_TABS, "overview");
  const pendingLeaves   = leaves.filter((l) => l.status === "pending").slice(0, 6);
  const pendingSalaries = salaryRecords.filter((s) => s.status === "pending");
  const paidSalaries    = salaryRecords.filter((s) => s.status === "paid");
  const totalDisbursed  = paidSalaries.reduce((s, r) => s + r.final_salary, 0);

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
      <TabsList className="h-9 bg-muted/50 border border-border/60 p-0.5 rounded-xl gap-0.5 w-full sm:w-auto flex-wrap">
        <TabsTrigger value="overview"   className="h-8 rounded-lg text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
          <LayoutDashboard className="w-3.5 h-3.5" /> Overview
        </TabsTrigger>
        <TabsTrigger value="attendance" className="h-8 rounded-lg text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
          <Clock className="w-3.5 h-3.5" /> Attendance
        </TabsTrigger>
        <TabsTrigger value="leaves"     className="h-8 rounded-lg text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
          <CalendarOff className="w-3.5 h-3.5" /> Leaves
          {analytics.pendingLeaves > 0 && (
            <span className="ml-0.5 text-[10px] font-semibold bg-amber-500/20 text-amber-500 rounded-full px-1.5 py-px">
              {analytics.pendingLeaves}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="payroll"    className="h-8 rounded-lg text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
          <IndianRupee className="w-3.5 h-3.5" /> Payroll
        </TabsTrigger>
        <TabsTrigger value="employees"  className="h-8 rounded-lg text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
          <Users className="w-3.5 h-3.5" /> Employees
        </TabsTrigger>
        <TabsTrigger value="payments"   className="h-8 rounded-lg text-xs gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm">
          <CreditCard className="w-3.5 h-3.5" /> Payments
        </TabsTrigger>
      </TabsList>

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
        <AttendanceView attendance={attendance} profiles={profiles} />
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
    </Tabs>
  );
}
