"use client";

import { Users, BarChart3, Target, TrendingUp, PhoneCall } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { StatCard } from "@/components/dashboard/stat-card";
import { LeadsTable } from "./leads-table";
import { StatusChart } from "./status-chart";
import { MonthlyChart } from "./monthly-chart";
import type { Lead, LeadNote } from "@/types";

interface Analytics {
  totalLeads: number;
  convertedLeads: number;
  pendingFollowups: number;
  conversionRate: number;
}

interface StatusDataPoint {
  status: string;
  count: number;
}

interface MonthlyDataPoint {
  month: string;
  count: number;
}

interface CreTabsProps {
  leads: Lead[];
  notesMap: Record<string, LeadNote[]>;
  analytics: Analytics;
  statusData: StatusDataPoint[];
  monthlyData: MonthlyDataPoint[];
}

export function CreTabs({
  leads,
  notesMap,
  analytics,
  statusData,
  monthlyData,
}: CreTabsProps) {
  return (
    <Tabs defaultValue="overview" className="space-y-4">
      <TabsList className="w-full sm:w-auto">
        <TabsTrigger value="overview" className="gap-1.5">
          <BarChart3 className="w-3.5 h-3.5" />
          Overview
        </TabsTrigger>
        <TabsTrigger value="leads" className="gap-1.5">
          <Users className="w-3.5 h-3.5" />
          Leads
          {analytics.totalLeads > 0 && (
            <span className="ml-1 text-xs bg-primary/10 text-primary rounded-full px-1.5 py-0.5 font-semibold">
              {analytics.totalLeads}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      {/* ── OVERVIEW TAB ─────────────────────────────────────── */}
      <TabsContent value="overview" className="space-y-4">
        {/* Analytics cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Leads"
            value={analytics.totalLeads}
            description="All time"
            icon={Users}
          />
          <StatCard
            title="Converted"
            value={analytics.convertedLeads}
            description="Successfully closed"
            icon={Target}
            iconClassName="bg-green-500/10"
          />
          <StatCard
            title="Pending Follow-ups"
            value={analytics.pendingFollowups}
            description="Awaiting action"
            icon={PhoneCall}
            iconClassName="bg-orange-500/10"
          />
          <StatCard
            title="Conversion Rate"
            value={`${analytics.conversionRate}%`}
            description="Leads to conversions"
            icon={TrendingUp}
            iconClassName="bg-emerald-500/10"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <StatusChart data={statusData} />
          <MonthlyChart data={monthlyData} />
        </div>
      </TabsContent>

      {/* ── LEADS TAB ────────────────────────────────────────── */}
      <TabsContent value="leads">
        <LeadsTable leads={leads} notesMap={notesMap} />
      </TabsContent>
    </Tabs>
  );
}
