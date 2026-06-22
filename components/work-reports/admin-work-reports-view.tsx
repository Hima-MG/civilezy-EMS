"use client";

import { useCallback, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Clock, FileText, Users, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { AdminWorkReportTable } from "./work-report-table";
import { CATEGORY_LABELS } from "./constants";
import { cn } from "@/lib/utils";
import type { EmployeeCategory, UserProfile, WorkReportWithProfile } from "@/types";
import type { PaginationMeta, WorkReportAggregates } from "@/lib/queries/work-reports";

interface Filters {
  employee: string;
  category: string;
  status: string;
  approval: string;
  date: string;
}

interface AdminWorkReportsViewProps {
  reports: WorkReportWithProfile[];
  employees: Pick<UserProfile, "id" | "full_name" | "email" | "employee_category">[];
  pagination: PaginationMeta;
  aggregates: WorkReportAggregates;
  filters: Filters;
}

// Filtering and pagination are server-driven via URL params — the page
// component re-queries Supabase with .range()/.eq() rather than fetching
// the whole work_reports table and filtering it in the browser.
export function AdminWorkReportsView({ reports, employees, pagination, aggregates, filters }: AdminWorkReportsViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const navigate = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "all" || value === "") params.delete(key);
        else params.set(key, value);
      }
      startTransition(() => router.push(`${pathname}?${params.toString()}`));
    },
    [router, pathname, searchParams]
  );

  const hasFilters = filters.employee !== "all" || filters.category !== "all"
    || filters.date !== "" || filters.status !== "all" || filters.approval !== "all";

  const METRICS = [
    { icon: Clock,    label: "Total hours",         value: `${aggregates.totalHours.toFixed(1)}h`, color: "text-primary" },
    { icon: FileText, label: "Reports matching",     value: String(pagination.total),                color: "text-blue-500" },
    { icon: Users,    label: "Employees reporting",  value: String(aggregates.uniqueEmployees),       color: "text-violet-500" },
  ];

  return (
    <div className="space-y-5">

      {/* Metric strip */}
      <div className="relative rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
        {isPending && (
          <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px] z-10 flex items-center justify-center">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        )}
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
        <Select value={filters.employee} onValueChange={(v) => navigate({ employee: v, page: null })}>
          <SelectTrigger className="h-9 w-44 bg-muted/40 border-border/60 rounded-xl focus:ring-0 text-sm">
            <SelectValue placeholder="All employees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All employees</SelectItem>
            {employees.map((e) => (
              <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.category} onValueChange={(v) => navigate({ category: v, page: null })}>
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

        <Select value={filters.status} onValueChange={(v) => navigate({ status: v, page: null })}>
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

        <Select value={filters.approval} onValueChange={(v) => navigate({ approval: v, page: null })}>
          <SelectTrigger className="h-9 w-40 bg-muted/40 border-border/60 rounded-xl focus:ring-0 text-sm">
            <SelectValue placeholder="All reviews" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All reviews</SelectItem>
            <SelectItem value="pending">Awaiting Review</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>

        <Input
          type="date"
          className={cn(
            "h-9 w-36 bg-muted/40 border-border/60 rounded-xl focus-visible:ring-0 focus-visible:border-border text-sm",
            filters.date && "border-primary/40"
          )}
          value={filters.date}
          onChange={(e) => navigate({ date: e.target.value, page: null })}
        />

        {hasFilters && (
          <>
            <button
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1"
              onClick={() => navigate({ employee: null, category: null, date: null, status: null, approval: null, page: null })}
            >
              Clear filters
            </button>
            <p className="text-xs text-muted-foreground">
              {pagination.total} matching
            </p>
          </>
        )}
      </div>

      <AdminWorkReportTable reports={reports} pagination={pagination} onPageChange={(p) => navigate({ page: p > 1 ? String(p) : null })} isPending={isPending} />
    </div>
  );
}
