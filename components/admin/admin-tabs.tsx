"use client";

import Link from "next/link";
import {
  LayoutDashboard, UserCheck, IndianRupee, Target, Briefcase,
  BarChart2, Settings2, GraduationCap, RefreshCw, Clock,
  CalendarOff, PhoneCall, TrendingUp, Users, AlertCircle,
  CheckCircle2, Trophy, ArrowRight, ClipboardList, Wallet,
  Building2,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  HeroCard, KpiCard, ActivityFeed, StatusBadge, EmptyState,
} from "@/components/ds";
import type { ActivityItem } from "@/components/ds";
import type { StatusVariant } from "@/components/ds";
import { UserManagement } from "./user-management";
import { AnalyticsSection, PayrollTrendChart } from "./analytics-charts";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type {
  AdminStats,
  AdminActivityItem,
  RoleDistributionPoint,
  LeadStatusPoint,
  AttendanceTrendPoint,
  MonthlyPayrollPoint,
  UserProfile,
  LeaveWithProfile,
  SalaryWithProfile,
} from "@/types";

// ── Helpers ────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const ACTIVITY_ICON: Record<AdminActivityItem["type"], typeof Clock> = {
  attendance: Clock,
  leave:      CalendarOff,
  lead:       PhoneCall,
  salary:     IndianRupee,
};

const ACTIVITY_ACCENT: Record<AdminActivityItem["type"], StatusVariant> = {
  attendance: "info",
  leave:      "pending",
  lead:       "violet",
  salary:     "success",
};

const STATUS_VARIANT: Record<string, StatusVariant> = {
  present:   "success",
  absent:    "danger",
  half_day:  "pending",
  late:      "violet",
  pending:   "pending",
  approved:  "success",
  rejected:  "danger",
  paid:      "success",
  new:       "info",
  contacted: "violet",
  interested:"pending",
  follow_up: "pending",
  converted: "success",
  lost:      "danger",
};

const LEAVE_TYPE_LABEL: Record<string, string> = {
  casual: "Casual", sick: "Sick", earned: "Earned",
  maternity: "Maternity", paternity: "Paternity", other: "Other",
};

const PIPELINE_STAGES = [
  { key: "new",        label: "New",        color: "#3b82f6" },
  { key: "contacted",  label: "Contacted",  color: "#a855f7" },
  { key: "interested", label: "Interested", color: "#f59e0b" },
  { key: "follow_up",  label: "Follow-up",  color: "#f97316" },
  { key: "converted",  label: "Converted",  color: "#22c55e" },
  { key: "lost",       label: "Lost",       color: "#ef4444" },
];

// ── Local components ───────────────────────────────────────────────

