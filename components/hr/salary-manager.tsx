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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/ds";
import { EmptyState } from "@/components/ds";
import { cn } from "@/lib/utils";
import { generateSalaryAction, markSalaryPaidAction, deleteSalaryRecordAction } from "@/actions/hr/salary";
import { formatCurrency } from "@/lib/utils";
import type { SalaryWithProfile, AttendanceWithProfile, UserProfile } from "@/types";
import type { StatusVariant } from "@/components/ds";

const salarySchema = z.object({
  user_id:      z.string().min(1, "Employee is required"),
  month:        z.string().regex(/^\d{4}-\d{2}$/, "Month must be YYYY-MM"),
  working_days: z.number().int().min(1, "Required").max(31),
  present_days: z.number().int().min(0).max(31),
  base_salary:  z.number().min(1, "Base salary required"),
  bonus:        z.number().min(0),
  deductions:   z.number().min(0),
});

type SalaryFormValues = z.infer<typeof salarySchema>;

const STATUS_MAP: Record<string, { label: string; variant: StatusVariant }> = {
  pending: { label: "Pending", variant: "pending" },
  paid:    { label: "Paid",    variant: "success" },
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

// ── Salary Form Dialog ────────────────────────────────────────────────

interface SalaryFormProps {
  profiles: UserProfile[];
  attendance: AttendanceWithProfile[];
  onSuccess: () => void;
}

function SalaryFormDialog({ profiles, attendance, onSuccess }: SalaryFormProps) {
  const router = useRouter();
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const prevComboRef = useRef("");
  const currentMonth = new Date().toISOString().slice(0, 7);

  const form = useForm<SalaryFormValues>({
    resolver: zodResolver(salarySchema),
    defaultValues: {
      user_id: "", month: currentMonth, working_days: 26,
      present_days: 0, base_salary: 0, bonus: 0, deductions: 0,
    },
  });

  const { setValue } = form;
  // eslint-disable-next-line react-hooks/incompatible-library
  const watchedUserId = form.watch("user_id");
  const watchedMonth  = form.watch("month");
  const [baseSalary, workingDays, presentDays, bonus, deductions] = form.watch([
    "base_salary", "working_days", "present_days", "bonus", "deductions",
  ]);

  useEffect(() => {
    const combo = `${watchedUserId}|${watchedMonth}`;
    if (combo === prevComboRef.current) return;
    if (!watchedUserId || !watchedMonth) return;
    prevComboRef.current = combo;
    const count = attendance.filter(
      (a) => a.user_id === watchedUserId && a.attendance_date.startsWith(watchedMonth) && a.status === "present"
    ).length;
    setValue("present_days", count, { shouldValidate: false });
  }, [watchedUserId, watchedMonth, attendance, setValue]);

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
        <Button size="sm" className="gap-1.5 rounded-xl">
          <Plus className="w-3.5 h-3.5" />
          Generate Salary
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Salary Record</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Employee <span className="text-destructive">*</span></Label>
            <Select value={watchedUserId} onValueChange={(v) => form.setValue("user_id", v, { shouldValidate: true })}>
              <SelectTrigger><SelectValue placeholder="Select employee…" /></SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.user_id && (
              <p className="text-xs text-destructive">{form.formState.errors.user_id.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Month <span className="text-destructive">*</span></Label>
            <Input type="month" {...form.register("month")} />
            {form.formState.errors.month && (
              <p className="text-xs text-destructive">{form.formState.errors.month.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Working Days <span className="text-destructive">*</span></Label>
              <Input type="number" min={1} max={31} {...form.register("working_days", { valueAsNumber: true })} />
              {form.formState.errors.working_days && (
                <p className="text-xs text-destructive">{form.formState.errors.working_days.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Present Days</Label>
              <Input type="number" min={0} max={31} {...form.register("present_days", { valueAsNumber: true })} />
              <p className="text-[10px] text-muted-foreground">
                {watchedUserId && watchedMonth ? (() => {
                  const n = attendance.filter(
                    (a) => a.user_id === watchedUserId && a.attendance_date.startsWith(watchedMonth) && a.status === "present"
                  ).length;
                  return n > 0
                    ? `Auto-filled: ${n} present day${n !== 1 ? "s" : ""} found`
                    : "No records found — enter manually";
                })() : "Select employee + month first"}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Base Salary (₹) <span className="text-destructive">*</span></Label>
            <Input type="number" min={0} step="0.01" placeholder="50000" {...form.register("base_salary", { valueAsNumber: true })} />
            {form.formState.errors.base_salary && (
              <p className="text-xs text-destructive">{form.formState.errors.base_salary.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Bonus (₹)</Label>
              <Input type="number" min={0} step="0.01" placeholder="0" {...form.register("bonus", { valueAsNumber: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>Deductions (₹)</Label>
              <Input type="number" min={0} step="0.01" placeholder="0" {...form.register("deductions", { valueAsNumber: true })} />
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between rounded-xl bg-muted/50 border border-border/60 px-4 py-3">
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
            <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
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

// ── Salary Manager ────────────────────────────────────────────────────

interface SalaryManagerProps {
  salaryRecords: SalaryWithProfile[];
  profiles: UserProfile[];
  attendance: AttendanceWithProfile[];
}

export function SalaryManager({ salaryRecords, profiles, attendance }: SalaryManagerProps) {
  const router = useRouter();
  const [monthFilter, setMonthFilter] = useState("all");
  const [loadingId,   setLoadingId]   = useState<string | null>(null);

  const months = useMemo(() => {
    const set = new Set(salaryRecords.map((r) => r.month));
    return Array.from(set).sort().reverse();
  }, [salaryRecords]);

  const filtered = useMemo(() => {
    if (monthFilter === "all") return salaryRecords;
    return salaryRecords.filter((r) => r.month === monthFilter);
  }, [salaryRecords, monthFilter]);

  const totalPayroll = useMemo(() => filtered.reduce((s, r) => s + r.final_salary, 0), [filtered]);

  const handleMarkPaid = useCallback(async (id: string) => {
    setLoadingId(id);
    const result = await markSalaryPaidAction(id);
    setLoadingId(null);
    if (result.success) { toast.success("Marked as paid."); router.refresh(); }
    else toast.error(result.error);
  }, [router]);

  const handleDelete = useCallback(async (id: string) => {
    setLoadingId(id);
    const result = await deleteSalaryRecordAction(id);
    setLoadingId(null);
    if (result.success) { toast.success("Salary record deleted."); router.refresh(); }
    else toast.error(result.error);
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
          <SelectTrigger className="w-44 h-9 shrink-0 bg-muted/40 border-border/60 rounded-xl focus:ring-0">
            <SelectValue placeholder="All Months" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Months</SelectItem>
            {months.map((m) => (
              <SelectItem key={m} value={m}>{fmtMonth(m)}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="sm:ml-auto flex items-center gap-3">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span><span className="font-medium text-foreground">{filtered.length}</span> record{filtered.length !== 1 ? "s" : ""}</span>
            <span>Total: <span className="font-medium text-foreground">{formatCurrency(totalPayroll)}</span></span>
            <span>Paid: <span className="font-medium text-emerald-500">{filtered.filter((r) => r.status === "paid").length}</span></span>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5 rounded-xl border-border/60" onClick={handleExport}>
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
          <SalaryFormDialog profiles={profiles} attendance={attendance} onSuccess={() => {}} />
        </div>
      </div>

      {/* Table */}
      <div className="relative rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none z-10" />

        {filtered.length === 0 ? (
          <EmptyState
            icon={IndianRupee}
            title="No salary records found"
            description='Use "Generate Salary" to create records.'
            variant="inline"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40">
                  {[
                    { label: "Employee",     cls: "" },
                    { label: "Month",        cls: "" },
                    { label: "Attendance",   cls: "hidden sm:table-cell" },
                    { label: "Base Salary",  cls: "hidden md:table-cell" },
                    { label: "Adjustments", cls: "hidden lg:table-cell" },
                    { label: "Final Salary", cls: "" },
                    { label: "Status",       cls: "" },
                    { label: "Actions",      cls: "text-right" },
                  ].map(({ label, cls }) => (
                    <th key={label} className={cn(
                      "px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted/20 text-left",
                      cls
                    )}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((rec) => {
                  const sm = STATUS_MAP[rec.status] ?? { label: rec.status, variant: "neutral" as StatusVariant };
                  const isLoading = loadingId === rec.id;
                  return (
                    <tr key={rec.id} className="border-b border-border/30 last:border-0 hover:bg-accent/20 transition-colors duration-100">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{rec.full_name || "—"}</p>
                        <p className="text-xs text-muted-foreground">{rec.email}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{fmtMonth(rec.month)}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">{rec.present_days}/{rec.working_days}d</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs hidden md:table-cell">{formatCurrency(rec.base_salary)}</td>
                      <td className="px-4 py-3 text-xs hidden lg:table-cell">
                        {rec.bonus > 0 && <span className="text-emerald-500">+{formatCurrency(rec.bonus)} </span>}
                        {rec.deductions > 0 && <span className="text-red-500">−{formatCurrency(rec.deductions)}</span>}
                        {rec.bonus === 0 && rec.deductions === 0 && <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">{formatCurrency(rec.final_salary)}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={sm.variant} label={sm.label} size="sm" dot />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {rec.status === "pending" && (
                            <button
                              className="flex items-center justify-center w-7 h-7 rounded-lg border border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              disabled={isLoading}
                              onClick={() => handleMarkPaid(rec.id)}
                              title="Mark as Paid"
                            >
                              {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            </button>
                          )}
                          <button
                            className="flex items-center justify-center w-7 h-7 rounded-lg border border-border/60 text-muted-foreground hover:text-red-500 hover:border-red-500/30 hover:bg-red-500/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            disabled={isLoading}
                            onClick={() => handleDelete(rec.id)}
                            title="Delete record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-border/40 bg-muted/10">
            <p className="text-xs text-muted-foreground">{filtered.length} record{filtered.length !== 1 ? "s" : ""} · Total {formatCurrency(totalPayroll)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
