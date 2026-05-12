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
import { Card, CardContent } from "@/components/ui/card";
import { addTaskAction } from "@/actions/employee/tasks";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().max(1000, "Too long").optional(),
});

type TaskFormValues = z.infer<typeof taskSchema>;

export function TaskForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: "", description: "" },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setLoading(true);
    const result = await addTaskAction(values);
    setLoading(false);

    if (result.success) {
      toast.success("Task added.");
      form.reset();
      setExpanded(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  });

  if (!expanded) {
    return (
      <Button size="sm" className="gap-1.5" onClick={() => setExpanded(true)}>
        <Plus className="w-3.5 h-3.5" />
        Add Task
      </Button>
    );
  }

  return (
    <Card className="border-dashed">
      <CardContent className="pt-4">
        <form onSubmit={onSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label>Task Title</Label>
            <Input
              placeholder="What needs to be done?"
              autoFocus
              {...form.register("title")}
            />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>
              Description{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              placeholder="Add details…"
              rows={2}
              {...form.register("description")}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={loading}>
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {loading ? "Adding…" : "Add Task"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                form.reset();
                setExpanded(false);
              }}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
