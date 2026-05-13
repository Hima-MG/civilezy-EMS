"use client";

import { useState, useMemo } from "react";
import { Download, Search, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ds";
import { EmptyState } from "@/components/ds";
import { cn } from "@/lib/utils";
import type { AttendanceWithProfile, UserProfile } from "@/types";
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
  attendance: AttendanceWithProfile[];
  profiles: UserProfile[];
}

export function AttendanceView({ attendance, profiles }: AttendanceViewProps) {
  const currentMonth = new Date().toISOString().slice(0, 7);

  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [monthFilter,    setMonthFilter]    = useState(currentMonth);
  const [dateFrom,       setDateFrom]       = useState("");
  const [dateTo,         setDateTo]         = useState("");
  const [search,         setSearch]         = useState("");

  const availableMonths = useMemo(() => {
    const set = new Set(attendance.map((a) => a.attendance_date.slice(0, 7)));
    return Array.from(set).sort().reverse();
  }, [attendance]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return attendance.filter((a) => {
      if (monthFilter !== "all" && !a.attendance_date.startsWith(monthFilter)) return false;
      if (employeeFilter !== "all" && a.user_id !== employeeFilter) return false;
      if (dateFrom && a.attendance_date < dateFrom) return false;
      if (dateTo && a.attendance_date > dateTo) return false;
      if (q && !a.full_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [attendance, monthFilter, employeeFilter, dateFrom, dateTo, search]);

  const totalHours = useMemo(() => filtered.reduce((s, a) => s + (a.total_hours ?? 0), 0), [filtered]);

  function handleExport() {
    const header = ["Employee", "Email", "Date", "Punch In", "Punch Out", "Total Hours", "Status"];
    const rows = filtered.map((a) => [
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
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-44 h-9 shrink-0 bg-muted/40 border-border/60 rounded-xl focus:ring-0">
            <Calendar className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {availableMonths.map((m) => (
              <SelectItem key={m} value={m}>{fmtMonthLabel(m)}</SelectItem>
            ))}
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

        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search employee…"
            className="pl-8.5 h-9 bg-muted/40 border-border/60 rounded-xl focus-visible:ring-0 focus-visible:border-border text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Input type="date" className="h-9 w-36 bg-muted/40 border-border/60 rounded-xl text-sm" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <span className="text-xs text-muted-foreground">to</span>
          <Input type="date" className="h-9 w-36 bg-muted/40 border-border/60 rounded-xl text-sm" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        </div>

        <Button variant="outline" size="sm" className="gap-1.5 shrink-0 rounded-xl border-border/60" onClick={handleExport}>
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </div>

      {/* Summary strip */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-muted-foreground">
        <span><span className="font-medium text-foreground">{filtered.length}</span> record{filtered.length !== 1 ? "s" : ""}</span>
        <span>Total hours: <span className="font-medium text-foreground">{totalHours.toFixed(1)}h</span></span>
        <span>Present: <span className="font-medium text-emerald-500">{filtered.filter((a) => a.status === "present").length}</span></span>
        <span>Absent: <span className="font-medium text-red-500">{filtered.filter((a) => a.status === "absent").length}</span></span>
      </div>

      {/* Table */}
      <div className="relative rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none z-10" />

        {filtered.length === 0 ? (
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
                {filtered.map((a) => {
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

        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-border/40 bg-muted/10">
            <p className="text-xs text-muted-foreground">{filtered.length} record{filtered.length !== 1 ? "s" : ""} shown</p>
          </div>
        )}
      </div>
    </div>
  );
}
