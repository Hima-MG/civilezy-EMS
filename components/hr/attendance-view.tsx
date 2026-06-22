"use client";

import { useState, useEffect, useTransition, useCallback, useRef } from "react";
import { Download, Search, Calendar, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ds";
import { EmptyState } from "@/components/ds";
import { cn } from "@/lib/utils";
import { getAttendancePageAction, exportAttendanceAction, type AttendancePageResult } from "@/actions/hr/attendance";
import type { UserProfile } from "@/types";
import type { StatusVariant } from "@/components/ds";

function fmtMonthLabel(m: string) {
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
}

const STATUS_MAP: Record<string, { label: string; variant: StatusVariant }> = {
  present:  { label: "Present",  variant: "success" },
  absent:   { label: "Absent",   variant: "danger" },
  half_day: { label: "Half Day", variant: "pending" },
  late:     { label: "Late",     variant: "violet" },
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
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

interface AttendanceViewProps {
  initialData: AttendancePageResult;
  profiles: UserProfile[];
}

// Attendance scales unboundedly with org age (every employee × every day),
// so this view fetches a page at a time from the server instead of holding
// the full multi-month dataset in the browser.
export function AttendanceView({ initialData, profiles }: AttendanceViewProps) {
  const currentMonth = new Date().toISOString().slice(0, 7);

  const [data, setData] = useState<AttendancePageResult>(initialData);
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [monthFilter,    setMonthFilter]    = useState(currentMonth);
  const [dateFrom,       setDateFrom]       = useState("");
  const [dateTo,         setDateTo]         = useState("");
  const [search,         setSearch]         = useState("");
  const [page,           setPage]           = useState(1);
  const [isPending, startTransition] = useTransition();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchPage = useCallback((nextPage: number, overrides: Partial<{
    employeeFilter: string; monthFilter: string; dateFrom: string; dateTo: string; search: string;
  }> = {}) => {
    const f = {
      employeeId: (overrides.employeeFilter ?? employeeFilter) === "all" ? undefined : (overrides.employeeFilter ?? employeeFilter),
      month: overrides.monthFilter ?? monthFilter,
      dateFrom: overrides.dateFrom ?? dateFrom,
      dateTo: overrides.dateTo ?? dateTo,
      search: overrides.search ?? search,
      page: nextPage,
    };
    startTransition(async () => {
      const result = await getAttendancePageAction(f);
      if (result.success) {
        setData(result.data);
        setPage(nextPage);
      }
    });
  }, [employeeFilter, monthFilter, dateFrom, dateTo, search]);

  function onEmployeeChange(v: string) { setEmployeeFilter(v); fetchPage(1, { employeeFilter: v }); }
  function onMonthChange(v: string) { setMonthFilter(v); fetchPage(1, { monthFilter: v }); }
  function onDateFromChange(v: string) { setDateFrom(v); fetchPage(1, { dateFrom: v }); }
  function onDateToChange(v: string) { setDateTo(v); fetchPage(1, { dateTo: v }); }

  function onSearchChange(v: string) {
    setSearch(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPage(1, { search: v }), 350);
  }

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  async function handleExport() {
    const result = await exportAttendanceAction({
      employeeId: employeeFilter === "all" ? undefined : employeeFilter,
      month: monthFilter,
      dateFrom, dateTo, search,
    });
    if (!result.success) return;
    const header = ["Employee", "Email", "Date", "Punch In", "Punch Out", "Total Hours", "Status"];
    const rows = result.data.map((a) => [
      a.full_name, a.email, a.attendance_date,
      a.punch_in ? new Date(a.punch_in).toLocaleTimeString("en-IN") : "",
      a.punch_out ? new Date(a.punch_out).toLocaleTimeString("en-IN") : "",
      a.total_hours ?? "", a.status,
    ]);
    downloadCSV([header, ...rows], `attendance_${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        <Select value={monthFilter} onValueChange={onMonthChange}>
          <SelectTrigger className="w-44 h-9 shrink-0 bg-muted/40 border-border/60 rounded-xl focus:ring-0">
            <Calendar className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            <SelectItem value={currentMonth}>{fmtMonthLabel(currentMonth)}</SelectItem>
          </SelectContent>
        </Select>

        <Select value={employeeFilter} onValueChange={onEmployeeChange}>
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

        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search employee…"
            className="pl-8.5 h-9 bg-muted/40 border-border/60 rounded-xl focus-visible:ring-0 focus-visible:border-border text-sm"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Input type="date" className="h-9 w-36 bg-muted/40 border-border/60 rounded-xl text-sm" value={dateFrom} onChange={(e) => onDateFromChange(e.target.value)} />
          <span className="text-xs text-muted-foreground">to</span>
          <Input type="date" className="h-9 w-36 bg-muted/40 border-border/60 rounded-xl text-sm" value={dateTo} onChange={(e) => onDateToChange(e.target.value)} />
        </div>

        <Button variant="outline" size="sm" className="gap-1.5 shrink-0 rounded-xl border-border/60" onClick={handleExport}>
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </div>

      {/* Summary strip */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <span><span className="font-medium text-foreground">{data.total}</span> record{data.total !== 1 ? "s" : ""}</span>
        <span>Total hours: <span className="font-medium text-foreground">{data.totalHours.toFixed(1)}h</span></span>
        <span>Present: <span className="font-medium text-emerald-500">{data.presentCount}</span></span>
        <span>Absent: <span className="font-medium text-red-500">{data.absentCount}</span></span>
      </div>

      {/* Table */}
      <div className="relative rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none z-10" />
        {isPending && (
          <div className="absolute inset-0 bg-background/40 backdrop-blur-[1px] z-20 flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {data.records.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No attendance records found"
            description={
              monthFilter !== "all"
                ? `No records for ${fmtMonthLabel(monthFilter)}. Try a different month or "All Months".`
                : "No records match the current filters."
            }
            variant="inline"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40">
                  {[
                    { label: "Employee",   cls: "" },
                    { label: "Date",       cls: "hidden sm:table-cell" },
                    { label: "Punch In",   cls: "hidden md:table-cell" },
                    { label: "Punch Out",  cls: "hidden md:table-cell" },
                    { label: "Hours",      cls: "hidden lg:table-cell" },
                    { label: "Status",     cls: "" },
                  ].map(({ label, cls }) => (
                    <th key={label} className={cn(
                      "px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted/20 text-left",
                      cls
                    )}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.records.map((a) => {
                  const sm = STATUS_MAP[a.status];
                  return (
                    <tr key={a.id} className="border-b border-border/30 last:border-0 hover:bg-accent/20 transition-colors duration-100">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{a.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{a.email}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell">{fmtDate(a.attendance_date)}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs hidden md:table-cell">{fmtTime(a.punch_in)}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs hidden md:table-cell">{fmtTime(a.punch_out)}</td>
                      <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">
                        {a.total_hours != null ? `${a.total_hours}h` : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {sm ? (
                          <StatusBadge status={sm.variant} label={sm.label} size="sm" dot />
                        ) : (
                          <span className="text-xs text-muted-foreground">{a.status}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-3 border-t border-border/40 bg-muted/10">
          <p className="text-xs text-muted-foreground">{data.total} record{data.total !== 1 ? "s" : ""}</p>
          {data.totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                aria-label="Previous page"
                className="flex items-center justify-center w-7 h-7 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                disabled={page === 1 || isPending}
                onClick={() => fetchPage(page - 1)}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs text-muted-foreground px-1">{page} / {data.totalPages}</span>
              <button
                aria-label="Next page"
                className="flex items-center justify-center w-7 h-7 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                disabled={page === data.totalPages || isPending}
                onClick={() => fetchPage(page + 1)}
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
