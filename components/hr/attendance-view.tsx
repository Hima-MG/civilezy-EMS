"use client";

import { useState, useMemo } from "react";
import { Download, Search, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Skeleton } from "@/components/ui/skeleton";
import type { AttendanceWithProfile, UserProfile } from "@/types";

function fmtMonthLabel(m: string) {
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1).toLocaleString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  present:  { label: "Present",  className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400" },
  absent:   { label: "Absent",   className: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400" },
  half_day: { label: "Half Day", className: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400" },
  late:     { label: "Late",     className: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400" },
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
  // Default to current month so the tab isn't empty on first load.
  // HR can select "All" to see the full 6-month window.
  const [monthFilter, setMonthFilter] = useState(currentMonth);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");

  // Derive the distinct months present in the attendance data for the picker
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

  const totalHours = useMemo(
    () => filtered.reduce((s, a) => s + (a.total_hours ?? 0), 0),
    [filtered]
  );

  function handleExport() {
    const header = ["Employee", "Email", "Date", "Punch In", "Punch Out", "Total Hours", "Status"];
    const rows = filtered.map((a) => [
      a.full_name, a.email, a.attendance_date,
      a.punch_in ? new Date(a.punch_in).toLocaleTimeString("en-IN") : "",
      a.punch_out ? new Date(a.punch_out).toLocaleTimeString("en-IN") : "",
      a.total_hours ?? "",
      a.status,
    ]);
    downloadCSV([header, ...rows], `attendance_${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar — row 1: month + employee + export */}
      <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
        {/* Month picker — primary filter */}
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-44 h-9 shrink-0">
            <Calendar className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue placeholder="Select month" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {availableMonths.map((m) => (
              <SelectItem key={m} value={m}>
                {fmtMonthLabel(m)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Employee filter */}
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

        {/* Name search */}
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employee…"
            className="pl-8 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Date range — optional secondary filter */}
        <div className="flex items-center gap-2 shrink-0">
          <Input
            type="date"
            className="h-9 w-36"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            className="h-9 w-36"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>

        <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={handleExport}>
          <Download className="w-3.5 h-3.5" />
          Export CSV
        </Button>
      </div>

      {/* Summary row */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <span>{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
        <span>Total hours: <span className="font-medium text-foreground">{totalHours.toFixed(1)}h</span></span>
        <span>Present: <span className="font-medium text-foreground">{filtered.filter((a) => a.status === "present").length}</span></span>
        <span>Absent: <span className="font-medium text-foreground">{filtered.filter((a) => a.status === "absent").length}</span></span>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-center px-4">
              <Calendar className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-sm font-medium">No attendance records found</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                {monthFilter !== "all"
                  ? `No records for ${fmtMonthLabel(monthFilter)}. Try selecting a different month or choose "All Months".`
                  : "No records match the current filters. Try adjusting or clearing them."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead className="hidden sm:table-cell">Date</TableHead>
                  <TableHead className="hidden md:table-cell">Punch In</TableHead>
                  <TableHead className="hidden md:table-cell">Punch Out</TableHead>
                  <TableHead className="hidden lg:table-cell">Hours</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => {
                  const b = STATUS_BADGE[a.status];
                  return (
                    <TableRow key={a.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{a.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{a.email}</p>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">{fmtDate(a.attendance_date)}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{fmtTime(a.punch_in)}</TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{fmtTime(a.punch_out)}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {a.total_hours != null ? `${a.total_hours}h` : "—"}
                      </TableCell>
                      <TableCell>
                        {b ? (
                          <Badge variant="outline" className={`text-xs ${b.className}`}>{b.label}</Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">{a.status}</span>
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

export function AttendanceViewSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-9 w-80" />
        <Skeleton className="h-9 w-28 ml-auto" />
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {["Employee", "Date", "Punch In", "Punch Out", "Hours", "Status"].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
