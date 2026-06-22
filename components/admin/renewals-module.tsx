"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Phone, MessageCircle, Loader2, AlertTriangle, CalendarClock,
  Plus, ChevronDown,
} from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StatusBadge, EmptyState, KpiCard } from "@/components/ds";
import type { StatusVariant } from "@/components/ds";
import { cn, formatDate, formatCurrency } from "@/lib/utils";
import { createRenewalQueueEntryAction, updateRenewalQueueStatusAction } from "@/actions/admin/renewals";
import type { RenewalQueueEntryWithStudent, RenewalQueueStatus, StudentWithMembership } from "@/types";

const STATUS_FLOW: { value: RenewalQueueStatus; label: string; variant: StatusVariant }[] = [
  { value: "pending_payment",      label: "Pending Payment",       variant: "pending" },
  { value: "payment_received",     label: "Payment Received",      variant: "info" },
  { value: "verification_pending", label: "Verification Pending",  variant: "violet" },
  { value: "ready_for_renewal",    label: "Ready For Renewal",     variant: "violet" },
  { value: "renewed",              label: "Renewed",               variant: "success" },
  { value: "follow_up_required",   label: "Follow-up Required",    variant: "danger" },
];

const STATUS_META = Object.fromEntries(STATUS_FLOW.map((s) => [s.value, s])) as Record<
  RenewalQueueStatus, { value: RenewalQueueStatus; label: string; variant: StatusVariant }
>;

