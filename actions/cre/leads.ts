"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, Lead, LeadStatus } from "@/types";

const leadSchema = z.object({
  name: z.string().min(1, "Name is required").max(200, "Name too long"),
  phone: z.string().min(7, "Valid phone required").max(20, "Phone too long"),
  email: z.union([z.string().email("Invalid email").max(200), z.literal("")]).optional(),
  course_interest: z.string().max(300).optional(),
  source: z.string().max(100).optional(),
  status: z
    .enum(["new", "contacted", "interested", "follow_up", "converted", "lost"])
    .default("new"),
});

export type LeadFormValues = z.infer<typeof leadSchema>;

export async function addLeadAction(
  values: LeadFormValues
): Promise<ActionResult<Lead>> {
  const parsed = leadSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("leads")
    .insert({
      name: parsed.data.name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      course_interest: parsed.data.course_interest || null,
      source: parsed.data.source || null,
      status: parsed.data.status,
      assigned_to: user.id,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/cre");
  return { success: true, data: data as Lead };
}

export async function updateLeadStatusAction(
  id: string,
  status: LeadStatus
): Promise<ActionResult<Lead>> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data, error } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", id)
    .or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`)
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/cre");
  return { success: true, data: data as Lead };
}

export async function deleteLeadAction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { error } = await supabase
    .from("leads")
    .delete()
    .eq("id", id)
    .eq("created_by", user.id);

  if (error) return { success: false, error: error.message };
  revalidatePath("/cre");
  return { success: true, data: undefined };
}
