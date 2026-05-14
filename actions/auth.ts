"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@/lib/supabase/server";
import { getRoleDashboardPath } from "@/lib/utils";
import type { ActionResult, Role } from "@/types";

// ── Validation ────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Bearer-token client — bypasses cookie-gap after signInWithPassword.
 * New session tokens land on the response cookies, but the SSR client reads
 * request cookies; the fresh JWT is invisible without this pattern.
 */
function createAuthedClient(accessToken: string) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    }
  );
}

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

  const {
    data: { user, session },
    error: signInError,
  } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (signInError) {
    return { success: false, error: signInError.message };
  }

  if (!user || !session) {
    return { success: false, error: "Authentication failed. Please try again." };
  }

  // Bearer-token client to read profile — bypasses cookie-gap after signIn.
  const authedClient = createAuthedClient(session.access_token);
  const { data: profile } = await authedClient
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    await supabase.auth.signOut();
    return {
      success: false,
      error: "Account not found. Contact your administrator to set up your account.",
    };
  }

  if (profile.is_active === false) {
    await supabase.auth.signOut();
    return {
      success: false,
      error: "Your account is inactive. Contact your administrator.",
    };
  }

  revalidatePath("/", "layout");

  // Return redirect path — client calls router.push().
  // Never use redirect() inside a server action used with useActionState:
  // it throws NEXT_REDIRECT which the action wire protocol cannot serialise.
  return { success: true, data: undefined, redirectTo: getRoleDashboardPath(profile.role as Role) };
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logoutAction(): Promise<ActionResult> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  return { success: true, data: undefined, redirectTo: "/login" };
}
