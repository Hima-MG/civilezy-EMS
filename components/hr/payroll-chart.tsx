"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { AnalyticsCard } from "@/components/ds";
import { EmptyState } from "@/components/ds";
import { IndianRupee } from "lucide-react";
import type { MonthlyPayrollPoint } from "@/types";

export function PayrollChart({ data }: { data: MonthlyPayrollPoint[] }) {
  const hasData = data.some((d) => d.total > 0);

  function fmtINR(v: number) {
    if (v >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
    if (v >= 1000)   return `₹${(v / 1000).toFixed(0)}K`;
    return `₹${v}`;
  }

  return (
    <AnalyticsCard
      title="Monthly Payroll"
      description="Total salary disbursements over the last 6 months"
      minHeight={220}
    >
      {!hasData ? (
        <EmptyState icon={IndianRupee} title="No payroll data yet" variant="inline" />
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -4, bottom: 0 }}>
            <defs>
              <linearGradient id="payrollGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.18} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
            <YAxis
              tickFormatter={fmtINR}
              tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false} axisLine={false} width={48}
            />
            <Tooltip
              contentStyle={{
                fontSize: 12, borderRadius: 10,
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--popover))",
                color: "hsl(var(--popover-foreground))",
                boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
              }}
              cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
              formatter={(v) => [`₹${new Intl.NumberFormat("en-IN").format(Number(v ?? 0))}`, "Payroll"]}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#payrollGrad)"
              dot={{ fill: "hsl(var(--primary))", r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </AnalyticsCard>
  );
}
