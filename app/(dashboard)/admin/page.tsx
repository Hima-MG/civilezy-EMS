import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Users, Building2, TrendingUp, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import type { UserProfile, Role } from "@/types";

export const metadata: Metadata = { title: "Admin Dashboard" };

export default async function AdminDashboard() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("[admin] getUser →", user?.id ?? "null");

  if (!user) redirect("/login");

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  console.log("[admin] profile →", JSON.stringify(profile), "error:", profileError?.code);

  if (!profile) {
    console.log("[admin] no profile found for user:", user.id, "— redirecting to login");
    redirect("/login");
  }

  const userProfile = profile as UserProfile;
  const role = userProfile.role as Role;

  return (
    <DashboardLayout
      profile={userProfile}
      role={role}
      title="Admin Dashboard"
      description="Organisation-wide overview"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Employees"
            value="84"
            description="Across all departments"
            icon={Users}
            trend={{ value: 5, label: "vs last month" }}
          />
          <StatCard
            title="Active Projects"
            value="12"
            description="3 launching this month"
            icon={Building2}
            trend={{ value: 8, label: "vs last quarter" }}
          />
          <StatCard
            title="Monthly Revenue"
            value={formatCurrency(6800000)}
            description="May 2026"
            icon={TrendingUp}
            trend={{ value: 14, label: "vs last month" }}
          />
          <StatCard
            title="System Health"
            value="99.8%"
            description="Uptime this month"
            icon={ShieldCheck}
            trend={{ value: 0.2, label: "vs last month" }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Recent System Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {[
                  { user: "Arun Patel", action: "User account created", role: "employee", time: "5m ago" },
                  { user: "Deepa Nair", action: "Role changed to hr_finance", role: "hr_finance", time: "1h ago" },
                  { user: "Kiran Raj", action: "Login from new device", role: "cre", time: "2h ago" },
                  { user: "Meera Das", action: "Profile updated", role: "employee", time: "3h ago" },
                  { user: "System", action: "Payroll batch processed", role: "admin", time: "5h ago" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b last:border-0 gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{item.user}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.action}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-xs capitalize">{item.role}</Badge>
                      <span className="text-xs text-muted-foreground w-12 text-right">{item.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Role Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[
                    { role: "Employee", count: 54, pct: 64, color: "bg-blue-500" },
                    { role: "CRE", count: 18, pct: 21, color: "bg-purple-500" },
                    { role: "HR Finance", count: 8, pct: 10, color: "bg-emerald-500" },
                    { role: "Admin", count: 4, pct: 5, color: "bg-orange-500" },
                  ].map((r, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium">{r.role}</span>
                        <span className="text-muted-foreground">{r.count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${r.color}`} style={{ width: `${r.pct}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">System Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2.5">
                  {[
                    { service: "API Server", status: "Operational" },
                    { service: "Database", status: "Operational" },
                    { service: "Auth Service", status: "Operational" },
                    { service: "Email Service", status: "Degraded" },
                    { service: "Storage", status: "Operational" },
                  ].map((s, i) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{s.service}</span>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${s.status === "Operational" ? "bg-emerald-500" : "bg-yellow-500"}`} />
                        <span className={`text-xs font-medium ${s.status === "Operational" ? "text-emerald-600 dark:text-emerald-400" : "text-yellow-600 dark:text-yellow-400"}`}>
                          {s.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
