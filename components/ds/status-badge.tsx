"use client";

import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full font-medium transition-colors",
  {
    variants: {
      status: {
        success:  "bg-emerald-500/12 text-emerald-500",
        pending:  "bg-amber-500/12 text-amber-500",
        danger:   "bg-red-500/12 text-red-500",
        info:     "bg-blue-500/12 text-blue-500",
        neutral:  "bg-muted text-muted-foreground",
        violet:   "bg-violet-500/12 text-violet-500",
      },
      size: {
        sm: "text-[10px] px-2 py-0.5",
        md: "text-xs px-2.5 py-1",
        lg: "text-sm px-3 py-1.5",
      },
    },
    defaultVariants: {
      status: "neutral",
      size: "sm",
    },
  }
);

const DOT_COLORS: Record<string, string> = {
  success: "bg-emerald-500",
  pending: "bg-amber-500",
  danger:  "bg-red-500",
  info:    "bg-blue-500",
  neutral: "bg-muted-foreground",
  violet:  "bg-violet-500",
};

export type StatusVariant = "success" | "pending" | "danger" | "info" | "neutral" | "violet";

interface StatusBadgeProps extends VariantProps<typeof statusBadgeVariants> {
  label: string;
  dot?: boolean;
  className?: string;
}

export function StatusBadge({ label, status, size, dot = true, className }: StatusBadgeProps) {
  const resolvedStatus = (status ?? "neutral") as string;
  return (
    <span className={cn(statusBadgeVariants({ status, size }), className)}>
      {dot && (
        <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", DOT_COLORS[resolvedStatus])} />
      )}
      {label}
    </span>
  );
}
