"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// ── Column definition ─────────────────────────────────────────

export interface DataColumn<T> {
  key: keyof T | string;
  label: string;
  /** Tailwind width class, e.g. "w-32" */
  width?: string;
  align?: "left" | "center" | "right";
  render?: (row: T, index: number) => React.ReactNode;
}

// ── DataTable ─────────────────────────────────────────────────

interface DataTableProps<T extends object> {
  columns: DataColumn<T>[];
  rows: T[];
  title?: string;
  description?: string;
  /** Slot for filter controls / action buttons shown in the card header */
  toolbar?: React.ReactNode;
  emptyLabel?: string;
  /** Slot rendered below the table (pagination, totals) */
  footer?: React.ReactNode;
  className?: string;
  /** Row key extractor */
  keyExtractor?: (row: T, index: number) => string | number;
  onRowClick?: (row: T) => void;
}

const ALIGN_CLASS = {
  left:   "text-left",
  center: "text-center",
  right:  "text-right",
};

export function DataTable<T extends object>({
  columns,
  rows,
  title,
  description,
  toolbar,
  emptyLabel = "No data found",
  footer,
  className,
  keyExtractor,
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div
      className={cn(
        "relative rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm",
        className
      )}
    >
      {/* top shimmer */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none z-10" />

      {/* Header */}
      {(title || toolbar) && (
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border/50">
          <div className="min-w-0">
            {title && (
              <p className="text-sm font-semibold text-foreground leading-tight">{title}</p>
            )}
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            )}
          </div>
          {toolbar && (
            <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
              {toolbar}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={cn(
                    "px-5 py-3 text-[11px] font-semibold uppercase tracking-widest",
                    "text-muted-foreground bg-muted/20",
                    ALIGN_CLASS[col.align ?? "left"],
                    col.width
                  )}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-5 py-12 text-center text-sm text-muted-foreground"
                >
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <motion.tr
                  key={keyExtractor ? keyExtractor(row, i) : i}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.15, delay: i * 0.025 }}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "border-b border-border/30 last:border-0",
                    "transition-colors duration-100",
                    onRowClick
                      ? "hover:bg-accent/40 cursor-pointer"
                      : "hover:bg-accent/20"
                  )}
                >
                  {columns.map((col) => {
                    const val = col.render
                      ? col.render(row, i)
                      : (row as Record<string, unknown>)[String(col.key)] as React.ReactNode;

                    return (
                      <td
                        key={String(col.key)}
                        className={cn(
                          "px-5 py-3 text-sm text-foreground",
                          ALIGN_CLASS[col.align ?? "left"],
                          col.width
                        )}
                      >
                        {val}
                      </td>
                    );
                  })}
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      {footer && (
        <div className="px-5 py-3 border-t border-border/40 bg-muted/10">{footer}</div>
      )}
    </div>
  );
}
