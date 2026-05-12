"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, SalaryRecord } from "@/types";

async function assertHrRole() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase: null, error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["hr_finance", "admin"].includes(profile.role)) {
    return { supabase: null, error: "Access denied" };
  }
  return { supabase, error: null };
}

const salarySchema = z.object({
  user_id: z.string().min(1, "Employee is required"),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, "Month must be in YYYY-MM format"),
  working_days: z.number().int().min(1, "Working days required").max(31),
  present_days: z.number().int().min(0).max(31),
  base_salary: z.number().min(1, "Base salary required"),
  bonus: z.number().min(0),
  deductions: z.number().min(0),
});

export type SalaryFormValues = z.infer<typeof salarySchema>;

export async function generateSalaryAction(
  values: SalaryFormValues
): Promise<ActionResult<SalaryRecord>> {
  const parsed = salarySchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, error } = await assertHrRole();
  if (error || !supabase) return { success: false, error: error ?? "Access denied" };

  const { user_id, month, working_days, present_days, base_salary, bonus, deductions } =
    parsed.data;

  // Final salary formula: (base / working_days) * present_days + bonus - deductions
  const final_salary = Math.round(
    Math.max(0, (base_salary / working_days) * present_days + bonus - deductions) * 100
  ) / 100;

  const payload = {
    working_days,
    present_days,
    base_salary,
    bonus,
    deductions,
    final_salary,
    status: "pending" as const,
  };

  // Explicit SELECT → INSERT or UPDATE avoids relying on upsert's conflict
  // resolution which can silently fail when the UPDATE-leg RLS policy is
  // evaluated before the RLS fix migration has been applied.
  const { data: existing } = await supabase
    .from("salary_records")
    .select("id")
    .eq("user_id", user_id)
    .eq("month", month)
    .maybeSingle();

  let data: unknown;
  let dbError: { message: string } | null;

  if (existing?.id) {
    // Record exists — update it (preserves the existing id/created_at)
    ({ data, error: dbError } = await supabase
      .from("salary_records")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single());
  } else {
    // No record yet — insert fresh
    ({ data, error: dbError } = await supabase
      .from("salary_records")
      .insert({ user_id, month, ...payload })
      .select()
      .single());
  }

  if (dbError) return { success: false, error: dbError.message };
  revalidatePath("/hr");
  return { success: true, data: data as SalaryRecord };
}

export async function markSalaryPaidAction(id: string): Promise<ActionResult<SalaryRecord>> {
  const { supabase, error } = await assertHrRole();
  if (error || !supabase) return { success: false, error: error ?? "Access denied" };

  const { data, error: dbError } = await supabase
    .from("salary_records")
    .update({ status: "paid" })
    .eq("id", id)
    .select()
    .single();

  if (dbError) return { success: false, error: dbError.message };
  revalidatePath("/hr");
  return { success: true, data: data as SalaryRecord };
}

export async function deleteSalaryRecordAction(id: string): Promise<ActionResult> {
  const { supabase, error } = await assertHrRole();
  if (error || !supabase) return { success: false, error: error ?? "Access denied" };

  const { error: dbError } = await supabase
    .from("salary_records")
    .delete()
    .eq("id", id);

  if (dbError) return { success: false, error: dbError.message };
  revalidatePath("/hr");
  return { success: true, data: undefined };
}
