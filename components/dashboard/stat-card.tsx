"use client";

import { motion } from "framer-motion";
import { type LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
  };
  className?: string;
  iconClassName?: string;
  accent?: "default" | "green" | "yellow" | "red" | "blue" | "violet";
}

const ACCENT_STYLES = {
  default: {
    icon: "bg-primary/10 text-primary",
    glow: "",
  },
  green: {
    icon: "bg-emerald-500/12 text-emerald-500",
    glow: "shadow-emerald-500/5",
  },
  yellow: {
    icon: "bg-yellow-500/12 text-yellow-500",
    glow: "shadow-yellow-500/5",
  },
  red: {
    icon: "bg-red-500/12 text-red-500",
    glow: "shadow-red-500/5",
  },
  blue: {
    icon: "bg-blue-500/12 text-blue-500",
    glow: "shadow-blue-500/5",
  },
  violet: {
    icon: "bg-violet-500/12 text-violet-500",
    glow: "shadow-violet-500/5",
  },
};

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  className,
  iconClassName,
  accent = "default",
}: StatCardProps) {
  const styles = ACCENT_STYLES[accent];
  const isPositive = trend && trend.value >= 0;

  return (
    <motion.div
      whileHover={{ y: -1, transition: { duration: 0.15 } }}
      className={cn(
        "relative rounded-xl border border-border/60 bg-card p-4 overflow-hidden group",
        "shadow-sm hover:shadow-md hover:border-border transition-all duration-200",
        styles.glow,
        className
      )}
    >
      {/* Subtle top-edge gradient highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent opacity-60" />

      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 flex-1 min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
            {title}
          </p>
          <p className="text-2xl font-bold tracking-tight leading-none">{value}</p>
          {description && (
            <p className="text-xs text-muted-foreground/80 mt-1">{description}</p>
          )}
          {trend && (
            <div
              className={cn(
                "flex items-center gap-1 text-xs font-medium mt-1",
                isPositive ? "text-emerald-500" : "text-red-500"
              )}
            >
              {isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>
                {isPositive ? "+" : ""}
                {trend.value}% {trend.label}
              </span>
            </div>
          )}
        </div>

        <div
          className={cn(
            "flex items-center justify-center w-9 h-9 rounded-xl shrink-0 transition-transform duration-200 group-hover:scale-105",
            styles.icon,
            iconClassName
          )}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>
    </motion.div>
  );
}
