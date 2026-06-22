"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronDown, ChevronLeft, ChevronRight, Copy, Webhook, Loader2 } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StatusBadge, EmptyState } from "@/components/ds";
import { cn } from "@/lib/utils";
import type { WebhookLog } from "@/types";

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

export function WebhookLogViewer({ logs, eventTypes, pagination, eventFilter }: WebhookLogViewerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  return (
    <div className="space-y-5">

      <div className="rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
        <p className="text-sm text-muted-foreground leading-relaxed">
          This page shows every raw payload EzyCourse has sent to the webhook endpoint, unmodified.
          Send a test event from EzyCourse&apos;s dashboard, then expand a row below to see its real shape —
          that shape is what the next integration phase (typed tables + processing) gets built against.
        </p>
        <p className="text-xs text-muted-foreground/70 mt-2 font-mono">
          Endpoint: POST /api/webhooks/ezycourse/&lt;EZYCOURSE_WEBHOOK_SECRET&gt;
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Select value={eventFilter ?? "all"} onValueChange={(v) => navigate({ event: v, page: null })}>
          <SelectTrigger className="h-9 w-52 bg-muted/40 border-border/60 rounded-xl focus:ring-0 text-sm">
            <SelectValue placeholder="All event types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All event types</SelectItem>
            {eventTypes.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">{pagination.total} captured</p>
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
              return (
                <div key={log.id}>
                  <button
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/20 transition-colors"
                    onClick={() => setExpandedId(isOpen ? null : log.id)}
                  >
                    <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform", isOpen && "rotate-180")} />
                    <span className="text-sm font-medium text-foreground min-w-[180px]">
                      {log.event_type ?? <span className="text-muted-foreground italic">unknown event type</span>}
                    </span>
                    <span className="text-xs text-muted-foreground flex-1">{fmtDateTime(log.created_at)}</span>
                    <StatusBadge
                      status={log.processed ? "success" : "pending"}
                      label={log.processed ? "Processed" : "Unprocessed"}
                      size="sm"
                      dot
                    />
                  </button>
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
