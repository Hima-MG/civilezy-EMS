"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Play, CheckCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  updateTaskStatusAction,
  deleteTaskAction,
} from "@/actions/employee/tasks";
import type { DailyTask, TaskStatus } from "@/types";

type Filter = "all" | TaskStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

const STATUS_BADGE: Record<TaskStatus, { label: string; className: string }> = {
  pending: { label: "Pending", className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200" },
  in_progress: { label: "In Progress", className: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200" },
  completed: { label: "Completed", className: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200" },
};

interface TaskListProps {
  tasks: DailyTask[];
}

export function TaskList({ tasks }: TaskListProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [filter, setFilter] = useState<Filter>("all");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filtered =
    filter === "all" ? tasks : tasks.filter((t) => t.status === filter);

  async function handleStatus(id: string, status: TaskStatus) {
    setLoadingId(id);
    const result = await updateTaskStatusAction(id, status);
    setLoadingId(null);
    if (result.success) {
      toast.success("Task updated.");
      startTransition(() => router.refresh());
    } else {
      toast.error(result.error);
    }
  }

  async function handleDelete(id: string) {
    setLoadingId(id);
    const result = await deleteTaskAction(id);
    setLoadingId(null);
    if (result.success) {
      toast.success("Task deleted.");
      startTransition(() => router.refresh());
    } else {
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={filter === f.value ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs"
            onClick={() => setFilter(f.value)}
          >
            {f.label}
            {f.value !== "all" && (
              <span className="ml-1 opacity-60">
                ({tasks.filter((t) => t.status === f.value).length})
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* Task items */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          {filter === "all" ? "No tasks yet. Add one above." : `No ${filter.replace("_", " ")} tasks.`}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              isLoading={loadingId === task.id}
              onStatus={handleStatus}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TaskItem({
  task,
  isLoading,
  onStatus,
  onDelete,
}: {
  task: DailyTask;
  isLoading: boolean;
  onStatus: (id: string, status: TaskStatus) => void;
  onDelete: (id: string) => void;
}) {
  const badge = STATUS_BADGE[task.status];

  return (
    <Card className={task.status === "completed" ? "opacity-60" : ""}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm font-medium leading-snug ${
                task.status === "completed" ? "line-through text-muted-foreground" : ""
              }`}
            >
              {task.title}
            </p>
            {task.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {task.description}
              </p>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(task.created_at).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="outline" className={`text-xs ${badge.className}`}>
              {badge.label}
            </Badge>

            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            ) : (
              <div className="flex gap-1">
                {task.status === "pending" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    title="Start task"
                    onClick={() => onStatus(task.id, "in_progress")}
                  >
                    <Play className="w-3.5 h-3.5" />
                  </Button>
                )}
                {task.status === "in_progress" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-green-600"
                    title="Mark complete"
                    onClick={() => onStatus(task.id, "completed")}
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  title="Delete task"
                  onClick={() => onDelete(task.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
