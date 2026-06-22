"use client";

import { IndianRupee, Users, RefreshCw, AlertTriangle, UserPlus, ShoppingCart } from "lucide-react";
import { KpiCard, EmptyState } from "@/components/ds";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { CoursePurchase } from "@/types";

interface RecentPurchaseRow extends CoursePurchase {
  student_email: string;
  student_name: string;
}

interface EzyCourseAnalyticsProps {
  revenueToday: number;
  revenueThisMonth: number;
  renewalsDueCount: number;
  expiredMembershipsCount: number;
  newStudentsCount: number;
  recentPurchases: RecentPurchaseRow[];
}

export function EzyCourseAnalytics({
  revenueToday,
  revenueThisMonth,
  renewalsDueCount,
  expiredMembershipsCount,
  newStudentsCount,
  recentPurchases,
}: EzyCourseAnalyticsProps) {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <KpiCard title="Revenue Today" value={formatCurrency(revenueToday)} icon={IndianRupee} accent="green" />
        <KpiCard title="Revenue This Month" value={formatCurrency(revenueThisMonth)} icon={IndianRupee} accent="blue" />
        <KpiCard title="New Students (7d)" value={newStudentsCount} icon={UserPlus} accent="violet" />
        <KpiCard
          title="Renewals Due (7d)"
          value={renewalsDueCount}
          subtitle="Active memberships expiring soon"
          icon={RefreshCw}
          accent="yellow"
        />
        <KpiCard
          title="Expired Memberships"
          value={expiredMembershipsCount}
          subtitle="Past their expiry date"
          icon={AlertTriangle}
          accent="red"
        />
        <KpiCard title="Recent Purchases" value={recentPurchases.length} icon={ShoppingCart} accent="default" />
      </div>

      <div className="relative rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none" />
        <div className="px-5 pt-4 pb-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            Recent Purchases
          </p>
        </div>
        {recentPurchases.length === 0 ? (
          <EmptyState icon={Users} title="No purchases recorded yet" variant="inline" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40">
                  {["Student", "Product", "Price", "Date"].map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted/20 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentPurchases.map((p) => (
                  <tr key={p.id} className="border-b border-border/30 last:border-0 hover:bg-accent/20 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{p.student_name || p.student_email}</p>
                      <p className="text-xs text-muted-foreground">{p.student_email}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{p.product_name}</td>
                    <td className="px-4 py-3 font-semibold text-foreground tabular-nums">{formatCurrency(p.price)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(p.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
