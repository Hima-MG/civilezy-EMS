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
import { addWorkReportAction } from "@/actions/work-reports";
import { SUBCATEGORIES, CATEGORY_LABELS } from "./constants";
import type { EmployeeCategory } from "@/types";

const formSchema = z.object({
  sub_category: z.string().min(1, "Sub-category is required"),
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().max(2000, "Too long").optional(),
  hours_spent: z.number().positive("Must be > 0").max(24, "Cannot exceed 24h"),
  status: z.enum(["pending", "in_progress", "completed"]),
  report_date: z.string().min(1, "Date is required"),
});

type FormValues = z.infer<typeof formSchema>;

interface WorkReportFormProps {
  employeeCategory: EmployeeCategory | null;
}

const today = new Date().toISOString().split("T")[0];

export function WorkReportForm({ employeeCategory }: WorkReportFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const subcats = employeeCategory ? SUBCATEGORIES[employeeCategory] : [];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      sub_category: "",
      title: "",
      description: "",
      hours_spent: undefined,
      status: "completed",
      report_date: today,
    },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setLoading(true);
    const result = await addWorkReportAction(values);
    setLoading(false);

    if (result.success) {
      toast.success("Work report submitted.");
      form.reset({ sub_category: "", title: "", description: "", status: "completed", report_date: today });
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
          New Report
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Work Report</DialogTitle>
        </DialogHeader>

        {!employeeCategory ? (
          <div className="py-4 text-sm text-muted-foreground text-center">
            Your employee category is not set. Please contact HR.
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 pt-2">
            {/* Category display */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Category:</span>
              <Badge variant="secondary" className="text-xs">
                {CATEGORY_LABELS[employeeCategory]}
              </Badge>
            </div>

            {/* Date + Status row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input
                  type="date"
                  max={today}
                  {...form.register("report_date")}
                />
                {form.formState.errors.report_date && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.report_date.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select
                  defaultValue="completed"
                  onValueChange={(v) =>
                    form.setValue("status", v as FormValues["status"])
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.status && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.status.message}
                  </p>
                )}
              </div>
            </div>

            {/* Sub-category */}
            <div className="space-y-1.5">
              <Label>Sub-Category</Label>
              <Select
                onValueChange={(v) => form.setValue("sub_category", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sub-category" />
                </SelectTrigger>
                <SelectContent>
                  {subcats.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.formState.errors.sub_category && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.sub_category.message}
                </p>
              )}
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label>Task Title</Label>
              <Input
                placeholder="What did you work on?"
                autoFocus
                {...form.register("title")}
              />
              {form.formState.errors.title && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label>
                Description{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </Label>
              <Textarea
                placeholder="Add details…"
                rows={3}
                {...form.register("description")}
              />
            </div>

            {/* Hours */}
            <div className="space-y-1.5">
              <Label>Hours Spent</Label>
              <Input
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                placeholder="e.g. 2.5"
                {...form.register("hours_spent", { valueAsNumber: true })}
              />
              {form.formState.errors.hours_spent && (
                <p className="text-xs text-destructive">
                  {form.formState.errors.hours_spent.message}
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <Button type="submit" size="sm" disabled={loading}>
                {loading && (
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                )}
                {loading ? "Submitting…" : "Submit Report"}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
