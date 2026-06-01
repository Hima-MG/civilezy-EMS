"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, LeaveRequest } from "@/types";

const leaveSchema = z.object({
  leave_type: z.enum(["casual", "sick", "earned", "maternity", "paternity", "other"]),
  from_date: z.string().min(1, "Start date is required"),
  to_date: z.string().min(1, "End date is required"),
  reason: z.string().min(10, "Reason must be at least 10 characters"),
});

export type LeaveFormValues = z.infer<typeof leaveSchema>;

export async function applyLeaveAction(
  values: LeaveFormValues
): Promise<ActionResult<LeaveRequest>> {
  const parsed = leaveSchema.safeParse(values);
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

  const { from_date, to_date } = parsed.data;
  if (new Date(to_date) < new Date(from_date)) {
    return { success: false, error: "End date must be on or after start date" };
  }

  const { data, error } = await supabase
    .from("leave_requests")
    .insert({
      user_id: user.id,
      ...parsed.data,
      status: "pending",
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/employee");
  revalidatePath("/hr");
  revalidatePath("/admin");
  return { success: true, data: data as LeaveRequest };
}
