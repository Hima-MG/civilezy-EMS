"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { SUBCATEGORIES } from "@/components/work-reports/constants";
import type { ActionResult, EmployeeCategory, WorkReport } from "@/types";

const workReportSchema = z.object({
  sub_category: z.string().min(1, "Sub-category is required"),
  title: z.string().min(1, "Title is required").max(200, "Title too long"),
  description: z.string().max(2000, "Description too long").optional(),
  hours_spent: z.coerce
    .number()
    .positive("Hours must be greater than 0")
    .max(24, "Cannot exceed 24 hours"),
  status: z.enum(["pending", "in_progress", "completed"]),
  report_date: z.string().min(1, "Date is required"),
});

export type WorkReportFormValues = z.infer<typeof workReportSchema>;

export async function addWorkReportAction(
  values: WorkReportFormValues
): Promise<ActionResult<WorkReport>> {
  const parsed = workReportSchema.safeParse(values);
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

  // Read category from profile — never trust the client
  const { data: profile } = await supabase
    .from("profiles")
    .select("employee_category")
    .eq("id", user.id)
    .maybeSingle();

  const category = profile?.employee_category;
  if (!category) {
    return {
      success: false,
      error: "Your employee category is not set. Please contact HR.",
    };
  }

  const validSubcats = SUBCATEGORIES[category as EmployeeCategory] ?? [];
  if (!validSubcats.includes(parsed.data.sub_category)) {
    return { success: false, error: "Invalid sub-category for your role" };
  }

  const { data, error } = await supabase
    .from("work_reports")
    .insert({
      user_id: user.id,
      category,
      sub_category: parsed.data.sub_category,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      hours_spent: parsed.data.hours_spent,
      status: parsed.data.status,
      report_date: parsed.data.report_date,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/employee/work-reports");
  return { success: true, data: data as WorkReport };
}

export async function deleteWorkReportAction(
  id: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("work_reports")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return { success: false, error: error.message };

  revalidatePath("/employee/work-reports");
  return { success: true, data: undefined };
}
