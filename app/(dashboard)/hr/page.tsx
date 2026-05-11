import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Users, UserCheck, DollarSign, TrendingUp } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { UserProfile, Role } from "@/types";

export const metadata: Metadata = { title: "HR & Finance Dashboard" };

export default async function HRDashboard() {
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
  const role = (userProfile?.role ?? "hr_finance") as Role;

  return (
    <DashboardLayout
      profile={userProfile}
      role={role}
      title="HR & Finance"
      description="Human Resources and Financial Overview"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Employees"
            value="84"
            description="4 new this month"
            icon={Users}
            trend={{ value: 5, label: "vs last month" }}
          />
          <StatCard
            title="Present Today"
            value="71"
            description="84.5% attendance"
            icon={UserCheck}
            trend={{ value: -2, label: "vs yesterday" }}
          />
          <StatCard
            title="Monthly Payroll"
            value="₹38.2L"
            description="May 2026"
            icon={DollarSign}
            trend={{ value: 3.1, label: "vs last month" }}
          />
          <StatCard
            title="Open Positions"
            value="7"
            description="3 in final round"
            icon={TrendingUp}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pending Leave Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {[
                  { name: "Arun Patel", type: "Sick Leave", days: 2, from: "May 13" },
                  { name: "Deepa Nair", type: "Casual Leave", days: 1, from: "May 15" },
                  { name: "Kiran Raj", type: "Earned Leave", days: 5, from: "May 20" },
                  { name: "Meera Das", type: "Maternity Leave", days: 90, from: "Jun 1" },
                ].map((req, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{req.name}</p>
                      <p className="text-xs text-muted-foreground">{req.type} · From {req.from}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <span className="text-xs text-muted-foreground">{req.days}d</span>
                      <Badge variant="outline" className="text-xs">Pending</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Department Headcount</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { dept: "Engineering", count: 28, pct: 33 },
                  { dept: "Sales & CRE", count: 22, pct: 26 },
                  { dept: "Operations", count: 18, pct: 21 },
                  { dept: "HR & Finance", count: 10, pct: 12 },
                  { dept: "Management", count: 6, pct: 8 },
                ].map((row, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{row.dept}</span>
                      <span className="text-muted-foreground">{row.count} employees</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${row.pct}%` }}
                      />
                    </div>
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
