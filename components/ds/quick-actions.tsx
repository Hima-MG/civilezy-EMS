"use client";

import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StatusVariant } from "./status-badge";

export interface QuickAction {
  label: string;
  description?: string;
  icon: LucideIcon;
  onClick: () => void;
  accent?: StatusVariant | "violet" | "default";
  disabled?: boolean;
}

const ACTION_ACCENT: Record<string, string> = {
  success: "bg-emerald-500/10 text-emerald-500 group-hover:bg-emerald-500/18",
  pending: "bg-amber-500/10 text-amber-500 group-hover:bg-amber-500/18",
  danger:  "bg-red-500/10 text-red-500 group-hover:bg-red-500/18",
  info:    "bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/18",
  violet:  "bg-violet-500/10 text-violet-500 group-hover:bg-violet-500/18",
  default: "bg-primary/10 text-primary group-hover:bg-primary/18",
  neutral: "bg-muted text-muted-foreground group-hover:bg-muted/80",
};

interface QuickActionsProps {
  title?: string;
  actions: QuickAction[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export function QuickActions({ title, actions, columns = 2, className }: QuickActionsProps) {
  const colClass = {
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-4",
  }[columns];

  return (
    <div className={cn("rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm", className)}>
      {/* top shimmer */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none" />

      {title && (
        <div className="px-5 pt-5 pb-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {title}
          </p>
        </div>
      )}

      <div className={cn("grid gap-px bg-border/40 rounded-2xl overflow-hidden", colClass)}>
        {actions.map((action, i) => {
          const accentKey = action.accent ?? "default";
          const iconStyle = ACTION_ACCENT[accentKey] ?? ACTION_ACCENT.default;

          return (
            <motion.button
              key={i}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.98 }}
              transition={{ duration: 0.12 }}
              onClick={action.onClick}
              disabled={action.disabled}
              className={cn(
                "group flex flex-col items-start gap-2.5 p-4 bg-card",
                "transition-colors duration-150 hover:bg-accent/40",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "text-left cursor-pointer"
              )}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-9 h-9 rounded-xl transition-colors duration-150",
                  iconStyle
                )}
              >
                <action.icon className="w-4 h-4" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground leading-tight">{action.label}</p>
                {action.description && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    {action.description}
                  </p>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
