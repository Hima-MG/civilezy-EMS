"use client";

import { CalendarCheck, Clock, FileText, CheckSquare, CalendarDays } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatCard } from "@/components/dashboard/stat-card";
import { PunchButtons } from "./punch-buttons";
import { LeaveForm } from "./leave-form";
import { TaskForm } from "./task-form";
import { TaskList } from "./task-list";
import type {
  AttendanceRecord,
  AttendanceStatus,
  LeaveRequest,
  LeaveStatus,
  LeaveType,
  DailyTask,
} from "@/types";

// ── Badge helpers ─────────────────────────────────────────────

const ATTENDANCE_BADGE: Record<AttendanceStatus, { label: string; className: string }> = {
  present:  { label: "Present",  className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200" },
  absent:   { label: "Absent",   className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200" },
  half_day: { label: "Half Day", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200" },
  late:     { label: "Late",     className: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200" },
};

const LEAVE_STATUS_BADGE: Record<LeaveStatus, { label: string; className: string }> = {
  pending:  { label: "Pending",  className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200" },
  approved: { label: "Approved", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200" },
};

const LEAVE_TYPE_LABEL: Record<LeaveType, string> = {
  casual:    "Casual",
  sick:      "Sick",
  earned:    "Earned",
  maternity: "Maternity",
  paternity: "Paternity",
  other:     "Other",
};

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
}

// ── Main component ────────────────────────────────────────────

export function EmployeeTabs({
  todayRecord,
  attendanceHistory,
  leaveHistory,
  tasks,
  stats,
}: EmployeeTabsProps) {
  const attendanceStatus = todayRecord?.punch_in
    ? todayRecord.punch_out
      ? "Completed"
      : "In Progress"
    : "Not Started";

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList className="w-full sm:w-auto">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="attendance">Attendance</TabsTrigger>
        <TabsTrigger value="leaves">Leaves</TabsTrigger>
        <TabsTrigger value="tasks">Tasks</TabsTrigger>
      </TabsList>

      {/* ── OVERVIEW TAB ────────────────────────────────── */}
      <TabsContent value="overview" className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Present Days"
            value={stats.presentDays}
            description="This month"
            icon={CalendarCheck}
          />
          <StatCard
            title="Total Leaves"
            value={stats.totalLeaves}
            description="Approved this year"
            icon={FileText}
          />
          <StatCard
            title="Today's Hours"
            value={stats.todayHours}
            description="Logged today"
            icon={Clock}
          />
          <StatCard
            title="Pending Tasks"
            value={stats.pendingTasks}
            description="Outstanding"
            icon={CheckSquare}
          />
        </div>

        {/* Quick status strip */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Today's Status</p>
                <p className="font-medium">{attendanceStatus}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Punch In</p>
                <p className="font-medium">{fmtTime(todayRecord?.punch_in ?? null)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Punch Out</p>
                <p className="font-medium">{fmtTime(todayRecord?.punch_out ?? null)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-0.5">Hours Today</p>
                <p className="font-medium">
                  {todayRecord?.total_hours ? `${todayRecord.total_hours}h` : "—"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── ATTENDANCE TAB ──────────────────────────────── */}
      <TabsContent value="attendance" className="space-y-4">
        {/* Today's punch card */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <CardTitle className="text-base">Today&apos;s Attendance</CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date().toLocaleDateString("en-IN", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
              {todayRecord?.status && (
                <Badge
                  variant="outline"
                  className={`text-xs ${ATTENDANCE_BADGE[todayRecord.status].className}`}
                >
                  {ATTENDANCE_BADGE[todayRecord.status].label}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex gap-6">
                <div>
                  <p className="text-xs text-muted-foreground">Punch In</p>
                  <p className="text-sm font-semibold mt-0.5">
                    {fmtTime(todayRecord?.punch_in ?? null)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Punch Out</p>
                  <p className="text-sm font-semibold mt-0.5">
                    {fmtTime(todayRecord?.punch_out ?? null)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Hours</p>
                  <p className="text-sm font-semibold mt-0.5">
                    {todayRecord?.total_hours != null
                      ? `${todayRecord.total_hours}h`
                      : "—"}
                  </p>
                </div>
              </div>
              <PunchButtons todayRecord={todayRecord} />
            </div>
          </CardContent>
        </Card>

        {/* History */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              Attendance History
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {attendanceHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10 px-4">
                No attendance records found.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Punch In</TableHead>
                    <TableHead>Punch Out</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceHistory.map((rec) => {
                    const b = ATTENDANCE_BADGE[rec.status];
                    return (
                      <TableRow key={rec.id}>
                        <TableCell className="font-medium text-sm">
                          {fmtDate(rec.attendance_date)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {fmtTime(rec.punch_in)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {fmtTime(rec.punch_out)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {rec.total_hours != null ? `${rec.total_hours}h` : "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${b.className}`}>
                            {b.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── LEAVES TAB ─────────────────────────────────── */}
      <TabsContent value="leaves" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Leave Requests</h3>
            <p className="text-xs text-muted-foreground">
              {leaveHistory.filter((l) => l.status === "pending").length} pending
            </p>
          </div>
          <LeaveForm />
        </div>

        <Card>
          <CardContent className="p-0">
            {leaveHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-10 px-4">
                No leave requests yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveHistory.map((leave) => {
                    const b = LEAVE_STATUS_BADGE[leave.status];
                    return (
                      <TableRow key={leave.id}>
                        <TableCell className="text-sm font-medium">
                          {LEAVE_TYPE_LABEL[leave.leave_type]}
                        </TableCell>
                        <TableCell className="text-sm">
                          {fmtDate(leave.from_date)}
                        </TableCell>
                        <TableCell className="text-sm">
                          {fmtDate(leave.to_date)}
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate">
                          {leave.reason}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${b.className}`}>
                            {b.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* ── TASKS TAB ──────────────────────────────────── */}
      <TabsContent value="tasks" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Daily Tasks</h3>
            <p className="text-xs text-muted-foreground">
              {tasks.filter((t) => t.status === "completed").length} of {tasks.length} completed
            </p>
          </div>
          <TaskForm />
        </div>

        <TaskList tasks={tasks} />
      </TabsContent>
    </Tabs>
  );
}
