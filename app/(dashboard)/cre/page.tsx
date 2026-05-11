import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Users, Target, TrendingUp, Building2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { UserProfile, Role } from "@/types";

export const metadata: Metadata = { title: "CRE Dashboard" };

const recentLeads = [
  { name: "Rajesh Kumar", project: "Skyline Residency", stage: "Site Visit", value: "₹85L" },
  { name: "Priya Mehta", project: "Green Villas", stage: "Negotiation", value: "₹1.2Cr" },
  { name: "Suresh Iyer", project: "Metro Heights", stage: "New Lead", value: "₹60L" },
  { name: "Anita Sharma", project: "Skyline Residency", stage: "Closed", value: "₹95L" },
  { name: "Vikram Singh", project: "Green Villas", stage: "Follow-up", value: "₹72L" },
];

const stageColor: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  "New Lead": "secondary",
  "Site Visit": "outline",
  "Negotiation": "default",
  "Closed": "default",
  "Follow-up": "secondary",
};

export default async function CREDashboard() {
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
  const role = (userProfile?.role ?? "cre") as Role;

  return (
    <DashboardLayout
      profile={userProfile}
      role={role}
      title="CRE Dashboard"
      description="Customer Relationship & Sales Overview"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Active Leads"
            value="47"
            description="Across all projects"
            icon={Users}
            trend={{ value: 12, label: "vs last month" }}
          />
          <StatCard
            title="Site Visits"
            value="18"
            description="This month"
            icon={Building2}
            trend={{ value: 5, label: "vs last month" }}
          />
          <StatCard
            title="Conversions"
            value="6"
            description="This month"
            icon={Target}
            trend={{ value: 20, label: "vs last month" }}
          />
          <StatCard
            title="Revenue Target"
            value="68%"
            description="₹4.1Cr of ₹6Cr"
            icon={TrendingUp}
            trend={{ value: 3, label: "vs last month" }}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Leads</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-0">
                {recentLeads.map((lead, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between py-3 border-b last:border-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{lead.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{lead.project}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-4 shrink-0">
                      <span className="text-sm font-semibold">{lead.value}</span>
                      <Badge variant={stageColor[lead.stage] ?? "secondary"} className="text-xs">
                        {lead.stage}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pipeline Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { stage: "New Leads", count: 14, value: "₹8.4Cr", pct: 30 },
                  { stage: "Site Visits", count: 18, value: "₹10.8Cr", pct: 38 },
                  { stage: "Negotiation", count: 9, value: "₹5.4Cr", pct: 19 },
                  { stage: "Closed Won", count: 6, value: "₹3.6Cr", pct: 13 },
                ].map((row, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{row.stage}</span>
                      <span className="text-muted-foreground">{row.count} leads · {row.value}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
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
