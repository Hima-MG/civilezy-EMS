"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getRoleDashboardPath } from "@/lib/utils";
import type { ActionResult, Role } from "@/types";

// ── Validation ────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// ── Login ─────────────────────────────────────────────────────────────────────

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
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();

  // ── Step 1: sign in ───────────────────────────────────────────────────────
  const {
    data: { user, session },
    error: signInError,
  } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (signInError) {
    console.error("[login] signInWithPassword error:", signInError.message, signInError.status);
    return { success: false, error: signInError.message };
  }

  if (!user || !session) {
    console.error("[login] signInWithPassword returned no user/session for email:", parsed.data.email);
    return { success: false, error: "Authentication failed. Please try again." };
  }

  console.log("[login] auth ok — user.id:", user.id, "email:", user.email);

  // ── Step 2: fetch profile via admin client ────────────────────────────────
  //
  // WHY admin client here:
  //   After signInWithPassword, fresh tokens land on the *response* cookies.
  //   The SSR client reads *request* cookies — so the new session is invisible
  //   to it, and the bearer-token workaround depends on @supabase/ssr's
  //   internal session handling not overriding the Authorization header.
  //   Using the service-role admin client is the reliable alternative:
  //   it bypasses RLS entirely (safe — this is a server action and the user
  //   is already authenticated), and is not affected by cookie state at all.
  //
  let adminClient: ReturnType<typeof createAdminClient>;
  try {
    adminClient = createAdminClient();
  } catch (e) {
    console.error("[login] createAdminClient failed — SUPABASE_SERVICE_ROLE_KEY missing?", e);
    return {
      success: false,
      error: "Server configuration error. Contact your administrator.",
    };
  }

  const {
    data: profile,
    error: profileError,
  } = await adminClient
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  // Surface the real error instead of masking it as "Account not found"
  if (profileError) {
    console.error("[login] profile query error:", {
      message: profileError.message,
      code: profileError.code,
      details: profileError.details,
      hint: profileError.hint,
      userId: user.id,
    });
    await supabase.auth.signOut();
    return {
      success: false,
      error: `Profile lookup failed: ${profileError.message}`,
    };
  }

  console.log("[login] profile query result:", {
    found: !!profile,
    role: profile?.role ?? null,
    is_active: profile?.is_active ?? null,
    userId: user.id,
  });

  if (!profile) {
    console.error("[login] no profiles row for user.id:", user.id, "email:", user.email);
    await supabase.auth.signOut();
    return {
      success: false,
      error: "Account not found. Contact your administrator to set up your account.",
    };
  }

  // ── Step 3: active check ──────────────────────────────────────────────────
  if (profile.is_active === false) {
    console.warn("[login] account is deactivated — user.id:", user.id);
    await supabase.auth.signOut();
    return {
      success: false,
      error: "Your account is inactive. Contact your administrator.",
    };
  }

  // ── Step 4: role validation ───────────────────────────────────────────────
  const validRoles: Role[] = ["admin", "hr_finance", "cre", "employee"];
  if (!validRoles.includes(profile.role as Role)) {
    console.error("[login] invalid role in profiles table:", profile.role, "user.id:", user.id);
    await supabase.auth.signOut();
    return {
      success: false,
      error: `Account has an unrecognised role (${profile.role}). Contact your administrator.`,
    };
  }

  const redirectTo = getRoleDashboardPath(profile.role as Role);
  console.log("[login] success — role:", profile.role, "redirectTo:", redirectTo);

  // Return redirect path — client calls router.push().
  // Never use redirect() inside a server action used with useActionState:
  // it throws NEXT_REDIRECT which the action wire protocol cannot serialise.
  return {
    success: true,
    data: undefined,
    redirectTo,
  };
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logoutAction(): Promise<ActionResult> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  return { success: true, data: undefined, redirectTo: "/login" };
}
