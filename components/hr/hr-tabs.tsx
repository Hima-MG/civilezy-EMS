"use client";

import {
  LayoutDashboard,
  Clock,
  CalendarOff,
  DollarSign,
  Users,
  UserCheck,
  PhoneCall,
  IndianRupee,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { AttendanceView } from "./attendance-view";
import { LeaveManagement } from "./leave-management";
import { SalaryManager } from "./salary-manager";
import { PayrollChart } from "./payroll-chart";
import { formatCurrency } from "@/lib/utils";
import type {
  UserProfile,
  AttendanceWithProfile,
  LeaveWithProfile,
  SalaryWithProfile,
  HrAnalytics,
  MonthlyPayrollPoint,
  LeaveStatus,
} from "@/types";

const LEAVE_TYPE_LABEL: Record<string, string> = {
  casual: "Casual", sick: "Sick", earned: "Earned",
  maternity: "Maternity", paternity: "Paternity", other: "Other",
};

const LEAVE_STATUS_BADGE: Record<LeaveStatus, { label: string; className: string }> = {
  pending:  { label: "Pending",  className: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400" },
  approved: { label: "Approved", className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400" },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function daysBetween(from: string, to: string) {
  return Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1);
}

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
  const pendingLeaves = leaves.filter((l) => l.status === "pending").slice(0, 6);

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList className="w-full sm:w-auto flex-wrap h-auto gap-0.5">
        <TabsTrigger value="overview" className="gap-1.5">
          <LayoutDashboard className="w-3.5 h-3.5" />
          Overview
        </TabsTrigger>
        <TabsTrigger value="attendance" className="gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          Attendance
        </TabsTrigger>
        <TabsTrigger value="leaves" className="gap-1.5">
          <CalendarOff className="w-3.5 h-3.5" />
          Leaves
          {analytics.pendingLeaves > 0 && (
            <span className="ml-1 text-xs bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 rounded-full px-1.5 py-0.5 font-semibold">
              {analytics.pendingLeaves}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="payroll" className="gap-1.5">
          <DollarSign className="w-3.5 h-3.5" />
          Payroll
        </TabsTrigger>
      </TabsList>

      {/* ── OVERVIEW TAB ──────────────────────────────────────── */}
      <TabsContent value="overview" className="space-y-4">
        {/* Analytics cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Employees"
            value={analytics.totalEmployees}
            description="Active staff"
            icon={Users}
          />
          <StatCard
            title="Present Today"
            value={analytics.presentToday}
            description="Attendance today"
            icon={UserCheck}
            iconClassName="bg-green-500/10"
          />
          <StatCard
            title="Pending Leaves"
            value={analytics.pendingLeaves}
            description="Awaiting approval"
            icon={PhoneCall}
            iconClassName="bg-yellow-500/10"
          />
          <StatCard
            title="Monthly Payroll"
            value={formatCurrency(analytics.monthlyPayroll)}
            description="Current month"
            icon={IndianRupee}
            iconClassName="bg-emerald-500/10"
          />
        </div>

        {/* Charts + quick leave list */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Payroll chart */}
          <PayrollChart data={monthlyPayrollData} />

          {/* Pending leaves quick list */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center justify-between">
                Pending Leave Requests
                <span className="text-xs font-normal text-muted-foreground">
                  {analytics.pendingLeaves} total
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {pendingLeaves.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No pending leave requests.
                </p>
              ) : (
                <div>
                  {pendingLeaves.map((leave) => {
                    const b = LEAVE_STATUS_BADGE[leave.status];
                    return (
                      <div
                        key={leave.id}
                        className="flex items-center justify-between px-4 py-3 border-b last:border-0"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{leave.full_name || "—"}</p>
                          <p className="text-xs text-muted-foreground">
                            {LEAVE_TYPE_LABEL[leave.leave_type] ?? leave.leave_type} ·{" "}
                            {fmtDate(leave.from_date)} → {fmtDate(leave.to_date)} ·{" "}
                            {daysBetween(leave.from_date, leave.to_date)}d
                          </p>
                        </div>
                        <Badge variant="outline" className={`ml-3 shrink-0 text-xs ${b.className}`}>
                          {b.label}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* ── ATTENDANCE TAB ────────────────────────────────────── */}
      <TabsContent value="attendance">
        <AttendanceView attendance={attendance} profiles={profiles} />
      </TabsContent>

      {/* ── LEAVES TAB ───────────────────────────────────────── */}
      <TabsContent value="leaves">
        <LeaveManagement leaves={leaves} profiles={profiles} />
      </TabsContent>

      {/* ── PAYROLL TAB ──────────────────────────────────────── */}
      <TabsContent value="payroll">
        <SalaryManager
          salaryRecords={salaryRecords}
          profiles={profiles}
          attendance={attendance}
        />
      </TabsContent>
    </Tabs>
  );
}
