"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, RenewalQueueEntry, RenewalQueueStatus } from "@/types";

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

const createSchema = z.object({
  student_id: z.string().uuid(),
  membership_id: z.string().nullish(),
  product_name: z.string().nullish(),
  amount: z.number().nullish(),
  due_date: z.string().nullish(),
});

export async function createRenewalQueueEntryAction(
  input: z.infer<typeof createSchema>
): Promise<ActionResult<RenewalQueueEntry>> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, user, error } = await assertHrOrAdmin();
  if (error || !supabase || !user) return { success: false, error: error ?? "Access denied" };

  // Don't create a second open queue entry for a membership that's already
  // being worked — surface the existing one instead.
  if (parsed.data.membership_id) {
    const { data: existing } = await supabase
      .from("renewal_queue")
      .select("*")
      .eq("membership_id", parsed.data.membership_id)
      .neq("status", "renewed")
      .maybeSingle();
    if (existing) {
      return { success: true, data: existing as RenewalQueueEntry };
    }
  }

  const { data, error: dbError } = await supabase
    .from("renewal_queue")
    .insert({
      student_id: parsed.data.student_id,
      membership_id: parsed.data.membership_id ?? null,
      product_name: parsed.data.product_name ?? null,
      amount: parsed.data.amount ?? null,
      due_date: parsed.data.due_date ?? null,
      status: "pending_payment",
      created_by: user.id,
    })
    .select()
    .single();

  if (dbError) return { success: false, error: dbError.message };

  revalidatePath("/admin");
  return { success: true, data: data as RenewalQueueEntry };
}

const updateStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum([
    "pending_payment", "payment_received", "verification_pending",
    "ready_for_renewal", "renewed", "follow_up_required",
  ]),
  payment_reference: z.string().nullish(),
  notes: z.string().nullish(),
});

export async function updateRenewalQueueStatusAction(
  input: { id: string; status: RenewalQueueStatus; payment_reference?: string | null; notes?: string | null }
): Promise<ActionResult<RenewalQueueEntry>> {
  const parsed = updateStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { supabase, error } = await assertHrOrAdmin();
  if (error || !supabase) return { success: false, error: error ?? "Access denied" };

  const update: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.payment_reference !== undefined) update.payment_reference = parsed.data.payment_reference;
  if (parsed.data.notes !== undefined) update.notes = parsed.data.notes;

  const { data, error: dbError } = await supabase
    .from("renewal_queue")
    .update(update)
    .eq("id", parsed.data.id)
    .select()
    .single();

  if (dbError) return { success: false, error: dbError.message };

  revalidatePath("/admin");
  return { success: true, data: data as RenewalQueueEntry };
}
