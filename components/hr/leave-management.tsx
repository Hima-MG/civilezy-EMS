"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, Download, CalendarOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ds";
import { EmptyState } from "@/components/ds";
import { cn } from "@/lib/utils";
import { updateLeaveStatusAction } from "@/actions/hr/leaves";
import type { LeaveWithProfile, LeaveStatus, UserProfile } from "@/types";
import type { StatusVariant } from "@/components/ds";

const STATUS_MAP: Record<LeaveStatus, { label: string; variant: StatusVariant }> = {
  pending:  { label: "Pending",  variant: "pending" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
};

const LEAVE_TYPE_LABEL: Record<string, string> = {
  casual: "Casual", sick: "Sick", earned: "Earned",
  maternity: "Maternity", paternity: "Paternity", other: "Other",
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function daysBetween(from: string, to: string) {
  return Math.max(1, Math.round((new Date(to).getTime() - new Date(from).getTime()) / 86400000) + 1);
}
function downloadCSV(rows: (string | number)[][], filename: string) {
  const csv = rows.map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

interface LeaveManagementProps {
  leaves: LeaveWithProfile[];
  profiles: UserProfile[];
}

export function LeaveManagement({ leaves, profiles }: LeaveManagementProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [statusFilter,   setStatusFilter]   = useState<LeaveStatus | "all">("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [loadingId,      setLoadingId]      = useState<string | null>(null);

  const filtered = useMemo(() => leaves.filter((l) => {
    if (statusFilter !== "all" && l.status !== statusFilter) return false;
    if (employeeFilter !== "all" && l.user_id !== employeeFilter) return false;
    return true;
  }), [leaves, statusFilter, employeeFilter]);

  async function handleStatusChange(id: string, status: "approved" | "rejected") {
    setLoadingId(id);
    const result = await updateLeaveStatusAction(id, status);
    setLoadingId(null);
    if (result.success) {
      toast.success(`Leave ${status === "approved" ? "approved" : "rejected"}.`);
      startTransition(() => router.refresh());
    } else {
      toast.error(result.error);
    }
  }

  function handleExport() {
    const header = ["Employee", "Email", "Leave Type", "From", "To", "Days", "Reason", "Status"];
    const rows = filtered.map((l) => [
      l.full_name, l.email,
      LEAVE_TYPE_LABEL[l.leave_type] ?? l.leave_type,
      l.from_date, l.to_date,
      daysBetween(l.from_date, l.to_date),
      l.reason, l.status,
    ]);
    downloadCSV([header, ...rows], `leave_report_${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as LeaveStatus | "all")}>
          <SelectTrigger className="w-40 h-9 shrink-0 bg-muted/40 border-border/60 rounded-xl focus:ring-0">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
          <SelectTrigger className="w-48 h-9 shrink-0 bg-muted/40 border-border/60 rounded-xl focus:ring-0">
            <SelectValue placeholder="All Employees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {profiles.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="sm:ml-auto flex items-center gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span><span className="font-medium text-foreground">{filtered.length}</span> request{filtered.length !== 1 ? "s" : ""}</span>
            <span>Pending: <span className="font-medium text-amber-500">{filtered.filter((l) => l.status === "pending").length}</span></span>
            <span>Approved: <span className="font-medium text-emerald-500">{filtered.filter((l) => l.status === "approved").length}</span></span>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 shrink-0 rounded-xl border-border/60" onClick={handleExport}>
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="relative rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none z-10" />

        {filtered.length === 0 ? (
          <EmptyState
            icon={CalendarOff}
            title="No leave requests found"
            description="Try adjusting your filters."
            variant="inline"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40">
                  {[
                    { label: "Employee", cls: "" },
                    { label: "Type",     cls: "" },
                    { label: "Period",   cls: "hidden sm:table-cell" },
                    { label: "Days",     cls: "hidden md:table-cell" },
                    { label: "Reason",   cls: "hidden lg:table-cell" },
                    { label: "Status",   cls: "" },
                    { label: "Actions",  cls: "text-right" },
                  ].map(({ label, cls }) => (
                    <th key={label} className={cn(
                      "px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted/20 text-left",
                      cls
                    )}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((leave) => {
                  const sm = STATUS_MAP[leave.status];
                  const days = daysBetween(leave.from_date, leave.to_date);
                  const isLoading = loadingId === leave.id;

                  return (
                    <tr key={leave.id} className="border-b border-border/30 last:border-0 hover:bg-accent/20 transition-colors duration-100">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{leave.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{leave.email}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {LEAVE_TYPE_LABEL[leave.leave_type] ?? leave.leave_type}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell whitespace-nowrap">
                        {fmtDate(leave.from_date)} → {fmtDate(leave.to_date)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">{days}d</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell max-w-[200px]">
                        <span className="truncate block">{leave.reason}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={sm.variant} label={sm.label} size="sm" dot />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {leave.status === "pending" && (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              className="flex items-center justify-center w-7 h-7 rounded-lg border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              disabled={isLoading}
                              onClick={() => handleStatusChange(leave.id, "approved")}
                              title="Approve"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              className="flex items-center justify-center w-7 h-7 rounded-lg border border-red-500/30 text-red-500 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              disabled={isLoading}
                              onClick={() => handleStatusChange(leave.id, "rejected")}
                              title="Reject"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-border/40 bg-muted/10">
            <p className="text-xs text-muted-foreground">{filtered.length} request{filtered.length !== 1 ? "s" : ""}</p>
          </div>
        )}
      </div>
    </div>
  );
}
