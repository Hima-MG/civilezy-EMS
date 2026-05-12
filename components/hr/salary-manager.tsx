"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Loader2, CheckCircle2, Download, Trash2, IndianRupee } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { generateSalaryAction, markSalaryPaidAction, deleteSalaryRecordAction } from "@/actions/hr/salary";
import { formatCurrency } from "@/lib/utils";
import type { SalaryWithProfile, AttendanceWithProfile, UserProfile } from "@/types";

// ── Salary form schema ────────────────────────────────────────

const salarySchema = z.object({
  user_id: z.string().min(1, "Employee is required"),
  month: z.string().regex(/^\d{4}-\d{2}$/, "Month must be YYYY-MM"),
  working_days: z.number().int().min(1, "Required").max(31),
  present_days: z.number().int().min(0).max(31),
  base_salary: z.number().min(1, "Base salary required"),
  bonus: z.number().min(0),
  deductions: z.number().min(0),
});

type SalaryFormValues = z.infer<typeof salarySchema>;

// ── Helpers ───────────────────────────────────────────────────

const STATUS_BADGE = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400" },
  paid:    { label: "Paid",    className: "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400" },
};

function fmtMonth(m: string) {
  const [y, mo] = m.split("-");
  return new Date(Number(y), Number(mo) - 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
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

// ── Salary Form Dialog ────────────────────────────────────────

interface SalaryFormProps {
  profiles: UserProfile[];
  attendance: AttendanceWithProfile[];
  onSuccess: () => void;
}

function SalaryFormDialog({ profiles, attendance, onSuccess }: SalaryFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const prevComboRef = useRef("");

  const currentMonth = new Date().toISOString().slice(0, 7);

  const form = useForm<SalaryFormValues>({
    resolver: zodResolver(salarySchema),
    defaultValues: {
      user_id: "",
      month: currentMonth,
      working_days: 26,
      present_days: 0,
      base_salary: 0,
      bonus: 0,
      deductions: 0,
    },
  });

  // Destructure setValue once — it's a stable reference from useForm and
  // safe to put in useEffect deps without causing infinite re-renders.
  const { setValue } = form;

  const watchedUserId = form.watch("user_id");
  const watchedMonth  = form.watch("month");
  const [baseSalary, workingDays, presentDays, bonus, deductions] = form.watch([
    "base_salary", "working_days", "present_days", "bonus", "deductions",
  ]);

  // Auto-populate present_days when employee + month selection changes.
  // Uses prevComboRef to guarantee the effect only fires when the
  // combination actually changes, not on every re-render.
  useEffect(() => {
    const combo = `${watchedUserId}|${watchedMonth}`;
    if (combo === prevComboRef.current) return;
    if (!watchedUserId || !watchedMonth) return;

    prevComboRef.current = combo;

    const count = attendance.filter(
      (a) =>
        a.user_id === watchedUserId &&
        a.attendance_date.startsWith(watchedMonth) &&
        a.status === "present"
    ).length;

    setValue("present_days", count, { shouldValidate: false });
  }, [watchedUserId, watchedMonth, attendance, setValue]); // setValue instead of form

  const finalSalary = useMemo(() => {
    const wd = Number(workingDays) || 0;
    const pd = Number(presentDays) || 0;
    const bs = Number(baseSalary) || 0;
    const bo = Number(bonus) || 0;
    const de = Number(deductions) || 0;
    if (wd <= 0 || bs <= 0) return 0;
    return Math.max(0, (bs / wd) * pd + bo - de);
  }, [workingDays, presentDays, baseSalary, bonus, deductions]);

  const onSubmit = form.handleSubmit(async (values) => {
    setLoading(true);
    const result = await generateSalaryAction(values);
    setLoading(false);

    if (result.success) {
      toast.success("Salary record generated.");
      form.reset({ user_id: "", month: currentMonth, working_days: 26, present_days: 0, base_salary: 0, bonus: 0, deductions: 0 });
      prevComboRef.current = "";
      setOpen(false);
      onSuccess();
      router.refresh();
    } else {
      toast.error(result.error);
    }
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="w-3.5 h-3.5" />
          Generate Salary
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Salary Record</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 mt-2">
          {/* Employee */}
          <div className="space-y-1.5">
            <Label>Employee <span className="text-destructive">*</span></Label>
            <Select
              value={form.watch("user_id")}
              onValueChange={(v) => form.setValue("user_id", v, { shouldValidate: true })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select employee…" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name || p.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.user_id && (
              <p className="text-xs text-destructive">{form.formState.errors.user_id.message}</p>
            )}
          </div>

          {/* Month */}
          <div className="space-y-1.5">
            <Label>Month <span className="text-destructive">*</span></Label>
            <Input type="month" {...form.register("month")} />
            {form.formState.errors.month && (
              <p className="text-xs text-destructive">{form.formState.errors.month.message}</p>
            )}
          </div>

          {/* Working + Present days */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Working Days <span className="text-destructive">*</span></Label>
              <Input
                type="number" min={1} max={31}
                {...form.register("working_days", { valueAsNumber: true })}
              />
              {form.formState.errors.working_days && (
                <p className="text-xs text-destructive">{form.formState.errors.working_days.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Present Days</Label>
              <Input
                type="number" min={0} max={31}
                {...form.register("present_days", { valueAsNumber: true })}
              />
              {watchedUserId && watchedMonth ? (
                <p className="text-[10px] text-muted-foreground">
                  {(() => {
                    const n = attendance.filter(
                      (a) =>
                        a.user_id === watchedUserId &&
                        a.attendance_date.startsWith(watchedMonth) &&
                        a.status === "present"
                    ).length;
                    return n > 0
                      ? `Auto-filled: ${n} present day${n !== 1 ? "s" : ""} found`
                      : "No attendance records found for this month — enter manually";
                  })()}
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground">Select employee + month first</p>
              )}
            </div>
          </div>

          {/* Base salary */}
          <div className="space-y-1.5">
            <Label>Base Salary (₹) <span className="text-destructive">*</span></Label>
            <Input
              type="number" min={0} step="0.01" placeholder="50000"
              {...form.register("base_salary", { valueAsNumber: true })}
            />
            {form.formState.errors.base_salary && (
              <p className="text-xs text-destructive">{form.formState.errors.base_salary.message}</p>
            )}
          </div>

          {/* Bonus + Deductions */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Bonus (₹)</Label>
              <Input type="number" min={0} step="0.01" placeholder="0"
                {...form.register("bonus", { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>Deductions (₹)</Label>
              <Input type="number" min={0} step="0.01" placeholder="0"
                {...form.register("deductions", { valueAsNumber: true })} />
            </div>
          </div>

          <Separator />

          {/* Final salary preview */}
          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
            <div>
              <p className="text-xs text-muted-foreground">Calculated Final Salary</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                ({formatCurrency(Number(baseSalary) || 0)} ÷ {Number(workingDays) || 0}d) × {Number(presentDays) || 0}d
                {Number(bonus) > 0 ? ` + ${formatCurrency(Number(bonus))}` : ""}
                {Number(deductions) > 0 ? ` − ${formatCurrency(Number(deductions))}` : ""}
              </p>
            </div>
            <p className="text-lg font-bold text-primary">{formatCurrency(finalSalary)}</p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {loading ? "Generating…" : "Generate"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── Salary Manager (table + form) ─────────────────────────────

interface SalaryManagerProps {
  salaryRecords: SalaryWithProfile[];
  profiles: UserProfile[];
  attendance: AttendanceWithProfile[];
}

export function SalaryManager({ salaryRecords, profiles, attendance }: SalaryManagerProps) {
  const router = useRouter();
  const [monthFilter, setMonthFilter] = useState("all");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Distinct months for filter dropdown
  const months = useMemo(() => {
    const set = new Set(salaryRecords.map((r) => r.month));
    return Array.from(set).sort().reverse();
  }, [salaryRecords]);

  const filtered = useMemo(() => {
    if (monthFilter === "all") return salaryRecords;
    return salaryRecords.filter((r) => r.month === monthFilter);
  }, [salaryRecords, monthFilter]);

  const totalPayroll = useMemo(
    () => filtered.reduce((s, r) => s + r.final_salary, 0),
    [filtered]
  );

  const handleMarkPaid = useCallback(async (id: string) => {
    setLoadingId(id);
    const result = await markSalaryPaidAction(id);
    setLoadingId(null);
    if (result.success) {
      toast.success("Marked as paid.");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }, [router]);

  const handleDelete = useCallback(async (id: string) => {
    setLoadingId(id);
    const result = await deleteSalaryRecordAction(id);
    setLoadingId(null);
    if (result.success) {
      toast.success("Salary record deleted.");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }, [router]);

  function handleExport() {
    const header = ["Employee", "Email", "Month", "Working Days", "Present Days", "Base Salary", "Bonus", "Deductions", "Final Salary", "Status"];
    const rows = filtered.map((r) => [
      r.full_name, r.email, fmtMonth(r.month),
      r.working_days, r.present_days,
      r.base_salary, r.bonus, r.deductions, r.final_salary, r.status,
    ]);
    downloadCSV([header, ...rows], `payroll_${monthFilter !== "all" ? monthFilter : "all"}_${new Date().toISOString().slice(0, 10)}.csv`);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className="w-44 h-9 shrink-0">
            <SelectValue placeholder="All Months" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {months.map((m) => (
              <SelectItem key={m} value={m}>{fmtMonth(m)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="sm:ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleExport}>
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
          <SalaryFormDialog
            profiles={profiles}
            attendance={attendance}
            onSuccess={() => {}}
          />
        </div>
      </div>

      {/* Summary */}
      <div className="flex items-center gap-5 text-sm text-muted-foreground">
        <span>{filtered.length} record{filtered.length !== 1 ? "s" : ""}</span>
        <span>
          Total payroll:{" "}
          <span className="font-medium text-foreground">{formatCurrency(totalPayroll)}</span>
        </span>
        <span>
          Paid:{" "}
          <span className="font-medium text-foreground">
            {filtered.filter((r) => r.status === "paid").length}
          </span>
        </span>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-center">
              <IndianRupee className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-sm font-medium">No salary records found</p>
              <p className="text-xs text-muted-foreground">
                Use "Generate Salary" to create records.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead className="hidden sm:table-cell">Attendance</TableHead>
                  <TableHead className="hidden md:table-cell">Base Salary</TableHead>
                  <TableHead className="hidden lg:table-cell">Adjustments</TableHead>
                  <TableHead>Final Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((rec) => {
                  const b = STATUS_BADGE[rec.status];
                  const isLoading = loadingId === rec.id;
                  return (
                    <TableRow key={rec.id}>
                      <TableCell>
                        <p className="text-sm font-medium">{rec.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{rec.email}</p>
                      </TableCell>
                      <TableCell className="text-sm">{fmtMonth(rec.month)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {rec.present_days}/{rec.working_days}d
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {formatCurrency(rec.base_salary)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">
                        {rec.bonus > 0 && <span className="text-green-600">+{formatCurrency(rec.bonus)} </span>}
                        {rec.deductions > 0 && <span className="text-red-500">−{formatCurrency(rec.deductions)}</span>}
                        {rec.bonus === 0 && rec.deductions === 0 && "—"}
                      </TableCell>
                      <TableCell className="text-sm font-semibold">{formatCurrency(rec.final_salary)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${b.className}`}>
                          {b.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {rec.status === "pending" && (
                            <Button
                              size="sm" variant="ghost"
                              className="h-7 w-7 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                              disabled={isLoading}
                              onClick={() => handleMarkPaid(rec.id)}
                              title="Mark as Paid"
                            >
                              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            </Button>
                          )}
                          <Button
                            size="sm" variant="ghost"
                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            disabled={isLoading}
                            onClick={() => handleDelete(rec.id)}
                            title="Delete record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
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
