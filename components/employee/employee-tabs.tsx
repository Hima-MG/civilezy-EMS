"use client";

import Link from "next/link";
import {
  CalendarCheck, Clock, CheckSquare, FileText,
  User, Mail, Phone, Briefcase, Building2, CalendarDays,
  Video, CalendarClock, ExternalLink, ArrowRight,
  ClipboardList, Play, CheckCheck,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  KpiCard, HeroCard, DataTable, StatusBadge, EmptyState,
} from "@/components/ds";
import type { DataColumn } from "@/components/ds";
import { PunchButtons } from "./punch-buttons";
import { LeaveForm } from "./leave-form";
import { TaskForm } from "./task-form";
import { TaskList } from "./task-list";
import type {
  AttendanceRecord, AttendanceStatus,
  LeaveRequest, LeaveStatus, LeaveType,
  DailyTask, UserProfile, EmployeeCategory,
} from "@/types";

// ── Status lookup maps ────────────────────────────────────────

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

const CATEGORY_LABEL: Record<EmployeeCategory, string> = {
  content_creator:  "Content Creator",
  content_manager:  "Content Manager",
  tech_lead:        "Tech Lead",
  digital_marketer: "Digital Marketer",
  management:       "Management",
  finance:          "Finance",
  sales:            "Sales",
};

// ── Meeting schedule ──────────────────────────────────────────

type MeetingAccent = "info" | "violet" | "success";

const MEETINGS: {
  day: number;
  dayName: string;
  title: string;
  time: string;
  description: string;
  accent: MeetingAccent;
}[] = [
  {
    day: 2, dayName: "Tuesday",  title: "Team Standup",
    time: "11:00 AM", description: "Weekly team sync — updates, blockers, priorities",
    accent: "info",
  },
  {
    day: 4, dayName: "Thursday", title: "Department Review",
    time: "3:00 PM",  description: "Department progress review and planning session",
    accent: "violet",
  },
  {
    day: 6, dayName: "Saturday", title: "Weekly Wrap-up",
    time: "10:00 AM", description: "Weekly summary, wins, and goals for next week",
    accent: "success",
  },
];

const MEETING_COLORS: Record<MeetingAccent, { card: string; icon: string; badge: string }> = {
  info:    { card: "bg-blue-500/8 border-blue-500/20",    icon: "text-blue-400",    badge: "bg-blue-500/12 text-blue-400 border-blue-500/20" },
  violet:  { card: "bg-violet-500/8 border-violet-500/20", icon: "text-violet-400", badge: "bg-violet-500/12 text-violet-400 border-violet-500/20" },
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

// ── Formatters ────────────────────────────────────────────────

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtShort(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

// ── Section label ─────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
      {children}
    </p>
  );
}

// ── Props ─────────────────────────────────────────────────────

interface EmployeeTabsProps {
  todayRecord: AttendanceRecord | null;
  attendanceHistory: AttendanceRecord[];
  leaveHistory: LeaveRequest[];
  tasks: DailyTask[];
  stats: {
    presentDays: number;
    totalLeaves: number;
    todayHours: string;
    pendingTasks: number;
  };
  defaultTab?: string;
  profile: UserProfile;
}

// ── Main component ────────────────────────────────────────────

