"use client";

import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatusBadge, type StatusVariant } from "./status-badge";

export interface ActivityItem {
  id: string;
  title: string;
  description?: string;
  timestamp: string;
  icon?: LucideIcon;
  status?: StatusVariant;
  statusLabel?: string;
  user?: string;
  /** small colored dot when no icon is set */
  accent?: StatusVariant;
}

const ICON_ACCENT: Record<StatusVariant, string> = {
  success: "bg-emerald-500/12 text-emerald-500",
  pending: "bg-amber-500/12 text-amber-500",
  danger:  "bg-red-500/12 text-red-500",
  info:    "bg-blue-500/12 text-blue-500",
  neutral: "bg-muted text-muted-foreground",
  violet:  "bg-violet-500/12 text-violet-500",
};

const DOT_ACCENT: Record<StatusVariant, string> = {
  success: "bg-emerald-500",
  pending: "bg-amber-500",
  danger:  "bg-red-500",
  info:    "bg-blue-500",
  neutral: "bg-muted-foreground/40",
  violet:  "bg-violet-500",
};

interface ActivityFeedProps {
  title?: string;
  items: ActivityItem[];
  maxItems?: number;
  emptyLabel?: string;
  className?: string;
}

export function ActivityFeed({
  title,
  items,
  maxItems,
  emptyLabel = "No recent activity",
  className,
}: ActivityFeedProps) {
  const visible = maxItems ? items.slice(0, maxItems) : items;

  return (
    <div
      className={cn(
        "relative rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm",
        className
      )}
    >
      {/* top shimmer */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none" />

      {title && (
        <div className="px-5 pt-5 pb-3 border-b border-border/50">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {title}
          </p>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="flex items-center justify-center py-10 px-5">
          <p className="text-xs text-muted-foreground">{emptyLabel}</p>
        </div>
      ) : (
        <ul className="divide-y divide-border/40">
          {visible.map((item, i) => {
            const accentKey = item.accent ?? "neutral";
            const Icon = item.icon;

            return (
              <motion.li
                key={item.id}
                initial={{ opacity: 0, x: -4 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: i * 0.04 }}
                className="flex items-start gap-3 px-5 py-3.5 hover:bg-accent/30 transition-colors duration-150"
              >
                {/* indicator */}
                <div className="shrink-0 mt-0.5">
                  {Icon ? (
                    <div
                      className={cn(
                        "flex items-center justify-center w-7 h-7 rounded-lg",
                        ICON_ACCENT[accentKey]
                      )}
                    >
                      <Icon className="w-3.5 h-3.5" strokeWidth={1.75} />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center w-7 h-7">
                      <span
                        className={cn("w-2 h-2 rounded-full", DOT_ACCENT[accentKey])}
                      />
                    </div>
                  )}
                </div>

                {/* content */}
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground leading-tight truncate">
                      {item.title}
                    </p>
                    {item.status && item.statusLabel && (
                      <StatusBadge status={item.status} label={item.statusLabel} size="sm" />
                    )}
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground leading-snug">{item.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {item.user && (
                      <span className="text-[10px] font-medium text-muted-foreground/80">
                        {item.user}
                      </span>
                    )}
                    {item.user && item.timestamp && (
                      <span className="text-muted-foreground/40 text-[10px]">·</span>
                    )}
                    <span className="text-[10px] text-muted-foreground/60">{item.timestamp}</span>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
