"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, WorkReport } from "@/types";

const reviewSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["approved", "rejected"]),
  note: z.string().max(1000).optional(),
});

export type ReviewWorkReportInput = z.infer<typeof reviewSchema>;

async function assertHrOrAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase: null, user: null, error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !["hr_finance", "admin"].includes(profile.role)) {
    return { supabase: null, user: null, error: "Access denied" };
  }
  return { supabase, user, error: null };
}

export async function reviewWorkReportAction(
  input: ReviewWorkReportInput
): Promise<ActionResult<WorkReport>> {
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { supabase, user, error } = await assertHrOrAdmin();
  if (error || !supabase || !user) {
    return { success: false, error: error ?? "Access denied" };
  }

  const { data, error: dbError } = await supabase
    .from("work_reports")
    .update({
      approval_status: parsed.data.status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      review_note: parsed.data.note ?? null,
    })
    .eq("id", parsed.data.id)
    .select()
    .single();

  if (dbError) return { success: false, error: dbError.message };

  const { error: logError } = await supabase.from("work_report_reviews").insert({
    work_report_id: parsed.data.id,
    action: parsed.data.status,
    reviewed_by: user.id,
    note: parsed.data.note ?? null,
  });

  if (logError) return { success: false, error: logError.message };

  revalidatePath("/admin/work-reports");
  revalidatePath("/hr/work-reports");
  revalidatePath("/employee/work-reports");

  return { success: true, data: data as WorkReport };
}
