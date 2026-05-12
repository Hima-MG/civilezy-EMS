"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, LeaveRequest } from "@/types";

async function assertHrRole() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase: null, user: null, error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["hr_finance", "admin"].includes(profile.role)) {
    return { supabase: null, user: null, error: "Access denied" };
  }
  return { supabase, user, error: null };
}

export async function updateLeaveStatusAction(
  id: string,
  status: "approved" | "rejected"
): Promise<ActionResult<LeaveRequest>> {
  const { supabase, error } = await assertHrRole();
  if (error || !supabase) return { success: false, error: error ?? "Access denied" };

  const { data, error: dbError } = await supabase
    .from("leave_requests")
    .update({ status })
    .eq("id", id)
    .select()
    .single();

  if (dbError) return { success: false, error: dbError.message };
  revalidatePath("/hr");
  return { success: true, data: data as LeaveRequest };
}
