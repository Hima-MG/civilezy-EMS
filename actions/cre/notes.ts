"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, LeadNote } from "@/types";

const noteSchema = z.object({
  lead_id: z.string().min(1, "Lead ID required"),
  note: z.string().min(1, "Note is required").max(2000, "Note too long"),
});

export type NoteFormValues = z.infer<typeof noteSchema>;

export async function addNoteAction(
  values: NoteFormValues
): Promise<ActionResult<LeadNote>> {
  const parsed = noteSchema.safeParse(values);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Verify the user owns or is assigned to this lead
  const { data: lead } = await supabase
    .from("leads")
    .select("id")
    .eq("id", parsed.data.lead_id)
    .or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`)
    .single();

  if (!lead) return { success: false, error: "Lead not found or access denied" };

  const { data, error } = await supabase
    .from("lead_notes")
    .insert({
      lead_id: parsed.data.lead_id,
      note: parsed.data.note,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/cre");
  return { success: true, data: data as LeadNote };
}
