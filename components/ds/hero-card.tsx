"use client";

import { motion } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeroStat {
  label: string;
  value: string | number;
  accent?: string;
}

interface HeroCardProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  stats?: HeroStat[];
  action?: React.ReactNode;
  /** Accent gradient: "indigo" | "emerald" | "amber" | "none" */
  gradient?: "indigo" | "emerald" | "amber" | "none";
  className?: string;
}

const GRADIENTS = {
  indigo:  "from-primary/8 via-transparent to-transparent",
  emerald: "from-emerald-500/8 via-transparent to-transparent",
  amber:   "from-amber-500/8 via-transparent to-transparent",
  none:    "",
};

export function HeroCard({
  title,
  subtitle,
  icon: Icon,
  stats,
  action,
  gradient = "indigo",
  className,
}: HeroCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "relative rounded-2xl border border-border/60 bg-card overflow-hidden",
        "shadow-sm",
        className
      )}
    >
      {/* gradient wash */}
      {gradient !== "none" && (
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br pointer-events-none",
            GRADIENTS[gradient]
          )}
        />
      )}
      {/* top shimmer */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="relative px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Icon + text */}
        <div className="flex items-center gap-4 flex-1 min-w-0">
          {Icon && (
            <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-primary/12 text-primary shrink-0">
              <Icon className="w-5 h-5" strokeWidth={1.75} />
            </div>
          )}
          <div className="min-w-0">
            <h2 className="text-lg font-bold tracking-tight leading-tight text-foreground truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Stats row */}
        {stats && stats.length > 0 && (
          <div className="flex items-center gap-5 shrink-0">
            {stats.map((s, i) => (
              <div key={i} className="text-center">
                <p
                  className={cn(
                    "text-2xl font-bold tracking-tight leading-none",
                    s.accent ?? "text-foreground"
                  )}
                >
                  {s.value}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Action */}
        {action && <div className="shrink-0">{action}</div>}
      </div>
    </motion.div>
  );
}
