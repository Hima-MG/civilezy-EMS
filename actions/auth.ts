"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createServerClient } from "@supabase/ssr";
import { getRoleDashboardPath } from "@/lib/utils";
import type { ActionResult, Role } from "@/types";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// ---------------------------------------------------------------------------
// Service-role client — bypasses RLS, server-only, never reaches the browser.
// We need this in loginAction because signInWithPassword writes session tokens
// to the *response* cookies, but getAll() reads from the *request* cookies.
// That means the anon client has auth.uid() = null for the rest of the action,
// and any RLS-gated query returns zero rows (PGRST116 → "profile not found").
// ---------------------------------------------------------------------------
function createAdminClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
      auth: { autoRefreshToken: false, persistSession: false },
    }
  );
}

export async function loginAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const supabase = await createClient();

  console.log("[auth] sign-in attempt:", parsed.data.email);

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (signInError) {
    console.log("[auth] sign-in error:", signInError.message);
    return { success: false, error: signInError.message };
  }

  console.log("[auth] sign-in ok — fetching user");

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (!user) {
    console.log("[auth] getUser returned null:", userError?.message);
    return { success: false, error: "Authentication failed. Please try again." };
  }

  console.log("[auth] user.id:", user.id, "email:", user.email);

  // Use service-role client so the profile lookup bypasses RLS.
  // The user identity has already been verified above by getUser().
  const admin = createAdminClient();

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  console.log("[auth] profile query → data:", JSON.stringify(profile), "error:", profileError?.code, profileError?.message);

  if (profileError || !profile) {
    // Leave the session intact — signing out here would force the user to
    // re-enter credentials just to see the same error. Log out explicitly
    // only if the profile is missing so the user can try a different account.
    if (profileError?.code === "PGRST116") {
      console.log("[auth] no profile row found for user.id:", user.id);
      console.log("[auth] hint: INSERT INTO profiles (id, email, full_name, role) VALUES ('%s', '%s', '...', 'employee');", user.id, user.email);
    } else {
      console.log("[auth] unexpected profile error:", profileError);
    }
    await supabase.auth.signOut();
    return {
      success: false,
      error: "Profile not found. Please contact an administrator.",
    };
  }

  const role = profile.role as Role;
  console.log("[auth] role:", role, "→ redirecting to", getRoleDashboardPath(role));

  revalidatePath("/", "layout");
  redirect(getRoleDashboardPath(role));
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function getSessionAction() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return { user, profile };
}
