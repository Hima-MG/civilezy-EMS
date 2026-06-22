"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2, Loader2, ClipboardList, Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ds";
import { EmptyState } from "@/components/ds";
import { cn } from "@/lib/utils";
import { deleteWorkReportAction } from "@/actions/work-reports";
import { reviewWorkReportAction } from "@/actions/work-reports/review";
import { CATEGORY_LABELS } from "./constants";
import type { WorkReport, WorkReportWithProfile } from "@/types";
import type { StatusVariant } from "@/components/ds";

// Status → DS variant
const STATUS_VARIANT: Record<WorkReport["status"], StatusVariant> = {
  pending:     "pending",
  in_progress: "info",
  completed:   "success",
};
const STATUS_LABEL: Record<WorkReport["status"], string> = {
  pending:     "Pending",
  in_progress: "In Progress",
  completed:   "Completed",
};

// Approval status → DS variant
const APPROVAL_VARIANT: Record<WorkReport["approval_status"], StatusVariant> = {
  pending:  "pending",
  approved: "success",
  rejected: "danger",
};
const APPROVAL_LABEL: Record<WorkReport["approval_status"], string> = {
  pending:  "Awaiting Review",
  approved: "Approved",
  rejected: "Rejected",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// ── Employee table (own reports) ─────────────────────────────────

interface WorkReportTableProps {
  reports: WorkReport[];
  showDelete?: boolean;
}

export function WorkReportTable({ reports, showDelete = true }: WorkReportTableProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    const result = await deleteWorkReportAction(id);
    setDeletingId(null);
    if (result.success) {
      toast.success("Report deleted.");
      startTransition(() => router.refresh());
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="relative rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none z-10" />

      {reports.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No work reports yet"
          description="Submit your first report using the button above."
          variant="inline"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40">
                {[
                  { label: "Date",         cls: "" },
                  { label: "Title",        cls: "" },
                  { label: "Sub-Category", cls: "hidden md:table-cell" },
                  { label: "Hours",        cls: "text-right" },
                  { label: "Status",       cls: "" },
                  { label: "Review",       cls: "" },
                  ...(showDelete ? [{ label: "", cls: "w-10" }] : []),
                ].map(({ label, cls }, i) => (
                  <th key={i} className={cn(
                    "px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted/20 text-left whitespace-nowrap",
                    cls
                  )}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-b border-border/30 last:border-0 hover:bg-accent/20 transition-colors duration-100">
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{formatDate(r.report_date)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground leading-snug">{r.title}</p>
                    {r.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{r.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">{r.sub_category}</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground tabular-nums">{r.hours_spent}h</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={STATUS_VARIANT[r.status]} label={STATUS_LABEL[r.status]} size="sm" dot />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={APPROVAL_VARIANT[r.approval_status]}
                      label={APPROVAL_LABEL[r.approval_status]}
                      size="sm"
                      dot
                    />
                    {r.approval_status === "rejected" && r.review_note && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 max-w-[160px] line-clamp-1" title={r.review_note}>
                        {r.review_note}
                      </p>
                    )}
                  </td>
                  {showDelete && (
                    <td className="px-4 py-3 text-right">
                      <button
                        className="flex items-center justify-center w-7 h-7 rounded-lg border border-border/60 text-muted-foreground hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors ml-auto"
                        onClick={() => handleDelete(r.id)}
                        disabled={deletingId === r.id}
                        title="Delete report"
                        aria-label="Delete report"
                      >
                        {deletingId === r.id
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <Trash2 className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reports.length > 0 && (
        <div className="px-4 py-3 border-t border-border/40 bg-muted/10">
          <p className="text-xs text-muted-foreground">{reports.length} report{reports.length !== 1 ? "s" : ""}</p>
        </div>
      )}
    </div>
  );
}

// ── Admin / HR table (all employees) ─────────────────────────────

interface PaginationMeta {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
}

interface AdminWorkReportTableProps {
  reports: WorkReportWithProfile[];
  pagination?: PaginationMeta;
  onPageChange?: (page: number) => void;
  isPending?: boolean;
}

export function AdminWorkReportTable({ reports, pagination, onPageChange, isPending }: AdminWorkReportTableProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");

  async function handleReview(id: string, status: "approved" | "rejected", note?: string) {
    setReviewingId(id);
    const result = await reviewWorkReportAction({ id, status, note: note || undefined });
    setReviewingId(null);
    setRejectingId(null);
    setNoteText("");
    if (result.success) {
      toast.success(status === "approved" ? "Report approved." : "Report rejected.");
      startTransition(() => router.refresh());
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="relative rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none z-10" />

      {reports.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No work reports found"
          description="Try adjusting your filters."
          variant="inline"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40">
                {[
                  { label: "Date",         cls: "" },
                  { label: "Employee",     cls: "" },
                  { label: "Category",     cls: "hidden lg:table-cell" },
                  { label: "Title",        cls: "" },
                  { label: "Sub-Category", cls: "hidden md:table-cell" },
                  { label: "Hours",        cls: "text-right" },
                  { label: "Status",       cls: "" },
                  { label: "Review",       cls: "" },
                  { label: "",             cls: "w-44" },
                ].map(({ label, cls }, i) => (
                  <th key={i} className={cn(
                    "px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted/20 text-left whitespace-nowrap",
                    cls
                  )}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-b border-border/30 last:border-0 hover:bg-accent/20 transition-colors duration-100">
                  <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{formatDate(r.report_date)}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground leading-snug">{r.full_name}</p>
                    <p className="text-xs text-muted-foreground">{r.email}</p>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">{CATEGORY_LABELS[r.category]}</td>
                  <td className="px-4 py-3 max-w-[200px]">
                    <p className="font-medium text-foreground leading-snug truncate">{r.title}</p>
                    {r.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{r.description}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">{r.sub_category}</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground tabular-nums">{r.hours_spent}h</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={STATUS_VARIANT[r.status]} label={STATUS_LABEL[r.status]} size="sm" dot />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={APPROVAL_VARIANT[r.approval_status]} label={APPROVAL_LABEL[r.approval_status]} size="sm" dot />
                  </td>
                  <td className="px-4 py-3">
                    {rejectingId === r.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          autoFocus
                          aria-label="Rejection reason"
                          placeholder="Reason (optional)"
                          value={noteText}
                          className="h-7 w-32 rounded-lg border border-border/60 bg-muted/40 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/40"
                          onChange={(e) => setNoteText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleReview(r.id, "rejected", noteText);
                            if (e.key === "Escape") { setRejectingId(null); setNoteText(""); }
                          }}
                        />
                        <button
                          aria-label="Confirm rejection"
                          className="flex items-center justify-center w-7 h-7 rounded-lg border border-border/60 text-red-500 hover:bg-red-500/10 disabled:opacity-40 transition-colors"
                          disabled={reviewingId === r.id}
                          onClick={() => handleReview(r.id, "rejected", noteText)}
                        >
                          {reviewingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          aria-label="Cancel rejection"
                          className="flex items-center justify-center w-7 h-7 rounded-lg border border-border/60 text-muted-foreground hover:bg-accent/40 transition-colors"
                          onClick={() => { setRejectingId(null); setNoteText(""); }}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <button
                          aria-label="Approve report"
                          title="Approve"
                          className="flex items-center justify-center w-7 h-7 rounded-lg border border-border/60 text-emerald-500 hover:bg-emerald-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          disabled={reviewingId === r.id}
                          onClick={() => handleReview(r.id, "approved")}
                        >
                          {reviewingId === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          aria-label="Reject report"
                          title="Reject"
                          className="flex items-center justify-center w-7 h-7 rounded-lg border border-border/60 text-red-500 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          disabled={reviewingId === r.id}
                          onClick={() => setRejectingId(r.id)}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(reports.length > 0 || pagination) && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/40 bg-muted/10">
          <p className="text-xs text-muted-foreground">
            {pagination ? pagination.total : reports.length} report{(pagination ? pagination.total : reports.length) !== 1 ? "s" : ""}
          </p>
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                aria-label="Previous page"
                className="flex items-center justify-center w-7 h-7 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                disabled={pagination.page === 1 || isPending}
                onClick={() => onPageChange?.(pagination.page - 1)}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs text-muted-foreground px-1">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                aria-label="Next page"
                className="flex items-center justify-center w-7 h-7 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                disabled={pagination.page === pagination.totalPages || isPending}
                onClick={() => onPageChange?.(pagination.page + 1)}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────

export function WorkReportTableSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
      <div className="border-b border-border/40 bg-muted/20 px-4 py-3 flex gap-6">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} className="h-3 w-16" />
        ))}
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-border/30 last:border-0">
          <Skeleton className="h-3.5 w-20 shrink-0" />
          <Skeleton className="h-3.5 flex-1" />
          <Skeleton className="h-3.5 w-24 hidden md:block" />
          <Skeleton className="h-3.5 w-8 ml-auto" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}
