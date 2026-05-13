"use client";

import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { AnalyticsCard } from "@/components/ds";
import { EmptyState } from "@/components/ds";
import { TrendingUp } from "lucide-react";

interface MonthlyDataPoint { month: string; count: number }

export function MonthlyChart({ data }: { data: MonthlyDataPoint[] }) {
  const hasData = data.some((d) => d.count > 0);

  return (
    <AnalyticsCard
      title="Lead Volume"
      description="New leads added over the last 6 months"
      minHeight={220}
    >
      {!hasData ? (
        <EmptyState icon={TrendingUp} title="No lead data yet" variant="inline" />
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="leadGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="hsl(var(--primary))" stopOpacity={0.18} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                fontSize: 12, borderRadius: 10,
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--popover))",
                color: "hsl(var(--popover-foreground))",
                boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
              }}
              cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
              formatter={(v) => [v ?? 0, "Leads"]}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              fill="url(#leadGrad)"
              dot={{ fill: "hsl(var(--primary))", r: 3, strokeWidth: 0 }}
              activeDot={{ r: 5, strokeWidth: 0 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </AnalyticsCard>
  );
}
