"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Accent = "default" | "green" | "yellow" | "red" | "blue" | "violet" | "orange";

const ACCENT: Record<Accent, { icon: string; ring: string }> = {
  default: { icon: "bg-primary/12 text-primary",          ring: "" },
  green:   { icon: "bg-emerald-500/12 text-emerald-500",  ring: "hover:ring-emerald-500/15" },
  yellow:  { icon: "bg-amber-500/12 text-amber-500",      ring: "hover:ring-amber-500/15" },
  red:     { icon: "bg-red-500/12 text-red-500",          ring: "hover:ring-red-500/15" },
  blue:    { icon: "bg-blue-500/12 text-blue-500",        ring: "hover:ring-blue-500/15" },
  violet:  { icon: "bg-violet-500/12 text-violet-500",    ring: "hover:ring-violet-500/15" },
  orange:  { icon: "bg-orange-500/12 text-orange-500",    ring: "hover:ring-orange-500/15" },
};

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  accent?: Accent;
  trend?: {
    value: number;
    label?: string;
  };
  className?: string;
}

export function KpiCard({
  title,
  value,
  subtitle,
  icon: Icon,
  accent = "default",
  trend,
  className,
}: KpiCardProps) {
  const a = ACCENT[accent];
  const isPositive = trend && trend.value > 0;
  const isNeutral  = trend && trend.value === 0;

  return (
    <motion.div
      whileHover={{ y: -2, transition: { duration: 0.18, ease: "easeOut" } }}
      className={cn(
        "group relative rounded-2xl border border-border/60 bg-card p-5 overflow-hidden",
        "shadow-sm hover:shadow-lg hover:shadow-black/8 hover:border-border",
        "ring-1 ring-transparent transition-all duration-200",
        a.ring,
        className
      )}
    >
      {/* top-edge shimmer */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />

      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground truncate">
            {title}
          </p>
          <p className="text-3xl font-bold tracking-tight leading-none text-foreground">
            {value}
          </p>
          {subtitle && (
            <p className="text-xs text-muted-foreground/80 leading-snug mt-1.5">{subtitle}</p>
          )}
          {trend && (
            <div
              className={cn(
                "inline-flex items-center gap-1 text-[11px] font-semibold mt-2 rounded-full px-2 py-0.5",
                isNeutral  ? "bg-muted text-muted-foreground" :
                isPositive ? "bg-emerald-500/10 text-emerald-500" :
                             "bg-red-500/10 text-red-500"
              )}
            >
              {isNeutral  ? <Minus className="w-3 h-3" /> :
               isPositive ? <TrendingUp className="w-3 h-3" /> :
                            <TrendingDown className="w-3 h-3" />}
              <span>
                {isPositive ? "+" : ""}{trend.value}%
                {trend.label ? ` ${trend.label}` : ""}
              </span>
            </div>
          )}
        </div>

        <div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-xl shrink-0",
            "transition-transform duration-200 group-hover:scale-110",
            a.icon
          )}
        >
          <Icon className="w-4.5 h-4.5" strokeWidth={1.75} />
        </div>
      </div>
    </motion.div>
  );
}
