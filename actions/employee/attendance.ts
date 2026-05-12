"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, AttendanceRecord } from "@/types";

function getToday(): string {
  return new Date().toISOString().split("T")[0];
}

export async function punchInAction(): Promise<ActionResult<AttendanceRecord>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const today = getToday();

  const { data: existing } = await supabase
    .from("attendance")
    .select("*")
    .eq("user_id", user.id)
    .eq("attendance_date", today)
    .maybeSingle();

  if (existing?.punch_in) {
    return { success: false, error: "Already punched in today" };
  }

  const now = new Date().toISOString();

  if (existing) {
    const { data, error } = await supabase
      .from("attendance")
      .update({ punch_in: now, status: "present" })
      .eq("id", existing.id)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath("/employee");
    return { success: true, data: data as AttendanceRecord };
  }

  const { data, error } = await supabase
    .from("attendance")
    .insert({
      user_id: user.id,
      attendance_date: today,
      punch_in: now,
      status: "present",
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/employee");
  return { success: true, data: data as AttendanceRecord };
}

export async function punchOutAction(): Promise<ActionResult<AttendanceRecord>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { success: false, error: "Not authenticated" };

  const today = getToday();

  const { data: existing } = await supabase
    .from("attendance")
    .select("*")
    .eq("user_id", user.id)
    .eq("attendance_date", today)
    .maybeSingle();

  if (!existing?.punch_in) {
    return { success: false, error: "Please punch in first" };
  }

  if (existing.punch_out) {
    return { success: false, error: "Already punched out today" };
  }

  const now = new Date();
  const punchIn = new Date(existing.punch_in);
  const totalHours = parseFloat(
    ((now.getTime() - punchIn.getTime()) / (1000 * 60 * 60)).toFixed(2)
  );

  const { data, error } = await supabase
    .from("attendance")
    .update({
      punch_out: now.toISOString(),
      total_hours: totalHours,
    })
    .eq("id", existing.id)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/employee");
  return { success: true, data: data as AttendanceRecord };
}
