"use client";

import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { AnalyticsCard } from "@/components/ds";
import { EmptyState } from "@/components/ds";
import { Users, PhoneCall, Clock, IndianRupee } from "lucide-react";
import type {
  RoleDistributionPoint,
  LeadStatusPoint,
  AttendanceTrendPoint,
  MonthlyPayrollPoint,
} from "@/types";

const TOOLTIP_STYLE = {
  fontSize: 12, borderRadius: 10,
  border: "1px solid hsl(var(--border))",
  background: "hsl(var(--popover))",
  color: "hsl(var(--popover-foreground))",
  boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
};

export function RoleDistributionChart({ data }: { data: RoleDistributionPoint[] }) {
  const hasData = data.some((d) => d.count > 0);
  return (
    <AnalyticsCard title="Team Composition" description="User count by role" minHeight={220}>
      {!hasData ? (
        <EmptyState icon={Users} title="No users yet" variant="inline" />
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis dataKey="role" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }} formatter={(v) => [v ?? 0, "Users"]} />
            <Bar dataKey="count" radius={[5, 5, 0, 0]} maxBarSize={44}>
              {data.map((entry, i) => <Cell key={i} fill={entry.color} opacity={0.9} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </AnalyticsCard>
  );
}

function LeadStatusChart({ data }: { data: LeadStatusPoint[] }) {
  const hasData = data.some((d) => d.count > 0);
  return (
    <AnalyticsCard title="Lead Pipeline" description="Lead count by stage" minHeight={220}>
      {!hasData ? (
        <EmptyState icon={PhoneCall} title="No leads yet" variant="inline" />
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis dataKey="status" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }} formatter={(v) => [v ?? 0, "Leads"]} />
            <Bar dataKey="count" radius={[5, 5, 0, 0]} maxBarSize={44}>
              {data.map((entry, i) => <Cell key={i} fill={entry.color} opacity={0.9} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </AnalyticsCard>
  );
}

function AttendanceTrendChart({ data }: { data: AttendanceTrendPoint[] }) {
  const hasData = data.some((d) => d.present > 0);
  return (
    <AnalyticsCard title="Attendance Trend" description="Present count over last 6 months" minHeight={220}>
      {!hasData ? (
        <EmptyState icon={Clock} title="No attendance data yet" variant="inline" />
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="attendGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.18} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }} formatter={(v) => [v ?? 0, "Present"]} />
            <Area type="monotone" dataKey="present" stroke="#3b82f6" strokeWidth={2} fill="url(#attendGrad)"
              dot={{ fill: "#3b82f6", r: 3, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </AnalyticsCard>
  );
}

export function PayrollTrendChart({ data }: { data: MonthlyPayrollPoint[] }) {
  const hasData = data.some((d) => d.total > 0);
  function fmtINR(v: number) {
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    if (v >= 1000)   return `₹${(v / 1000).toFixed(0)}K`;
    return `₹${v}`;
  }
  return (
    <AnalyticsCard title="Payroll Trend" description="Monthly salary disbursement over last 6 months" minHeight={220}>
      {!hasData ? (
        <EmptyState icon={IndianRupee} title="No payroll data yet" variant="inline" />
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -4, bottom: 0 }}>
            <defs>
              <linearGradient id="payrollGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.18} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
            <YAxis tickFormatter={fmtINR} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} width={48} />
            <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
              formatter={(v) => [`₹${new Intl.NumberFormat("en-IN").format(Number(v ?? 0))}`, "Payroll"]} />
            <Area type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#payrollGrad2)"
              dot={{ fill: "hsl(var(--primary))", r: 3, strokeWidth: 0 }} activeDot={{ r: 5, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </AnalyticsCard>
  );
}

interface AnalyticsSectionProps {
  roleDistribution: RoleDistributionPoint[];
  leadStatusData: LeadStatusPoint[];
  attendanceTrend: AttendanceTrendPoint[];
  payrollTrend: MonthlyPayrollPoint[];
}

export function AnalyticsSection({ roleDistribution, leadStatusData, attendanceTrend, payrollTrend }: AnalyticsSectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <RoleDistributionChart data={roleDistribution} />
      <LeadStatusChart data={leadStatusData} />
      <AttendanceTrendChart data={attendanceTrend} />
      <PayrollTrendChart data={payrollTrend} />
    </div>
  );
}
