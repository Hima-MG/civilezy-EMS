"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  RoleDistributionPoint,
  LeadStatusPoint,
  AttendanceTrendPoint,
  MonthlyPayrollPoint,
} from "@/types";

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: string;
}

function DefaultTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      {label && <p className="font-semibold mb-0.5">{label}</p>}
      <p className="text-muted-foreground">{payload[0]?.value ?? 0}</p>
    </div>
  );
}

function CurrencyTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value ?? 0;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      {label && <p className="font-semibold mb-0.5">{label}</p>}
      <p className="text-muted-foreground">
        ₹{new Intl.NumberFormat("en-IN").format(val)}
      </p>
    </div>
  );
}

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-48 text-xs text-muted-foreground">
      {message}
    </div>
  );
}

export function RoleDistributionChart({
  data,
}: {
  data: RoleDistributionPoint[];
}) {
  const hasData = data.some((d) => d.count > 0);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          User Role Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <EmptyChart message="No users yet." />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={data}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="role"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={30}
                allowDecimals={false}
              />
              <Tooltip
                content={<DefaultTooltip />}
                cursor={{ fill: "hsl(var(--muted))" }}
              />
              <Bar
                dataKey="count"
                name="Users"
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function LeadStatusChart({ data }: { data: LeadStatusPoint[] }) {
  const hasData = data.some((d) => d.count > 0);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          Lead Status Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <EmptyChart message="No leads yet." />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={data}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="status"
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={30}
                allowDecimals={false}
              />
              <Tooltip
                content={<DefaultTooltip />}
                cursor={{ fill: "hsl(var(--muted))" }}
              />
              <Bar
                dataKey="count"
                name="Leads"
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function AttendanceTrendChart({ data }: { data: AttendanceTrendPoint[] }) {
  const hasData = data.some((d) => d.present > 0);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          Attendance Trend (Last 6 Months)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <EmptyChart message="No attendance data yet." />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart
              data={data}
              margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={30}
                allowDecimals={false}
              />
              <Tooltip content={<DefaultTooltip />} />
              <Line
                type="monotone"
                dataKey="present"
                name="Present"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", r: 3 }}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

function PayrollTrendChart({ data }: { data: MonthlyPayrollPoint[] }) {
  const hasData = data.some((d) => d.total > 0);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">
          Monthly Payroll Trend (Last 6 Months)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <EmptyChart message="No payroll data yet." />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart
              data={data}
              margin={{ top: 4, right: 8, left: 8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={(v: number) =>
                  v >= 100000
                    ? `₹${(v / 100000).toFixed(1)}L`
                    : v >= 1000
                    ? `₹${(v / 1000).toFixed(0)}K`
                    : `₹${v}`
                }
                tick={{ fontSize: 10 }}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <Tooltip
                content={<CurrencyTooltip />}
                cursor={{ fill: "hsl(var(--muted))" }}
              />
              <Bar
                dataKey="total"
                name="Payroll"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

interface AnalyticsSectionProps {
  roleDistribution: RoleDistributionPoint[];
  leadStatusData: LeadStatusPoint[];
  attendanceTrend: AttendanceTrendPoint[];
  payrollTrend: MonthlyPayrollPoint[];
}

export function AnalyticsSection({
  roleDistribution,
  leadStatusData,
  attendanceTrend,
  payrollTrend,
}: AnalyticsSectionProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <RoleDistributionChart data={roleDistribution} />
      <LeadStatusChart data={leadStatusData} />
      <AttendanceTrendChart data={attendanceTrend} />
      <PayrollTrendChart data={payrollTrend} />
    </div>
  );
}
