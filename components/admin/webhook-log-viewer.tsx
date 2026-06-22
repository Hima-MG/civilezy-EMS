"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, ChevronLeft, ChevronRight, Copy, Webhook, Loader2, RotateCw, Download } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { StatusBadge, EmptyState } from "@/components/ds";
import { cn } from "@/lib/utils";
import {
  retryEzyCourseWebhookAction,
  retryAllFailedEzyCourseWebhooksAction,
  exportCoursePurchasesAction,
  exportMembershipRenewalsAction,
} from "@/actions/admin/ezycourse";
import type { WebhookLog } from "@/types";
import type { StatusVariant } from "@/components/ds";

const RETRYABLE_EVENT_TYPES = new Set(["course-purchase", "renew-order"]);

function downloadCSV(rows: (string | number)[][], filename: string) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

interface PaginationMeta {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
}

interface WebhookLogViewerProps {
  logs: WebhookLog[];
  eventTypes: string[];
  pagination: PaginationMeta;
  eventFilter: string | null;
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const EVENT_TYPE_VARIANT: Record<string, StatusVariant> = {
  "course-purchase": "info",
  "renew-order": "violet",
  "student-registration": "success",
  "payment-success": "success",
  "payment-failed": "danger",
  "refund": "danger",
  "membership-expired": "pending",
};

function titleCase(s: string) {
  return s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function eventTypeMeta(eventType: string | null): { label: string; variant: StatusVariant } {
  if (!eventType || eventType === "unknown") {
    return { label: "Unknown", variant: "neutral" };
  }
  if (eventType.startsWith("unknown:")) {
    return { label: `Unknown (${eventType.slice("unknown:".length)})`, variant: "neutral" };
  }
  return { label: EVENT_TYPE_VARIANT[eventType] ? titleCase(eventType) : eventType, variant: EVENT_TYPE_VARIANT[eventType] ?? "neutral" };
}

function filterOptionLabel(value: string) {
  return value === "unknown" ? "Unknown" : titleCase(value);
}

export function WebhookLogViewer({ logs, eventTypes, pagination, eventFilter }: WebhookLogViewerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [retryingAll, setRetryingAll] = useState(false);
  const [exporting, setExporting] = useState<"purchases" | "renewals" | null>(null);

  const navigate = useCallback((updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "all") params.delete(key);
      else params.set(key, value);
    }
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }, [router, pathname, searchParams]);

  function copyJson(payload: unknown) {
    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
  }

  async function handleRetry(logId: string) {
    setRetryingId(logId);
    const result = await retryEzyCourseWebhookAction(logId);
    setRetryingId(null);
    if (result.success) {
      toast.success("Retried — refreshing.");
      startTransition(() => router.refresh());
    } else {
      toast.error(result.error);
    }
  }

  async function handleRetryAll() {
    setRetryingAll(true);
    const result = await retryAllFailedEzyCourseWebhooksAction();
    setRetryingAll(false);
    if (result.success) {
      toast.success(`Retried ${result.data.attempted} log${result.data.attempted !== 1 ? "s" : ""}.`);
      startTransition(() => router.refresh());
    } else {
      toast.error(result.error);
    }
  }

  async function handleExportPurchases() {
    setExporting("purchases");
    const result = await exportCoursePurchasesAction();
    setExporting(null);
    if (!result.success) { toast.error(result.error); return; }
    const header = ["Order ID", "Student", "Email", "Product", "Price", "Gateway", "Coupon", "Purchased At"];
    const rows = result.data.map((p) => [
      p.ezycourse_order_id, p.student_name, p.student_email, p.product_name,
      p.price, p.gateway ?? "", p.coupon_code ?? "", p.created_at,
    ]);
    downloadCSV([header, ...rows], `course_purchases_${new Date().toISOString().slice(0, 10)}.csv`);
  }

