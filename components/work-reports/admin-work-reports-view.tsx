"use client";

import { useMemo, useState } from "react";
import { Clock, FileText, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AdminWorkReportTable } from "./work-report-table";
import { CATEGORY_LABELS } from "./constants";
import { cn } from "@/lib/utils";
import type { EmployeeCategory, UserProfile, WorkReportWithProfile } from "@/types";

interface AdminWorkReportsViewProps {
  reports: WorkReportWithProfile[];
  employees: Pick<UserProfile, "id" | "full_name" | "email" | "employee_category">[];
}

export function AdminWorkReportsView({ reports, employees }: AdminWorkReportsViewProps) {
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [dateFilter,     setDateFilter]     = useState("");
  const [statusFilter,   setStatusFilter]   = useState("all");

  const filtered = useMemo(() => reports.filter((r) => {
    if (employeeFilter !== "all" && r.user_id !== employeeFilter) return false;
    if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (dateFilter && r.report_date !== dateFilter) return false;
    return true;
  }), [reports, employeeFilter, categoryFilter, statusFilter, dateFilter]);

  const totalHours      = useMemo(() => filtered.reduce((s, r) => s + r.hours_spent, 0), [filtered]);
  const uniqueEmployees = useMemo(() => {
    const seen = new Set<string>();
    return reports.filter((r) => { if (seen.has(r.user_id)) return false; seen.add(r.user_id); return true; })
      .map((r) => ({ id: r.user_id, full_name: r.full_name }));
  }, [reports]);

  const hasFilters = employeeFilter !== "all" || categoryFilter !== "all" || dateFilter !== "" || statusFilter !== "all";

  const METRICS = [
    { icon: Clock,      label: "Total hours",          value: `${totalHours.toFixed(1)}h`,       color: "text-primary" },
    { icon: FileText,   label: "Reports shown",        value: String(filtered.length),            color: "text-blue-500" },
    { icon: Users,      label: "Employees reporting",  value: String(uniqueEmployees.length),     color: "text-violet-500" },
  ];

  return (
    <div className="space-y-5">

      {/* Metric strip */}
      <div className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <div className="flex divide-x divide-border/40">
          {METRICS.map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="flex-1 flex items-center gap-3 px-5 py-4">
              <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center shrink-0", `bg-primary/8`)}>
                <Icon className={cn("w-4 h-4", color)} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground tabular-nums leading-none">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
          <SelectTrigger className="h-9 w-44 bg-muted/40 border-border/60 rounded-xl focus:ring-0 text-sm">
            <SelectValue placeholder="All employees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All employees</SelectItem>
            {uniqueEmployees.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="h-9 w-40 bg-muted/40 border-border/60 rounded-xl focus:ring-0 text-sm">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {(Object.keys(CATEGORY_LABELS) as EmployeeCategory[]).map((c) => (
              <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-36 bg-muted/40 border-border/60 rounded-xl focus:ring-0 text-sm">
            <SelectValue placeholder="All status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          className={cn(
            "h-9 w-36 bg-muted/40 border-border/60 rounded-xl focus-visible:ring-0 focus-visible:border-border text-sm",
            dateFilter && "border-primary/40"
          )}
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        />

        {hasFilters && (
          <>
            <button
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
              onClick={() => { setEmployeeFilter("all"); setCategoryFilter("all"); setDateFilter(""); setStatusFilter("all"); }}
            >
              Clear filters
            </button>
            <p className="text-xs text-muted-foreground">
              {filtered.length} of {reports.length} shown
            </p>
          </>
        )}
      </div>

      <AdminWorkReportTable reports={filtered} />
    </div>
  );
}
