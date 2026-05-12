"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, DailyTask, TaskStatus } from "@/types";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().max(1000, "Description too long").optional(),
});

export type TaskFormValues = z.infer<typeof taskSchema>;

export async function addTaskAction(
  values: TaskFormValues
): Promise<ActionResult<DailyTask>> {
  const parsed = taskSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("daily_tasks")
    .insert({
      user_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      status: "pending",
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/employee");
  return { success: true, data: data as DailyTask };
}

export async function updateTaskStatusAction(
  id: string,
  status: TaskStatus
): Promise<ActionResult<DailyTask>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("daily_tasks")
    .update({ status })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/employee");
  return { success: true, data: data as DailyTask };
}

export async function deleteTaskAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("daily_tasks")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/employee");
  return { success: true, data: undefined };
}
