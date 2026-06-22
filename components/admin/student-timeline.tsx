"use client";

import { UserPlus, ShoppingCart, RefreshCw, AlertTriangle, CreditCard, RotateCcw, Clock } from "lucide-react";
import { EmptyState } from "@/components/ds";
import { cn } from "@/lib/utils";
import type { ActivityLog, ActivityType } from "@/types";

const ACTIVITY_META: Record<ActivityType, { icon: typeof UserPlus; color: string; label: string }> = {
  registration: { icon: UserPlus, color: "text-emerald-500 bg-emerald-500/12", label: "Registration" },
  purchase: { icon: ShoppingCart, color: "text-blue-500 bg-blue-500/12", label: "Purchase" },
  renewal: { icon: RefreshCw, color: "text-violet-500 bg-violet-500/12", label: "Renewal" },
  expiry: { icon: AlertTriangle, color: "text-amber-500 bg-amber-500/12", label: "Expiry" },
  payment: { icon: CreditCard, color: "text-blue-500 bg-blue-500/12", label: "Payment" },
  refund: { icon: RotateCcw, color: "text-red-500 bg-red-500/12", label: "Refund" },
};

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function StudentTimeline({ activity }: { activity: ActivityLog[] }) {
  if (activity.length === 0) {
    return (
      <EmptyState
        icon={Clock}
        title="No activity recorded yet"
        description="Registration, purchase, renewal, expiry, and refund events will appear here as they're processed."
        variant="card"
      />
    );
  }

  return (
    <div className="relative rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none" />
      <div className="space-y-0">
        {activity.map((item, i) => {
          const meta = ACTIVITY_META[item.activity_type];
          const Icon = meta.icon;
          const isLast = i === activity.length - 1;
          return (
            <div key={item.id} className="flex gap-3">
              <div className="flex flex-col items-center shrink-0">
                <div className={cn("flex items-center justify-center w-8 h-8 rounded-xl", meta.color)}>
                  <Icon className="w-4 h-4" strokeWidth={1.75} />
                </div>
                {!isLast && <div className="w-px flex-1 bg-border/60 my-1" />}
              </div>
              <div className={cn("pb-5 min-w-0 flex-1", isLast && "pb-0")}>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-foreground">{meta.label}</p>
                  <span className="text-xs text-muted-foreground">{fmtDateTime(item.occurred_at)}</span>
                </div>
                {item.description && (
                  <p className="text-sm text-muted-foreground mt-0.5">{item.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
