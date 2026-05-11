import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Clock, CalendarCheck, FileText, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { UserProfile, Role } from "@/types";

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

  const userProfile = profile as UserProfile | null;
  const role = (userProfile?.role ?? "employee") as Role;

  return (
    <DashboardLayout
      profile={userProfile}
      role={role}
      title="My Dashboard"
      description={`Welcome back, ${userProfile?.full_name?.split(" ")[0] ?? "there"}`}
    >
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Days Present"
            value="21"
            description="This month"
            icon={CalendarCheck}
            trend={{ value: 5, label: "vs last month" }}
          />
          <StatCard
            title="Hours Logged"
            value="168"
            description="This month"
            icon={Clock}
            trend={{ value: 2.3, label: "vs last month" }}
          />
          <StatCard
            title="Leaves Remaining"
            value="12"
            description="Out of 24 annual"
            icon={FileText}
          />
          <StatCard
            title="Performance"
            value="94%"
            description="Current quarter"
            icon={TrendingUp}
            trend={{ value: 8, label: "vs last quarter" }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { action: "Checked in", time: "09:02 AM", date: "Today", status: "success" },
                  { action: "Leave approved", time: "Yesterday", date: "May 10", status: "success" },
                  { action: "Task completed", time: "2 days ago", date: "May 9", status: "default" },
                  { action: "Payslip generated", time: "May 1", date: "May 1", status: "secondary" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{item.action}</p>
                      <p className="text-xs text-muted-foreground">{item.date}</p>
                    </div>
                    <Badge variant={item.status as "default" | "secondary" | "outline"} className="text-xs">
                      {item.time}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Upcoming */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { title: "Team standup", date: "Today, 10:00 AM", type: "Meeting" },
                  { title: "Q2 review submission", date: "May 15, 2026", type: "Deadline" },
                  { title: "Annual performance review", date: "May 20, 2026", type: "Review" },
                  { title: "Salary credit", date: "May 31, 2026", type: "Finance" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5 border-b last:border-0">
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.date}</p>
                    </div>
                    <Badge variant="outline" className="text-xs">{item.type}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
