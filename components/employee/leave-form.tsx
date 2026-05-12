"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { applyLeaveAction } from "@/actions/employee/leave";

const leaveSchema = z.object({
  leave_type: z.enum(["casual", "sick", "earned", "maternity", "paternity", "other"]),
  from_date: z.string().min(1, "Start date is required"),
  to_date: z.string().min(1, "End date is required"),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
});

type LeaveFormValues = z.infer<typeof leaveSchema>;

const LEAVE_TYPES = [
  { value: "casual", label: "Casual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "earned", label: "Earned Leave" },
  { value: "maternity", label: "Maternity Leave" },
  { value: "paternity", label: "Paternity Leave" },
  { value: "other", label: "Other" },
] as const;

export function LeaveForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const form = useForm<LeaveFormValues>({
    resolver: zodResolver(leaveSchema),
    defaultValues: {
      leave_type: "casual",
      from_date: "",
      to_date: "",
      reason: "",
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setLoading(true);
    const result = await applyLeaveAction(values);
    setLoading(false);

    if (result.success) {
      toast.success("Leave request submitted successfully.");
      form.reset();
      setOpen(false);
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
          Apply Leave
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apply for Leave</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label>Leave Type</Label>
            <Select
              value={form.watch("leave_type")}
              onValueChange={(v) =>
                form.setValue("leave_type", v as LeaveFormValues["leave_type"], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAVE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.leave_type && (
              <p className="text-xs text-destructive">
                {form.formState.errors.leave_type.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>From Date</Label>
              <Input type="date" {...form.register("from_date")} />
              {form.formState.errors.from_date && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.from_date.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>To Date</Label>
              <Input type="date" {...form.register("to_date")} />
              {form.formState.errors.to_date && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.to_date.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Reason</Label>
            <Textarea
              placeholder="Briefly explain the reason for your leave…"
              rows={3}
              {...form.register("reason")}
            />
            {form.formState.errors.reason && (
              <p className="text-xs text-destructive">
                {form.formState.errors.reason.message}
              </p>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={loading}>
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {loading ? "Submitting…" : "Submit Request"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