function daysUntil(dateStr: string | null): number | null {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function waLink(phone: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

interface BucketKey {
  key: "30" | "15" | "7" | "expired";
  label: string;
  variant: StatusVariant;
}

const BUCKETS: BucketKey[] = [
  { key: "30",      label: "Expiring in 30 Days", variant: "info" },
  { key: "15",      label: "Expiring in 15 Days", variant: "pending" },
  { key: "7",       label: "Expiring in 7 Days",  variant: "danger" },
  { key: "expired", label: "Expired",             variant: "danger" },
];

function bucketFor(days: number | null): BucketKey["key"] | null {
  if (days == null) return null;
  if (days < 0) return "expired";
  if (days <= 7) return "7";
  if (days <= 15) return "15";
  if (days <= 30) return "30";
  return null;
}

interface RenewalsModuleProps {
  students: StudentWithMembership[];
  renewalQueue: RenewalQueueEntryWithStudent[];
}

export function RenewalsModule({ students, renewalQueue }: RenewalsModuleProps) {
  const [activeBucket, setActiveBucket] = useState<BucketKey["key"]>("7");
  const [statusFilter, setStatusFilter] = useState<RenewalQueueStatus | "all">("all");
  const [addingId, setAddingId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const bucketed = useMemo(() => {
    const result: Record<BucketKey["key"], StudentWithMembership[]> = { "30": [], "15": [], "7": [], expired: [] };
    for (const s of students) {
      if (!s.expiry_date) continue;
      const key = bucketFor(daysUntil(s.expiry_date));
      if (key) result[key].push(s);
    }
    for (const key of Object.keys(result) as BucketKey["key"][]) {
      result[key].sort((a, b) => new Date(a.expiry_date!).getTime() - new Date(b.expiry_date!).getTime());
    }
    return result;
  }, [students]);

  const filteredQueue = useMemo(
    () => statusFilter === "all" ? renewalQueue : renewalQueue.filter((r) => r.status === statusFilter),
    [renewalQueue, statusFilter]
  );

  async function handleAddToQueue(s: StudentWithMembership) {
    setAddingId(s.id);
    const result = await createRenewalQueueEntryAction({
      student_id: s.id,
      membership_id: null, // current_memberships doesn't expose a stable id here; HR fills it in via notes if needed
      product_name: s.product_name,
      amount: s.price,
      due_date: s.expiry_date,
    });
    setAddingId(null);
    if (result.success) {
      toast.success("Added to renewal queue.");
      startTransition(() => window.location.reload());
    } else {
      toast.error(result.error);
    }
  }

  async function handleStatusChange(id: string, status: RenewalQueueStatus) {
    setUpdatingId(id);
    const result = await updateRenewalQueueStatusAction({ id, status });
    setUpdatingId(null);
    if (result.success) {
      toast.success(`Marked ${STATUS_META[status].label}.`);
      startTransition(() => window.location.reload());
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-6">

      {/* ── Expiry buckets ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {BUCKETS.map((b) => (
          <button key={b.key} onClick={() => setActiveBucket(b.key)} className="text-left">
            <KpiCard
              title={b.label}
              value={bucketed[b.key].length}
              icon={b.key === "expired" ? AlertTriangle : CalendarClock}
              accent={b.key === "expired" || b.key === "7" ? "red" : b.key === "15" ? "yellow" : "blue"}
              className={cn(activeBucket === b.key && "ring-1 ring-primary/40 border-primary/40")}
            />
          </button>
        ))}
      </div>

      <div className="relative rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none" />
        <div className="px-5 pt-4 pb-1 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {BUCKETS.find((b) => b.key === activeBucket)?.label}
          </p>
          <span className="text-xs text-muted-foreground">{bucketed[activeBucket].length} memberships</span>
        </div>
        {bucketed[activeBucket].length === 0 ? (
          <EmptyState icon={CalendarClock} title="Nothing in this bucket" variant="inline" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40">
                  {["Student", "Product", "Expiry", "Price", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted/20 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bucketed[activeBucket].map((s) => {
                  const wa = waLink(s.phone_number);
                  const alreadyQueued = renewalQueue.some(
                    (r) => r.student_id === s.id && r.status !== "renewed"
                  );
                  return (
                    <tr key={s.id} className="border-b border-border/30 last:border-0 hover:bg-accent/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{s.full_name || s.email}</p>
                        <p className="text-xs text-muted-foreground">{s.email}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{s.product_name ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{formatDate(s.expiry_date!)}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs tabular-nums">{s.price != null ? formatCurrency(s.price) : "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {s.phone_number && (
                            <a aria-label="Call" title="Call" href={`tel:${s.phone_number}`} className="flex items-center justify-center w-7 h-7 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors">
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {wa && (
                            <a aria-label="WhatsApp" title="WhatsApp" href={wa} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center w-7 h-7 rounded-lg border border-border/60 text-emerald-500 hover:bg-emerald-500/10 transition-colors">
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            disabled={addingId === s.id || alreadyQueued}
                            onClick={() => handleAddToQueue(s)}
                            className="inline-flex items-center gap-1 h-7 px-2.5 rounded-lg border border-border/60 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/40 disabled:opacity-50 transition-colors"
                          >
                            {addingId === s.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                            {alreadyQueued ? "In Queue" : "Add to Queue"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Renewal queue ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Renewal Queue</p>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as RenewalQueueStatus | "all")}>
            <SelectTrigger className="h-9 w-52 bg-muted/40 border-border/60 rounded-xl focus:ring-0 text-sm">
              <SelectValue placeholder="All stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {STATUS_FLOW.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="relative rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none" />
          {filteredQueue.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title="Queue is empty"
              description="Use “Add to Queue” above once a student has sent a Razorpay/UPI payment screenshot over WhatsApp."
              variant="inline"
            />
          ) : (
            <div className="divide-y divide-border/30">
              {filteredQueue.map((entry) => {
                const meta = STATUS_META[entry.status];
                const wa = waLink(entry.student_phone);
                const isOpen = expandedId === entry.id;
                return (
                  <div key={entry.id}>
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-accent/20 transition-colors"
                      onClick={() => setExpandedId(isOpen ? null : entry.id)}
                    >
                      <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground shrink-0 transition-transform", isOpen && "rotate-180")} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{entry.student_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{entry.product_name ?? "—"} {entry.amount != null ? `· ${formatCurrency(entry.amount)}` : ""}</p>
                      </div>
                      <StatusBadge status={meta.variant} label={meta.label} size="sm" dot />
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 pl-10 space-y-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          {entry.student_phone && (
                            <a href={`tel:${entry.student_phone}`} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border/60 text-xs text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors">
                              <Phone className="w-3.5 h-3.5" /> Call
                            </a>
                          )}
                          {wa && (
                            <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border/60 text-xs text-emerald-500 hover:bg-emerald-500/10 transition-colors">
                              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                            </a>
                          )}
                          {entry.due_date && (
                            <span className="text-xs text-muted-foreground">Due {formatDate(entry.due_date)}</span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-muted-foreground">Move to:</span>
                          {STATUS_FLOW.filter((s) => s.value !== entry.status).map((s) => (
                            <button
                              key={s.value}
                              disabled={updatingId === entry.id}
                              onClick={() => handleStatusChange(entry.id, s.value)}
                              className="text-xs rounded-full border border-border/60 px-2.5 py-1 text-muted-foreground hover:text-foreground hover:bg-accent/40 disabled:opacity-50 transition-colors"
                            >
                              {updatingId === entry.id ? <Loader2 className="w-3 h-3 animate-spin inline" /> : s.label}
                            </button>
                          ))}
                        </div>

                        {entry.notes && (
                          <p className="text-xs text-muted-foreground border-l-2 border-border/60 pl-2.5">{entry.notes}</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
