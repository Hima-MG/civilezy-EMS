"use client";

import { motion } from "framer-motion";
import { type LucideIcon, Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  /** Card wrapper or plain inline */
  variant?: "card" | "inline";
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title = "Nothing here yet",
  description,
  action,
  variant = "inline",
  className,
}: EmptyStateProps) {
  const content = (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={cn("flex flex-col items-center justify-center gap-3 py-12 px-6 text-center")}
    >
      <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-muted/60 text-muted-foreground">
        <Icon className="w-5 h-5" strokeWidth={1.5} />
      </div>
      {title && (
        <p className="text-sm font-semibold text-foreground leading-tight">{title}</p>
      )}
      {description && (
        <p className="text-xs text-muted-foreground max-w-xs leading-relaxed">{description}</p>
      )}
      {action && <div className="mt-1">{action}</div>}
    </motion.div>
  );

  if (variant === "card") {
    return (
      <div
        className={cn(
          "relative rounded-2xl border border-dashed border-border/60 bg-card overflow-hidden",
          className
        )}
      >
        {content}
      </div>
    );
  }

  return <div className={className}>{content}</div>;
}