  async function handleExportRenewals() {
    setExporting("renewals");
    const result = await exportMembershipRenewalsAction();
    setExporting(null);
    if (!result.success) { toast.error(result.error); return; }
    const header = ["Membership ID", "Student", "Email", "Product", "Type", "Status", "Change Type", "Price", "Expiry", "Renewed At"];
    const rows = result.data.map((r) => [
      r.membership_id, r.student_name, r.student_email, r.product_name ?? "",
      r.membership_type ?? "", r.membership_status ?? "", r.change_type ?? "",
      r.price ?? "", r.expiry_date ?? "", r.created_at,
    ]);
    downloadCSV([header, ...rows], `membership_renewals_${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div className="space-y-5">

      <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
        <p className="text-sm text-muted-foreground leading-relaxed">
          This page shows every raw payload EzyCourse has sent to the webhook endpoint, unmodified.
          Send a test event from EzyCourse&apos;s dashboard, then expand a row below to see its real shape —
          that shape is what the next integration phase (typed tables + processing) gets built against.
        </p>
        <p className="text-xs text-muted-foreground/70 mt-2 font-mono">
          Endpoint: POST /api/webhooks/ezycourse/&lt;secret&gt;/&lt;event-type&gt;
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Select value={eventFilter ?? "all"} onValueChange={(v) => navigate({ event: v, page: null })}>
            <SelectTrigger className="h-9 w-52 bg-muted/40 border-border/60 rounded-xl focus:ring-0 text-sm">
              <SelectValue placeholder="All event types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All event types</SelectItem>
              {eventTypes.map((t) => (
                <SelectItem key={t} value={t}>{filterOptionLabel(t)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">{pagination.total} captured</p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5 rounded-xl border-border/60" disabled={retryingAll} onClick={handleRetryAll}>
            {retryingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />}
            Retry Failed
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 rounded-xl border-border/60" disabled={exporting === "purchases"} onClick={handleExportPurchases}>
            {exporting === "purchases" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Export Purchases
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 rounded-xl border-border/60" disabled={exporting === "renewals"} onClick={handleExportRenewals}>
            {exporting === "renewals" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Export Renewals
          </Button>
        </div>
      </div>

      <div className="relative rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
        {isPending && (
          <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px] z-20 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {logs.length === 0 ? (
          <EmptyState
            icon={Webhook}
            title="No webhooks received yet"
            description="Configure the Data Out webhook in EzyCourse's dashboard and send a test event."
            variant="inline"
          />
        ) : (
          <div className="divide-y divide-border/30">
            {logs.map((log) => {
              const isOpen = expandedId === log.id;
              const { label: eventLabel, variant: eventVariant } = eventTypeMeta(log.event_type);
              return (
                <div key={log.id}>
                  <div className="w-full flex items-center gap-3 px-4 py-3 hover:bg-accent/20 transition-colors">
                    <button
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      onClick={() => setExpandedId(isOpen ? null : log.id)}
                    >
                      <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform", isOpen && "rotate-180")} />
                      <StatusBadge status={eventVariant} label={eventLabel} size="sm" dot />
                      <span className="text-xs text-muted-foreground flex-1">{fmtDateTime(log.created_at)}</span>
                    </button>
                    {log.retry_count > 0 && (
                      <span className="text-[11px] text-muted-foreground shrink-0">{log.retry_count}x retried</span>
                    )}
                    <StatusBadge
                      status={log.processing_status === "processed" ? "success" : log.processing_status === "failed" ? "danger" : "pending"}
                      label={log.processing_status === "processed" ? "Processed" : log.processing_status === "failed" ? "Failed" : "Unprocessed"}
                      size="sm"
                      dot
                    />
                    {RETRYABLE_EVENT_TYPES.has(log.event_type ?? "") && log.processing_status !== "processed" && (
                      <button
                        aria-label="Retry processing"
                        title="Retry processing"
                        className="flex items-center justify-center w-7 h-7 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors shrink-0"
                        onClick={() => handleRetry(log.id)}
                        disabled={retryingId === log.id}
                      >
                        {retryingId === log.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                  {log.last_error && log.processing_status !== "processed" && (
                    <p className="px-4 pb-2 text-xs text-red-500/90 -mt-1">{log.last_error}</p>
                  )}
                  {isOpen && (
                    <div className="px-4 pb-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Payload</p>
                        <button
                          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => copyJson(log.payload)}
                        >
                          <Copy className="w-3 h-3" /> Copy JSON
                        </button>
                      </div>
                      <pre className="text-xs bg-muted/30 rounded-xl p-3 overflow-x-auto max-h-80 font-mono">
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
                      <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Headers</p>
                      <pre className="text-xs bg-muted/30 rounded-xl p-3 overflow-x-auto max-h-40 font-mono">
                        {JSON.stringify(log.headers, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-3 border-t border-border/40 bg-muted/10">
          <p className="text-xs text-muted-foreground">{pagination.total} log{pagination.total !== 1 ? "s" : ""}</p>
          {pagination.totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                aria-label="Previous page"
                className="flex items-center justify-center w-7 h-7 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                disabled={pagination.page === 1 || isPending}
                onClick={() => navigate({ page: pagination.page - 1 > 1 ? String(pagination.page - 1) : null })}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs text-muted-foreground px-1">{pagination.page} / {pagination.totalPages}</span>
              <button
                aria-label="Next page"
                className="flex items-center justify-center w-7 h-7 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                disabled={pagination.page === pagination.totalPages || isPending}
                onClick={() => navigate({ page: String(pagination.page + 1) })}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