export function EmployeeTabs({
  todayRecord,
  attendanceHistory,
  leaveHistory,
  tasks,
  stats,
  defaultTab = "overview",
  profile,
}: EmployeeTabsProps) {
  const firstName = profile.full_name?.split(" ")[0] ?? "there";
  const todayStr  = new Date().toLocaleDateString("en-IN", {
    weekday: "long", day: "numeric", month: "long",
  });

  const pendingTasks  = tasks.filter((t) => t.status === "pending");
  const activeTasks   = tasks.filter((t) => t.status === "in_progress");
  const doneTasks     = tasks.filter((t) => t.status === "completed");

  const nextMeeting = [...MEETINGS]
    .map((m) => ({ ...m, date: getNextOccurrence(m.day) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];
  const nextDiff = daysAway(nextMeeting.date);

  // ── Table columns ───────────────────────────────────────────

  const attCols: DataColumn<AttendanceRecord>[] = [
    {
      key: "attendance_date", label: "Date",
      render: (r) => <span className="font-medium">{fmtDate(r.attendance_date)}</span>,
    },
    { key: "punch_in",    label: "In",    render: (r) => fmtTime(r.punch_in) },
    { key: "punch_out",   label: "Out",   render: (r) => fmtTime(r.punch_out) },
    { key: "total_hours", label: "Hours", render: (r) => r.total_hours != null ? `${r.total_hours}h` : "—" },
    {
      key: "status", label: "Status", align: "right" as const,
      render: (r) => {
        const s = ATT_STATUS[r.status];
        return <StatusBadge status={s.variant} label={s.label} size="sm" />;
      },
    },
  ];

  const leaveCols: DataColumn<LeaveRequest>[] = [
    {
      key: "leave_type", label: "Type",
      render: (r) => <span className="font-medium">{LEAVE_TYPE[r.leave_type]}</span>,
    },
    { key: "from_date", label: "From", render: (r) => fmtDate(r.from_date) },
    { key: "to_date",   label: "To",   render: (r) => fmtDate(r.to_date) },
    {
      key: "reason", label: "Reason",
      render: (r) => <span className="truncate max-w-[180px] block">{r.reason}</span>,
    },
    {
      key: "status", label: "Status", align: "right" as const,
      render: (r) => {
        const s = LEAVE_STATUS[r.status];
        return <StatusBadge status={s.variant} label={s.label} size="sm" />;
      },
    },
  ];

  // ── Render ──────────────────────────────────────────────────

  return (
    <Tabs defaultValue={defaultTab} className="space-y-5">

      {/* Tab bar */}
      <TabsList className="h-9 bg-muted/50 border border-border/60 p-0.5 rounded-xl flex flex-wrap gap-0.5">
        {[
          { value: "overview",   label: "Overview"   },
          { value: "attendance", label: "Attendance" },
          { value: "tasks",      label: "Tasks"      },
          { value: "leaves",     label: "Leave"      },
          { value: "meetings",   label: "Meetings"   },
          { value: "profile",    label: "Profile"    },
        ].map((t) => (
          <TabsTrigger
            key={t.value}
            value={t.value}
            className="text-xs font-medium rounded-lg px-3 h-[30px] data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            {t.label}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* ─────────────── OVERVIEW ─────────────────────────── */}
      <TabsContent value="overview" className="space-y-5 mt-0">

        <HeroCard
          title={`Good ${getGreeting()}, ${firstName}`}
          subtitle={todayStr}
          icon={CalendarCheck}
          gradient="indigo"
          stats={[
            { label: "Present Days",  value: stats.presentDays },
            { label: "Active Tasks",  value: activeTasks.length + pendingTasks.length },
            { label: "Leave Taken",   value: stats.totalLeaves },
          ]}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard title="Present Days"   value={stats.presentDays}     subtitle="This month"      icon={CalendarCheck} accent="green"  />
          <KpiCard title="Today's Hours"  value={stats.todayHours}      subtitle="Logged today"    icon={Clock}         accent="blue"   />
          <KpiCard title="Pending Tasks"  value={stats.pendingTasks}    subtitle="Outstanding"     icon={CheckSquare}   accent={stats.pendingTasks > 5 ? "red" : "yellow"} />
          <KpiCard title="Leaves Taken"   value={stats.totalLeaves}     subtitle="Approved this year" icon={FileText}   accent="violet" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Today's attendance strip */}
          <div>
            <SectionLabel>Today&apos;s attendance</SectionLabel>
            <div className="relative rounded-2xl border border-border/60 bg-card shadow-sm px-5 py-4">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none rounded-t-2xl" />
              <div className="flex flex-wrap items-center gap-5">
                {[
                  { label: "Punch In",  value: fmtTime(todayRecord?.punch_in  ?? null) },
                  { label: "Punch Out", value: fmtTime(todayRecord?.punch_out ?? null) },
                  { label: "Hours",     value: todayRecord?.total_hours != null ? `${todayRecord.total_hours}h` : todayRecord?.punch_in ? "Live" : "—" },
                ].map((s) => (
                  <div key={s.label}>
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{s.label}</p>
                    <p className="text-sm font-bold mt-0.5">{s.value}</p>
                  </div>
                ))}
                {todayRecord?.status && (
                  <StatusBadge status={ATT_STATUS[todayRecord.status].variant} label={ATT_STATUS[todayRecord.status].label} size="sm" />
                )}
                <div className="ml-auto shrink-0">
                  <PunchButtons todayRecord={todayRecord} />
                </div>
              </div>
            </div>
          </div>

          {/* Next meeting */}
          <div>
            <SectionLabel>Next meeting</SectionLabel>
            {(() => {
              const c = MEETING_COLORS[nextMeeting.accent];
              return (
                <div className={`rounded-2xl border p-5 shadow-sm flex items-start gap-4 ${c.card}`}>
                  <div className={`flex items-center justify-center w-10 h-10 rounded-xl shrink-0 bg-card/50 ${c.icon}`}>
                    <Video className="w-4.5 h-4.5" strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-semibold ${c.icon}`}>{nextMeeting.title}</p>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c.badge}`}>
                        {nextDiff === 0 ? "Today" : nextDiff === 1 ? "Tomorrow" : `in ${nextDiff}d`}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {nextMeeting.dayName}s at {nextMeeting.time} · Next: {fmtShort(nextMeeting.date)}
                    </p>
                    <p className="text-xs text-muted-foreground/80 mt-0.5">{nextMeeting.description}</p>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* Active tasks preview */}
        {(activeTasks.length > 0 || pendingTasks.length > 0) && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>Active tasks</SectionLabel>
              <a
                href="?tab=tasks"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors -mt-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </a>
            </div>
            <div className="space-y-2">
              {[...activeTasks, ...pendingTasks].slice(0, 3).map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 shadow-sm"
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${task.status === "in_progress" ? "bg-blue-500" : "bg-amber-500"}`} />
                  <p className="text-sm font-medium flex-1 min-w-0 truncate">{task.title}</p>
                  <StatusBadge
                    status={task.status === "in_progress" ? "info" : "pending"}
                    label={task.status === "in_progress" ? "In Progress" : "Pending"}
                    size="sm"
                    dot={false}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </TabsContent>

      {/* ─────────────── ATTENDANCE ───────────────────────── */}
      <TabsContent value="attendance" className="space-y-5 mt-0">

        <div>
          <SectionLabel>Today — {todayStr}</SectionLabel>
          <div className="relative rounded-2xl border border-border/60 bg-card shadow-sm px-5 py-4">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none rounded-t-2xl" />
            <div className="flex flex-wrap items-center gap-6">
              {[
                { label: "Punch In",  value: fmtTime(todayRecord?.punch_in  ?? null) },
                { label: "Punch Out", value: fmtTime(todayRecord?.punch_out ?? null) },
                { label: "Total",     value: todayRecord?.total_hours != null ? `${todayRecord.total_hours}h` : todayRecord?.punch_in ? "Live" : "—" },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-bold mt-0.5">{s.value}</p>
                </div>
              ))}
              {todayRecord?.status && (
                <StatusBadge status={ATT_STATUS[todayRecord.status].variant} label={ATT_STATUS[todayRecord.status].label} size="md" />
              )}
              <div className="ml-auto shrink-0">
                <PunchButtons todayRecord={todayRecord} />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <KpiCard title="Present Days"  value={stats.presentDays}                                                             subtitle="This month"   icon={CalendarCheck} accent="green"  />
          <KpiCard title="Today's Hours" value={stats.todayHours}                                                              subtitle="Logged today"  icon={Clock}         accent="blue"   />
          <KpiCard title="Absent Days"   value={attendanceHistory.filter((r) => r.status === "absent").length}                 subtitle="This month"   icon={CalendarDays}  accent="red"    />
          <KpiCard title="Late Arrivals" value={attendanceHistory.filter((r) => r.status === "late").length}                   subtitle="This month"   icon={Clock}         accent="yellow" />
        </div>

        <div>
          <SectionLabel>Attendance history</SectionLabel>
          <DataTable
            columns={attCols}
            rows={attendanceHistory}
            keyExtractor={(r) => r.id}
            emptyLabel="No attendance records yet."
          />
        </div>
      </TabsContent>

      {/* ─────────────── TASKS ────────────────────────────── */}
      <TabsContent value="tasks" className="space-y-5 mt-0">

        <div className="grid grid-cols-3 gap-3">
          <KpiCard title="Pending"     value={pendingTasks.length} icon={CheckSquare} accent="yellow" />
          <KpiCard title="In Progress" value={activeTasks.length}  icon={Play}        accent="blue"   />
          <KpiCard title="Completed"   value={doneTasks.length}    icon={CheckCheck}  accent="green"  />
        </div>

        <div>
          <SectionLabel>Add a task</SectionLabel>
          <TaskForm />
        </div>

        <div>
          <SectionLabel>All tasks</SectionLabel>
          {tasks.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title="No tasks yet"
              description="Add your first task above to start tracking your daily work."
              variant="card"
            />
          ) : (
            <TaskList tasks={tasks} />
          )}
        </div>
      </TabsContent>

      {/* ─────────────── LEAVE ────────────────────────────── */}
      <TabsContent value="leaves" className="space-y-5 mt-0">

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <KpiCard title="Approved"  value={leaveHistory.filter((l) => l.status === "approved").length} subtitle="This year"         icon={FileText}    accent="green"  />
          <KpiCard title="Pending"   value={leaveHistory.filter((l) => l.status === "pending").length}  subtitle="Awaiting approval" icon={CalendarDays} accent="yellow" />
          <KpiCard title="Rejected"  value={leaveHistory.filter((l) => l.status === "rejected").length} subtitle="This year"         icon={CalendarDays} accent="red"    />
        </div>

        <div className="flex items-center justify-between">
          <SectionLabel>Leave requests</SectionLabel>
          <LeaveForm />
        </div>

        {leaveHistory.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No leave requests"
            description="Apply for leave using the button above."
            variant="card"
          />
        ) : (
          <DataTable
            columns={leaveCols}
            rows={leaveHistory}
            keyExtractor={(r) => r.id}
          />
        )}
      </TabsContent>

      {/* ─────────────── MEETINGS ─────────────────────────── */}
      <TabsContent value="meetings" className="space-y-5 mt-0">

        <div>
          <SectionLabel>Weekly schedule</SectionLabel>
          <p className="text-xs text-muted-foreground -mt-1 mb-4">
            Recurring meetings — attendance is mandatory. All sessions are conducted online.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {MEETINGS.map((meeting) => {
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
                  <p className={`text-sm font-semibold mb-0.5 ${c.icon}`}>{meeting.title}</p>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                    <CalendarClock className="w-3.5 h-3.5 shrink-0" />
                    <span>{meeting.dayName}s at {meeting.time}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{meeting.description}</p>
                  <Separator className="my-3 opacity-40" />
                  <p className="text-[11px] text-muted-foreground">
                    Next: <span className="font-semibold text-foreground">{fmtShort(next)}</span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Work reports quick-link */}
        <div>
          <SectionLabel>Work reports</SectionLabel>
          <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 text-primary">
                <ClipboardList className="w-4 h-4" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-sm font-semibold">Work Reports</p>
                <p className="text-xs text-muted-foreground">Log daily tasks, hours, and productivity</p>
              </div>
            </div>
            <Button asChild size="sm" variant="outline" className="gap-1.5 shrink-0">
              <Link href="/employee/work-reports">
                Open <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
        </div>
      </TabsContent>

      {/* ─────────────── PROFILE ──────────────────────────── */}
      <TabsContent value="profile" className="space-y-5 mt-0">

        <div className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none" />

          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-border/50 flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/12 text-primary text-lg font-bold shrink-0">
              {(profile.full_name ?? profile.email)?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold leading-tight truncate">{profile.full_name || "—"}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{profile.email}</p>
            </div>
            <StatusBadge
              status={profile.is_active ? "success" : "danger"}
              label={profile.is_active ? "Active" : "Inactive"}
              size="md"
            />
          </div>

          {/* Info grid — 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2">
            {[
              { icon: Phone,        label: "Phone",        value: profile.phone || "—" },
              { icon: Building2,    label: "Department",   value: profile.department || "—" },
              { icon: Briefcase,    label: "Role",         value: profile.role.replace("_", " ") },
              {
                icon: User,
                label: "Category",
                value: profile.employee_category ? CATEGORY_LABEL[profile.employee_category] : "Not assigned",
              },
              {
                icon: CalendarDays,
                label: "Member Since",
                value: new Date(profile.created_at).toLocaleDateString("en-IN", {
                  day: "numeric", month: "long", year: "numeric",
                }),
              },
              { icon: Mail, label: "Account ID", value: profile.id.slice(0, 8) + "…" },
            ].map((field, i) => (
              <div
                key={i}
                className="flex items-start gap-3 px-6 py-4 border-t border-border/40 first:border-t-0 sm:[&:nth-child(2)]:border-t-0 sm:odd:border-r sm:odd:border-border/40"
              >
                <field.icon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" strokeWidth={1.75} />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{field.label}</p>
                  <p className="text-sm font-medium mt-0.5 capitalize">{field.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Category + work reports shortcut */}
        {profile.employee_category && (
          <div className="rounded-2xl border border-border/60 bg-card shadow-sm px-6 py-4 flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-violet-500/10 text-violet-400 shrink-0">
              <Briefcase className="w-4 h-4" strokeWidth={1.75} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Work Category</p>
              <p className="text-sm font-semibold mt-0.5">{CATEGORY_LABEL[profile.employee_category]}</p>
            </div>
            <Button asChild size="sm" variant="outline" className="gap-1.5 shrink-0">
              <Link href="/employee/work-reports">
                Work Reports <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
