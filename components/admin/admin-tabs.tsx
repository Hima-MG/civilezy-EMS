"use client";

import {
  LayoutDashboard,
  Users,
  BarChart2,
  Activity,
  Clock,
  CalendarOff,
  PhoneCall,
  UserCheck,
  IndianRupee,
  TrendingUp,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { UserManagement } from "./user-management";
import { AnalyticsSection, RoleDistributionChart } from "./analytics-charts";
import { RecentActivity } from "./recent-activity";
import { formatCurrency } from "@/lib/utils";
import type {
  AdminStats,
  AdminActivityItem,
  RoleDistributionPoint,
  LeadStatusPoint,
  AttendanceTrendPoint,
  MonthlyPayrollPoint,
  UserProfile,
} from "@/types";

const ACTIVITY_ICONS = {
  attendance: Clock,
  leave: CalendarOff,
  lead: PhoneCall,
  salary: IndianRupee,
} as const;

const ACTIVITY_COLORS = {
  attendance: "text-blue-500",
  leave: "text-yellow-500",
  lead: "text-purple-500",
  salary: "text-emerald-500",
} as const;

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
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
}

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
}: AdminTabsProps) {
  const combinedActivity = [
    ...recentAttendance,
    ...recentLeaves,
    ...recentLeads,
    ...recentSalary,
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 8);

  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList className="w-full sm:w-auto flex-wrap h-auto gap-0.5">
        <TabsTrigger value="overview" className="gap-1.5">
          <LayoutDashboard className="w-3.5 h-3.5" />
          Overview
        </TabsTrigger>
        <TabsTrigger value="users" className="gap-1.5">
          <Users className="w-3.5 h-3.5" />
          Users
          <span className="ml-1 text-xs bg-muted text-muted-foreground rounded-full px-1.5 py-0.5 font-medium">
            {users.length}
          </span>
        </TabsTrigger>
        <TabsTrigger value="analytics" className="gap-1.5">
          <BarChart2 className="w-3.5 h-3.5" />
          Analytics
        </TabsTrigger>
        <TabsTrigger value="activity" className="gap-1.5">
          <Activity className="w-3.5 h-3.5" />
          Activity
        </TabsTrigger>
      </TabsList>

      {/* ── OVERVIEW ──────────────────────────────────────────── */}
      <TabsContent value="overview" className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatCard
            title="Total Employees"
            value={stats.totalEmployees}
            description="Non-admin staff"
            icon={Users}
          />
          <StatCard
            title="Total Leads"
            value={stats.totalLeads}
            description="All time"
            icon={PhoneCall}
            iconClassName="bg-purple-500/10"
          />
          <StatCard
            title="Present Today"
            value={stats.attendanceToday}
            description="Punched in today"
            icon={UserCheck}
            iconClassName="bg-green-500/10"
          />
          <StatCard
            title="Pending Leaves"
            value={stats.pendingLeaves}
            description="Awaiting approval"
            icon={CalendarOff}
            iconClassName="bg-yellow-500/10"
          />
          <StatCard
            title="Monthly Payroll"
            value={formatCurrency(stats.monthlyPayroll)}
            description="Current month"
            icon={IndianRupee}
            iconClassName="bg-emerald-500/10"
          />
          <StatCard
            title="Converted Leads"
            value={stats.convertedLeads}
            description="Total converted"
            icon={TrendingUp}
            iconClassName="bg-blue-500/10"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RoleDistributionChart data={roleDistribution} />

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {combinedActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No recent activity.
                </p>
              ) : (
                <div>
                  {combinedActivity.map((item) => {
                    const Icon = ACTIVITY_ICONS[item.type];
                    const color = ACTIVITY_COLORS[item.type];
                    return (
                      <div
                        key={`${item.type}-${item.id}`}
                        className="flex items-start gap-3 px-4 py-3 border-b last:border-0"
                      >
                        <div className={`mt-0.5 shrink-0 ${color}`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {item.detail}
                          </p>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          <span className="text-xs text-muted-foreground">
                            {timeAgo(item.time)}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-xs h-4 px-1.5 capitalize"
                          >
                            {item.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      {/* ── USERS ─────────────────────────────────────────────── */}
      <TabsContent value="users">
        <UserManagement users={users} currentUserId={currentUserId} />
      </TabsContent>

      {/* ── ANALYTICS ─────────────────────────────────────────── */}
      <TabsContent value="analytics">
        <AnalyticsSection
          roleDistribution={roleDistribution}
          leadStatusData={leadStatusData}
          attendanceTrend={attendanceTrend}
          payrollTrend={payrollTrend}
        />
      </TabsContent>

      {/* ── ACTIVITY ──────────────────────────────────────────── */}
      <TabsContent value="activity">
        <RecentActivity
          attendance={recentAttendance}
          leaves={recentLeaves}
          leads={recentLeads}
          salary={recentSalary}
        />
      </TabsContent>
    </Tabs>
  );
}
