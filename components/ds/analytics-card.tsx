"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface AnalyticsCardProps {
  title: string;
  description?: string;
  /** Optional pill controls rendered top-right (period selector, export button, etc.) */
  controls?: React.ReactNode;
  /** Optional inline stat shown beside the title */
  badge?: React.ReactNode;
  children: React.ReactNode;
  /** Minimum chart area height. Defaults to 260 */
  minHeight?: number;
  className?: string;
  contentClassName?: string;
}

export function AnalyticsCard({
  title,
  description,
  controls,
  badge,
  children,
  minHeight = 260,
  className,
  contentClassName,
}: AnalyticsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn(
        "relative rounded-2xl border border-border/60 bg-card overflow-hidden",
        "shadow-sm hover:shadow-md hover:border-border transition-shadow duration-200",
        className
      )}
    >
      {/* top shimmer */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-foreground leading-tight">{title}</h3>
            {badge}
          </div>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{description}</p>
          )}
        </div>
        {controls && (
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
            {controls}
          </div>
        )}
      </div>

      {/* Chart area */}
      <div
        className={cn("px-5 pb-5 pt-4", contentClassName)}
        style={{ minHeight }}
      >
        {children}
      </div>
    </motion.div>
  );
}