function PipelineStrip({ leadStatusData, totalLeads }: { leadStatusData: LeadStatusPoint[]; totalLeads: number }) {
  const countMap: Record<string, number> = {};
  for (const d of leadStatusData) {
    const matched = PIPELINE_STAGES.find((s) => s.label === d.status);
    if (matched) countMap[matched.key] = d.count;
  }

  return (
    <div className="relative rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none" />
      <div className="flex divide-x divide-border/40 overflow-x-auto">
        {PIPELINE_STAGES.map((stage) => {
          const count = countMap[stage.key] ?? 0;
          const pct   = totalLeads > 0 ? Math.round((count / totalLeads) * 100) : 0;
          return (
            <div key={stage.key} className="flex-1 min-w-[80px] px-4 py-3">
              <p className="text-xl font-bold text-foreground">{count}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{stage.label}</p>
              <div className="h-0.5 bg-border/40 rounded-full overflow-hidden mt-2">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: stage.color }} />
              </div>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">{pct}%</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ComingSoonCard({ icon: Icon, title, description, features }: {
  icon: typeof GraduationCap;
  title: string;
  description: string;
  features: string[];
}) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none" />

      <div className="flex flex-col items-center justify-center py-16 px-8 text-center space-y-5">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-7 h-7 text-primary" strokeWidth={1.5} />
        </div>
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            Coming Soon
          </div>
          <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
          {features.map((f) => (
            <div key={f} className="flex items-center gap-2 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary/50" />
              <span className="text-xs text-muted-foreground">{f}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Props ──────────────────────────────────────────────────────────

interface TopCreEntry {
  id: string;
  name: string;
  total: number;
  converted: number;
}

interface AdminTabsProps {
  stats: AdminStats;
  users: UserProfile[];
  currentUserId: string;
  roleDistribution: RoleDistributionPoint[];
  leadStatusData: LeadStatusPoint[];
  attendanceTrend: AttendanceTrendPoint[];
  payrollTrend: MonthlyPayrollPoint[];
  recentAttendance: AdminActivityItem[];
  recentLeaves: AdminActivityItem[];
  recentLeads: AdminActivityItem[];
  recentSalary: AdminActivityItem[];
  leavesEnriched: LeaveWithProfile[];
  salaryEnriched: SalaryWithProfile[];
  topCre: TopCreEntry[];
  defaultTab?: string;
}

// ── Component ──────────────────────────────────────────────────────

export function AdminTabs({
  stats,
  users,
  currentUserId,
  roleDistribution,
  leadStatusData,
  attendanceTrend,
  payrollTrend,
  recentAttendance,
  recentLeaves,
  recentLeads,
  recentSalary,
  leavesEnriched,
  salaryEnriched,
  topCre,
  defaultTab = "overview",
}: AdminTabsProps) {

  // ── Derived data ─────────────────────────────────────────────

  const pendingLeaves  = leavesEnriched.filter((l) => l.status === "pending");
  const pendingSalary  = salaryEnriched.filter((s) => s.status === "pending");
  const paidSalary     = salaryEnriched.filter((s) => s.status === "paid");
  const conversionRate = stats.totalLeads > 0
    ? Math.round((stats.convertedLeads / stats.totalLeads) * 100)
    : 0;

  // Combined activity feed items (DS format)
  const combinedActivity: ActivityItem[] = [
    ...recentAttendance,
    ...recentLeaves,
    ...recentLeads,
    ...recentSalary,
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 12)
    .map((item) => ({
      id: `${item.type}-${item.id}`,
      title: item.name,
      description: item.detail,
      timestamp: timeAgo(item.time),
      icon: ACTIVITY_ICON[item.type],
      accent: ACTIVITY_ACCENT[item.type],
      status: STATUS_VARIANT[item.status] ?? "neutral",
      statusLabel: item.status.replace(/_/g, " "),
    }));

  return (
    <Tabs defaultValue={defaultTab} className="space-y-5">

      {/* ── Tab bar ──────────────────────────────────────────────── */}
      <div className="overflow-x-auto pb-0.5">
        <TabsList className="h-9 bg-muted/50 border border-border/60 p-0.5 rounded-xl gap-0.5 w-max">
          {[
            { value: "overview",   icon: LayoutDashboard, label: "Overview" },
            { value: "employees",  icon: UserCheck,       label: "Employees", badge: String(users.length) },
            { value: "finance",    icon: Wallet,          label: "Finance" },
            { value: "crm",        icon: Target,          label: "CRM" },
            { value: "hr",         icon: Briefcase,       label: "HR",
              badge: stats.pendingLeaves > 0 ? String(stats.pendingLeaves) : undefined,
              badgeVariant: "amber" },
            { value: "analytics",  icon: BarChart2,       label: "Analytics" },
            { value: "students",   icon: GraduationCap,   label: "Students" },
            { value: "renewals",   icon: RefreshCw,       label: "Renewals" },
            { value: "settings",   icon: Settings2,       label: "Settings" },
          ].map(({ value, icon: Icon, label, badge, badgeVariant }) => (
            <TabsTrigger
              key={value}
              value={value}
              className="h-8 rounded-lg text-xs gap-1.5 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {label}
              {badge && (
                <span className={cn(
                  "text-[10px] font-semibold rounded-full px-1.5 py-px",
                  badgeVariant === "amber"
                    ? "bg-amber-500/20 text-amber-500"
                    : "bg-muted text-muted-foreground"
                )}>
                  {badge}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {/* ── OVERVIEW ─────────────────────────────────────────────── */}
      <TabsContent value="overview" className="space-y-5">

        {/* Hero */}
        <HeroCard
          icon={Building2}
          title="Civilezy Admin Control Center"
          subtitle="Organisation-wide operations — staff, leads, payroll, and attendance at a glance."
          gradient="amber"
          stats={[
            { label: "Staff",          value: String(stats.totalEmployees) },
            { label: "Present Today",  value: String(stats.attendanceToday) },
            { label: "Total Leads",    value: String(stats.totalLeads) },
            { label: "Monthly Payroll",value: formatCurrency(stats.monthlyPayroll) },
          ]}
          action={
            <Link
              href="/admin/work-reports"
              className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/18 text-white text-xs font-medium px-3 py-1.5 transition-colors"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              Work Audit
              <ArrowRight className="w-3 h-3" />
            </Link>
          }
        />

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <KpiCard title="Total Staff"     value={stats.totalEmployees}               subtitle="Non-admin accounts"  icon={Users}       accent="default" />
          <KpiCard title="Present Today"   value={stats.attendanceToday}              subtitle="Punched in"          icon={UserCheck}   accent="green" />
          <KpiCard title="Pending Leaves"  value={stats.pendingLeaves}               subtitle="Awaiting approval"   icon={CalendarOff} accent="yellow" />
          <KpiCard title="Total Leads"     value={stats.totalLeads}                  subtitle="All time"            icon={PhoneCall}   accent="violet" />
          <KpiCard title="Converted"       value={stats.convertedLeads}             subtitle={`${conversionRate}% rate`} icon={TrendingUp} accent="green" />
          <KpiCard title="Monthly Payroll" value={formatCurrency(stats.monthlyPayroll)} subtitle="Current month"   icon={IndianRupee} accent="green" />
        </div>

        {/* CRM Pipeline strip */}
        <PipelineStrip leadStatusData={leadStatusData} totalLeads={stats.totalLeads} />

        {/* Activity feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            <ActivityFeed
              title="Recent Activity"
              items={combinedActivity}
              maxItems={10}
              emptyLabel="No recent activity across the organisation."
            />
          </div>

          {/* Quick ops panel */}
          <div className="space-y-3">
            {/* Pending alerts */}
            <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
              <div className="px-5 pt-4 pb-3 border-b border-border/50">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Pending Actions</p>
              </div>
              <div className="divide-y divide-border/30">
                <div className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <CalendarOff className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <p className="text-sm text-muted-foreground">Leave requests</p>
                  </div>
                  <span className={cn(
                    "text-sm font-bold",
                    pendingLeaves.length > 0 ? "text-amber-500" : "text-muted-foreground"
                  )}>{pendingLeaves.length}</span>
                </div>
                <div className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-amber-500/10 flex items-center justify-center">
                      <IndianRupee className="w-3.5 h-3.5 text-amber-500" />
                    </div>
                    <p className="text-sm text-muted-foreground">Salary pending</p>
                  </div>
                  <span className={cn(
                    "text-sm font-bold",
                    pendingSalary.length > 0 ? "text-amber-500" : "text-muted-foreground"
                  )}>{pendingSalary.length}</span>
                </div>
                <div className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    </div>
                    <p className="text-sm text-muted-foreground">Paid salaries</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-500">{paidSalary.length}</span>
                </div>
                <div className="flex items-center justify-between px-5 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                    </div>
                    <p className="text-sm text-muted-foreground">Staff online</p>
                  </div>
                  <span className="text-sm font-bold text-blue-500">{stats.attendanceToday}</span>
                </div>
              </div>

              {/* Work audit link */}
              <div className="px-5 py-3 border-t border-border/40">
                <Link
                  href="/admin/work-reports"
                  className="flex items-center justify-between text-xs text-primary hover:text-primary/80 font-medium transition-colors group"
                >
                  <span className="flex items-center gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5" />
                    Review Work Reports
                  </span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>

      {/* ── EMPLOYEES ─────────────────────────────────────────────── */}
      <TabsContent value="employees" className="space-y-5">

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard title="Total"      value={users.length}                                          icon={Users}     accent="default" />
          <KpiCard title="Active"     value={users.filter((u) => u.is_active).length}               icon={UserCheck} accent="green" />
          <KpiCard title="CRE"        value={users.filter((u) => u.role === "cre").length}          icon={PhoneCall} accent="violet" />
          <KpiCard title="Employees"  value={users.filter((u) => u.role === "employee").length}     icon={Briefcase} accent="default" />
        </div>

        <UserManagement users={users} currentUserId={currentUserId} />

        {/* Work Audit shortcut */}
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <ClipboardList className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Employee Work Audit</p>
                <p className="text-xs text-muted-foreground mt-0.5">View all reports, track hours, add feedback</p>
              </div>
            </div>
            <Link
              href="/admin/work-reports"
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 hover:bg-primary/18 text-primary text-xs font-medium px-3 py-1.5 transition-colors"
            >
              Open Work Audit
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </TabsContent>

      {/* ── FINANCE ───────────────────────────────────────────────── */}
      <TabsContent value="finance" className="space-y-5">

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <KpiCard title="Monthly Payroll"   value={formatCurrency(stats.monthlyPayroll)}  subtitle="Current month"       icon={IndianRupee}    accent="green" />
          <KpiCard title="Pending Payments"  value={pendingSalary.length}                   subtitle="Salary records unpaid" icon={AlertCircle}  accent="yellow" />
          <KpiCard title="Paid Records"      value={paidSalary.length}                      subtitle="Completed disbursements" icon={CheckCircle2} accent="green" />
        </div>

        <PayrollTrendChart data={payrollTrend} />

        {/* Pending payment queue */}
        <div className="relative rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none z-10" />
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
            <div>
              <p className="text-sm font-semibold text-foreground">Payment Queue</p>
              <p className="text-xs text-muted-foreground mt-0.5">Salary records awaiting disbursement</p>
            </div>
            {pendingSalary.length > 0 && (
              <span className="text-xs font-semibold bg-amber-500/12 text-amber-500 rounded-full px-2.5 py-1">
                {pendingSalary.length} pending
              </span>
            )}
          </div>

          {pendingSalary.length === 0 ? (
            <EmptyState icon={Wallet} title="All payments are up to date" description="No salary records awaiting disbursement." variant="inline" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40">
                    {["Employee", "Month", "Base", "Final", "Status"].map((h) => (
                      <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted/20 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pendingSalary.slice(0, 20).map((s) => (
                    <tr key={s.id} className="border-b border-border/30 last:border-0 hover:bg-accent/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{s.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{s.email}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{s.month}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{formatCurrency(s.base_salary)}</td>
                      <td className="px-4 py-3 font-semibold text-foreground">{formatCurrency(s.final_salary)}</td>
                      <td className="px-4 py-3"><StatusBadge status="pending" label="Pending" size="sm" dot /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {pendingSalary.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/40 bg-muted/10">
              <p className="text-xs text-muted-foreground">
                {pendingSalary.length} records · {formatCurrency(pendingSalary.reduce((s, r) => s + r.final_salary, 0))} total
              </p>
              <Link href="/hr?tab=payroll" className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors">
                Manage in HR <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>
      </TabsContent>

      {/* ── CRM ───────────────────────────────────────────────────── */}
      <TabsContent value="crm" className="space-y-5">

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard title="Total Leads"  value={stats.totalLeads}       subtitle="All time"            icon={Users}      accent="default" />
          <KpiCard title="Converted"    value={stats.convertedLeads}   subtitle="Successfully closed" icon={Target}     accent="green" />
          <KpiCard title="Conv. Rate"   value={`${conversionRate}%`}   subtitle="Overall pipeline"    icon={TrendingUp} accent="green" />
          <KpiCard title="Active Stages" value={leadStatusData.filter((s) => s.count > 0).length} subtitle="Stages with leads" icon={BarChart2} accent="violet" />
        </div>

        {/* Pipeline strip */}
        <PipelineStrip leadStatusData={leadStatusData} totalLeads={stats.totalLeads} />

        {/* Top CRE performers */}
        <div className="relative rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none z-10" />
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <p className="text-sm font-semibold text-foreground">Top CRE Performers</p>
            </div>
            <p className="text-xs text-muted-foreground">By conversions</p>
          </div>

          {topCre.length === 0 ? (
            <EmptyState icon={Users} title="No CRE performance data" variant="inline" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40">
                    {["#", "Name", "Total", "Converted", "Rate"].map((h) => (
                      <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted/20 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {topCre.map((cre, i) => (
                    <tr key={cre.id} className="border-b border-border/30 last:border-0 hover:bg-accent/20 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground font-bold text-xs w-8">{i + 1}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-violet-500/10 flex items-center justify-center">
                            <span className="text-[11px] font-bold text-violet-500">{cre.name.charAt(0).toUpperCase()}</span>
                          </div>
                          <span className="font-medium text-foreground">{cre.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{cre.total}</td>
                      <td className="px-4 py-3 font-semibold text-emerald-500">{cre.converted}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {cre.total > 0 ? `${Math.round((cre.converted / cre.total) * 100)}%` : "0%"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </TabsContent>

      {/* ── HR ────────────────────────────────────────────────────── */}
      <TabsContent value="hr" className="space-y-5">

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard title="Total Staff"     value={stats.totalEmployees}                     subtitle="Active accounts"   icon={Users}      accent="default" />
          <KpiCard title="Present Today"   value={stats.attendanceToday}                   subtitle="Punched in"        icon={UserCheck}  accent="green" />
          <KpiCard title="Pending Leaves"  value={stats.pendingLeaves}                     subtitle="Awaiting approval" icon={CalendarOff} accent="yellow" />
          <KpiCard title="Monthly Payroll" value={formatCurrency(stats.monthlyPayroll)}    subtitle="Current month"     icon={IndianRupee} accent="green" />
        </div>

        {/* Pending leaves */}
        <div className="relative rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none z-10" />
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
            <div>
              <p className="text-sm font-semibold text-foreground">Pending Leave Requests</p>
              <p className="text-xs text-muted-foreground mt-0.5">Approve or reject from the HR portal</p>
            </div>
            {pendingLeaves.length > 0 && (
              <span className="text-xs font-semibold bg-amber-500/12 text-amber-500 rounded-full px-2.5 py-1">
                {pendingLeaves.length} pending
              </span>
            )}
          </div>

          {pendingLeaves.length === 0 ? (
            <EmptyState icon={CalendarOff} title="No pending leave requests" variant="inline" />
          ) : (
            <div className="divide-y divide-border/30">
              {pendingLeaves.slice(0, 10).map((leave) => (
                <div key={leave.id} className="flex items-center justify-between px-5 py-3 hover:bg-accent/20 transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{leave.full_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {LEAVE_TYPE_LABEL[leave.leave_type] ?? leave.leave_type} ·{" "}
                      {fmtDate(leave.from_date)} → {fmtDate(leave.to_date)}
                    </p>
                  </div>
                  <StatusBadge status="pending" label="Pending" size="sm" dot className="ml-3 shrink-0" />
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center justify-between px-5 py-3 border-t border-border/40 bg-muted/10">
            <p className="text-xs text-muted-foreground">Manage approvals in the HR portal</p>
            <Link href="/hr?tab=leaves" className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors">
              Open HR Portal <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </TabsContent>

      {/* ── ANALYTICS ─────────────────────────────────────────────── */}
      <TabsContent value="analytics">
        <AnalyticsSection
          roleDistribution={roleDistribution}
          leadStatusData={leadStatusData}
          attendanceTrend={attendanceTrend}
          payrollTrend={payrollTrend}
        />
      </TabsContent>

      {/* ── STUDENTS ──────────────────────────────────────────────── */}
      <TabsContent value="students">
        <ComingSoonCard
          icon={GraduationCap}
          title="Student Operations"
          description="A comprehensive student lifecycle management system — from enquiry to enrollment and progress tracking."
          features={[
            "Student enquiry tracking",
            "Course enrollment management",
            "Batch & schedule management",
            "Fee collection records",
            "Progress & performance reports",
            "Attendance tracking",
          ]}
        />
      </TabsContent>

      {/* ── RENEWALS ──────────────────────────────────────────────── */}
      <TabsContent value="renewals">
        <ComingSoonCard
          icon={RefreshCw}
          title="Renewal Queue"
          description="Track and manage subscription renewals, license expiries, and contract renewal workflows."
          features={[
            "Renewal reminder queue",
            "Contract expiry tracking",
            "Automated reminder notifications",
            "Renewal approval workflow",
            "Historical renewal records",
            "Revenue forecasting",
          ]}
        />
      </TabsContent>

      {/* ── SETTINGS ──────────────────────────────────────────────── */}
      <TabsContent value="settings" className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Org info */}
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
            <div className="px-5 pt-5 pb-3 border-b border-border/50">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Organisation</p>
            </div>
            <div className="px-5 py-4 space-y-4">
              {[
                { label: "Company", value: "CivilEzy" },
                { label: "Platform", value: "Employee Management System" },
                { label: "Total Users", value: String(users.length) },
                { label: "Active Staff", value: String(users.filter((u) => u.is_active).length) },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium text-foreground">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Role distribution */}
          <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
            <div className="px-5 pt-5 pb-3 border-b border-border/50">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Role Distribution</p>
            </div>
            <div className="px-5 py-4 space-y-3">
              {roleDistribution.map((r) => (
                <div key={r.role} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: r.color }} />
                    <span className="text-sm text-foreground">{r.role}</span>
                  </div>
                  <span className="text-sm font-semibold text-foreground">{r.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick links */}
        <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
          <div className="px-5 pt-5 pb-3 border-b border-border/50">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Quick Navigation</p>
          </div>
          <div className="divide-y divide-border/30">
            {[
              { href: "/admin/work-reports", icon: ClipboardList, label: "Work Audit", desc: "Review all employee work reports" },
              { href: "/hr?tab=leaves",      icon: CalendarOff,   label: "Leave Approvals", desc: "Manage pending leave requests" },
              { href: "/hr?tab=payroll",     icon: IndianRupee,   label: "Payroll",          desc: "Generate and manage salary records" },
              { href: "/cre",                icon: PhoneCall,      label: "CRM Portal",       desc: "Lead pipeline and followup management" },
            ].map(({ href, icon: Icon, label, desc }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-accent/20 transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary/8 flex items-center justify-center group-hover:bg-primary/12 transition-colors">
                    <Icon className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{label}</p>
                    <p className="text-xs text-muted-foreground">{desc}</p>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
              </Link>
            ))}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
