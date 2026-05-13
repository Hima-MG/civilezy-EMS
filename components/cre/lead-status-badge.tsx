import { cn } from "@/lib/utils";
import type { LeadStatus } from "@/types";

// Exported so pipeline strip and table can share the same colors
export const LEAD_STATUS_CONFIG: Record<
  LeadStatus,
  { label: string; dot: string; bg: string; text: string }
> = {
  new:        { label: "New",        dot: "bg-blue-500",    bg: "bg-blue-500/12",    text: "text-blue-400" },
  contacted:  { label: "Contacted",  dot: "bg-violet-500",  bg: "bg-violet-500/12",  text: "text-violet-400" },
  interested: { label: "Interested", dot: "bg-amber-500",   bg: "bg-amber-500/12",   text: "text-amber-400" },
  follow_up:  { label: "Follow-up",  dot: "bg-orange-500",  bg: "bg-orange-500/12",  text: "text-orange-400" },
  converted:  { label: "Converted",  dot: "bg-emerald-500", bg: "bg-emerald-500/12", text: "text-emerald-400" },
  lost:       { label: "Lost",       dot: "bg-red-500",     bg: "bg-red-500/12",     text: "text-red-400" },
};

interface LeadStatusBadgeProps {
  status: LeadStatus;
  size?: "sm" | "md";
  dot?: boolean;
  className?: string;
}

export function LeadStatusBadge({
  status,
  size = "sm",
  dot = true,
  className,
}: LeadStatusBadgeProps) {
  const cfg = LEAD_STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-medium",
        size === "sm" ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1",
        cfg.bg, cfg.text,
        className
      )}
    >
      {dot && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />}
      {cfg.label}
    </span>
  );
}
