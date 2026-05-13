"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from "recharts";
import { AnalyticsCard } from "@/components/ds";
import { EmptyState } from "@/components/ds";
import { BarChart3 } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  New:        "#3b82f6",
  Contacted:  "#8b5cf6",
  Interested: "#f59e0b",
  "Follow-up":"#f97316",
  Converted:  "#22c55e",
  Lost:       "#ef4444",
};

interface StatusDataPoint { status: string; count: number }

export function StatusChart({ data }: { data: StatusDataPoint[] }) {
  const hasData = data.some((d) => d.count > 0);

  return (
    <AnalyticsCard
      title="Lead Status Distribution"
      description="Count of leads per stage"
      minHeight={220}
    >
      {!hasData ? (
        <EmptyState icon={BarChart3} title="No lead data yet" variant="inline" />
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
            <XAxis dataKey="status" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                fontSize: 12, borderRadius: 10,
                border: "1px solid hsl(var(--border))",
                background: "hsl(var(--popover))",
                color: "hsl(var(--popover-foreground))",
                boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
              }}
              cursor={{ fill: "hsl(var(--muted))", opacity: 0.5 }}
              formatter={(v) => [v ?? 0, "Leads"]}
            />
            <Bar dataKey="count" radius={[5, 5, 0, 0]} maxBarSize={44}>
              {data.map((entry) => (
                <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? "#6b7280"} opacity={0.9} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </AnalyticsCard>
  );
}
