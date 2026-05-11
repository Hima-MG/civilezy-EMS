import { createClient } from "@/lib/supabase/server";
import type { UserProfile, Role } from "@/types";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getCurrentProfile(): Promise<UserProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return data as UserProfile | null;
}

export async function getUserRole(): Promise<Role> {
  const profile = await getCurrentProfile();
  return (profile?.role ?? "employee") as Role;
}

export async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

export async function requireRole(allowedRoles: Role[]) {
  const role = await getUserRole();
  if (!allowedRoles.includes(role)) {
    throw new Error("Forbidden");
  }
  return role;
}
