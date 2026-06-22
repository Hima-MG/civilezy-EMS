"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { processWebhookLog, processPendingEzyCourseLogs } from "@/lib/ezycourse/process";
import type { ActionResult, CoursePurchase, MembershipRenewal, WebhookLog } from "@/types";

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") return { error: "Access denied" };
  return { error: null };
}

export async function retryEzyCourseWebhookAction(logId: string): Promise<ActionResult> {
  const { error } = await assertAdmin();
  if (error) return { success: false, error };

  // Service-role client — processing writes to students/course_purchases/
  // membership_renewals, which have admin-only SELECT policies and no
  // authenticated-write policy at all (see migration 013).
  const admin = createAdminClient();
  const { data: log, error: fetchError } = await admin
    .from("webhook_logs")
    .select("*")
    .eq("id", logId)
    .single();

  if (fetchError || !log) return { success: false, error: fetchError?.message ?? "Webhook log not found" };

  await processWebhookLog(admin, log as WebhookLog);
  revalidatePath("/admin/ezycourse");
  return { success: true, data: undefined };
}

export async function retryAllFailedEzyCourseWebhooksAction(): Promise<ActionResult<{ attempted: number }>> {
  const { error } = await assertAdmin();
  if (error) return { success: false, error };

  const admin = createAdminClient();
  try {
    const result = await processPendingEzyCourseLogs(admin, 100);
    revalidatePath("/admin/ezycourse");
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Retry sweep failed" };
  }
}

export async function exportCoursePurchasesAction(): Promise<
  ActionResult<(CoursePurchase & { student_email: string; student_name: string })[]>
> {
  const { error } = await assertAdmin();
  if (error) return { success: false, error };

  const supabase = await createClient();
  const { data, error: dbError } = await supabase
    .from("course_purchases")
    .select("*, students(email, full_name)")
    .order("created_at", { ascending: false });

  if (dbError) return { success: false, error: dbError.message };

  const rows = (data ?? []).map((r) => {
    const { students, ...rest } = r as CoursePurchase & { students: { email: string; full_name: string | null } | null };
    return {
      ...rest,
      student_email: students?.email ?? "",
      student_name: students?.full_name ?? "",
    };
  });

  return { success: true, data: rows };
}

export async function exportMembershipRenewalsAction(): Promise<
  ActionResult<(MembershipRenewal & { student_email: string; student_name: string })[]>
> {
  const { error } = await assertAdmin();
  if (error) return { success: false, error };

  const supabase = await createClient();
  const { data, error: dbError } = await supabase
    .from("membership_renewals")
    .select("*, students(email, full_name)")
    .order("created_at", { ascending: false });

  if (dbError) return { success: false, error: dbError.message };

  const rows = (data ?? []).map((r) => {
    const { students, ...rest } = r as MembershipRenewal & { students: { email: string; full_name: string | null } | null };
    return {
      ...rest,
      student_email: students?.email ?? "",
      student_name: students?.full_name ?? "",
    };
  });

  return { success: true, data: rows };
}
