"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { updateLeaveStatusAction } from "@/actions/hr/leaves";
import type { LeaveWithProfile, LeaveStatus, UserProfile } from "@/types";

const STATUS_BADGE: Record<LeaveStatus, { label: string; className: string }> = {
  pending:  { label: "Pending",  className: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400" },
  approved: { label: "Approved", className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400" },
  rejected: { label: "Rejected", className: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400" },
};

const LEAVE_TYPE_LABEL: Record<string, string> = {
  casual: "Casual", sick: "Sick", earned: "Earned",
  maternity: "Maternity", paternity: "Paternity", other: "Other",
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function daysBetween(from: string, to: string) {
  const diff = new Date(to).getTime() - new Date(from).getTime();
  return Math.max(1, Math.round(diff / 86400000) + 1);
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
  const [statusFilter, setStatusFilter] = useState<LeaveStatus | "all">("all");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return leaves.filter((l) => {
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (employeeFilter !== "all" && l.user_id !== employeeFilter) return false;
      return true;
    });
  }, [leaves, statusFilter, employeeFilter]);

  async function handleStatusChange(id: string, status: "approved" | "rejected") {
    setLoadingId(id);
    const result = await updateLeaveStatusAction(id, status);
    setLoadingId(null);

    if (result.success) {
      toast.success(`Leave ${status === "approved" ? "approved" : "rejected"}.`);
      router.refresh();
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
          <SelectTrigger className="w-40 h-9 shrink-0">
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
          <SelectTrigger className="w-48 h-9 shrink-0">
            <SelectValue placeholder="All Employees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {profiles.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.full_name || p.email}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="sm:ml-auto">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Count summary */}
      <div className="flex items-center gap-5 text-sm text-muted-foreground">
        <span>{filtered.length} request{filtered.length !== 1 ? "s" : ""}</span>
        <span>Pending: <span className="font-medium text-foreground">{filtered.filter((l) => l.status === "pending").length}</span></span>
        <span>Approved: <span className="font-medium text-foreground">{filtered.filter((l) => l.status === "approved").length}</span></span>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
              <p className="text-sm font-medium">No leave requests found</p>
              <p className="text-xs text-muted-foreground">Try adjusting your filters.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="hidden sm:table-cell">Period</TableHead>
                  <TableHead className="hidden md:table-cell">Days</TableHead>
                  <TableHead className="hidden lg:table-cell">Reason</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((leave) => {
                  const b = STATUS_BADGE[leave.status];
                  const days = daysBetween(leave.from_date, leave.to_date);
                  const isLoading = loadingId === leave.id;

                  return (
                    <TableRow key={leave.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{leave.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{leave.email}</p>
                      </TableCell>
                      <TableCell className="text-sm">
                        {LEAVE_TYPE_LABEL[leave.leave_type] ?? leave.leave_type}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {fmtDate(leave.from_date)} → {fmtDate(leave.to_date)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {days}d
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm max-w-[200px] truncate text-muted-foreground">
                        {leave.reason}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${b.className}`}>
                          {b.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {leave.status === "pending" && (
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                              disabled={isLoading}
                              onClick={() => handleStatusChange(leave.id, "approved")}
                              title="Approve"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              disabled={isLoading}
                              onClick={() => handleStatusChange(leave.id, "rejected")}
                              title="Reject"
                            >
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
