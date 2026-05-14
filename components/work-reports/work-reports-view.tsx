"use client";

import { useMemo, useState } from "react";
import { Clock, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { WorkReportForm } from "./work-report-form";
import { WorkReportTable } from "./work-report-table";
import { cn } from "@/lib/utils";
import type { EmployeeCategory, WorkReport } from "@/types";

interface WorkReportsViewProps {
  reports: WorkReport[];
  employeeCategory: EmployeeCategory | null;
}

export function WorkReportsView({ reports, employeeCategory }: WorkReportsViewProps) {
  const [dateFilter,   setDateFilter]   = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => reports.filter((r) => {
    if (dateFilter && r.report_date !== dateFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    return true;
  }), [reports, dateFilter, statusFilter]);

  const totalHours = useMemo(() => filtered.reduce((s, r) => s + r.hours_spent, 0), [filtered]);

  const hasFilters = dateFilter !== "" || statusFilter !== "all";

  return (
    <div className="space-y-4">

      {/* Metric strip + action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">

          {/* Hours metric */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground tabular-nums leading-none">{totalHours.toFixed(1)}h</p>
              <p className="text-[10px] text-muted-foreground">Total hours</p>
            </div>
          </div>

          {/* Reports metric */}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <FileText className="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground tabular-nums leading-none">{filtered.length}</p>
              <p className="text-[10px] text-muted-foreground">Report{filtered.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </div>

        <WorkReportForm employeeCategory={employeeCategory} />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[140px] max-w-[180px]">
          <Input
            type="date"
            className={cn(
              "h-9 bg-muted/40 border-border/60 rounded-xl focus-visible:ring-0 focus-visible:border-border text-sm",
              dateFilter && "border-primary/40"
            )}
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-36 bg-muted/40 border-border/60 rounded-xl focus:ring-0 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        {hasFilters && (
          <button
            className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
            onClick={() => { setDateFilter(""); setStatusFilter("all"); }}
          >
            Clear
          </button>
        )}

        {hasFilters && (
          <p className="text-xs text-muted-foreground ml-1">
            {filtered.length} of {reports.length} shown
          </p>
        )}
      </div>

      <WorkReportTable reports={filtered} showDelete />
    </div>
  );
}
