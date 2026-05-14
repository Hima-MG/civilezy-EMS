"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, Role, UserProfile } from "@/types";

async function assertAdminRole() {
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

  if (!profile || profile.role !== "admin") {
    return { supabase: null, user: null, error: "Access denied" };
  }
  return { supabase, user, error: null };
}

export async function updateUserRoleAction(
  userId: string,
  newRole: Role
): Promise<ActionResult<UserProfile>> {
  const { supabase, user, error } = await assertAdminRole();
  if (error || !supabase || !user)
    return { success: false, error: error ?? "Access denied" };

  if (userId === user.id) {
    return { success: false, error: "Cannot change your own role" };
  }

  const { data, error: dbError } = await supabase
    .from("profiles")
    .update({ role: newRole })
    .eq("id", userId)
    .select()
    .single();

  if (dbError) return { success: false, error: dbError.message };
  revalidatePath("/admin");
  return { success: true, data: data as UserProfile };
}
