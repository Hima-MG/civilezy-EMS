"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServerClient } from "@supabase/ssr";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getRoleDashboardPath } from "@/lib/utils";
import type { ActionResult, Role, EmployeeCategory } from "@/types";

// ── Validation schemas ────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const ALLOWED_SIGNUP_ROLES = ["employee", "cre", "hr_finance"] as const;
type SignupRole = (typeof ALLOWED_SIGNUP_ROLES)[number];

const signupSchema = z.object({
  full_name: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(80),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(ALLOWED_SIGNUP_ROLES, { message: "Invalid role selected" }),
  employee_category: z.string().nullable().optional(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Creates an authenticated Supabase client using a Bearer token.
 * Needed right after signInWithPassword: new session tokens are on the
 * *response* cookies but the SSR client reads *request* cookies, so the
 * fresh JWT isn't visible yet. Bearer header bypasses that gap entirely.
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
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
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
    return {
      success: false,
      error: "Authentication failed. Please try again.",
    };
  }

  const authedClient = createAuthedClient(session.access_token);

  let { data: profile } = await authedClient
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  // Auto-repair: profile row missing — create it with the authedClient first
  // (RLS INSERT policy from migration 006, no service key needed), then fall
  // back to the admin client if the first attempt fails.
  if (!profile) {
    const payload = {
      id: user.id,
      email: user.email ?? "",
      full_name: (user.user_metadata?.full_name as string | undefined) ?? "",
      role: "employee" as Role,
      employee_category: null,
    };

    const { data: created } = await authedClient
      .from("profiles")
      .insert(payload)
      .select("role, is_active")
      .maybeSingle();
    profile = created;

    if (!profile) {
      try {
        const adminClient = createAdminClient();
        const { data: adminCreated } = await adminClient
          .from("profiles")
          .insert(payload)
          .select("role, is_active")
          .maybeSingle();
        profile = adminCreated;
      } catch {
        // SUPABASE_SERVICE_ROLE_KEY not set — fall through
      }
    }
  }

  if (!profile) {
    return {
      success: false,
      error:
        "Profile not found. Please ask your administrator to set up your account.",
    };
  }

  if (profile.is_active === false) {
    await supabase.auth.signOut();
    return {
      success: false,
      error:
        "Your account is pending approval. Please contact your administrator.",
    };
  }

  const role = profile.role as Role;
  const redirectTo = getRoleDashboardPath(role);

  revalidatePath("/", "layout");

  // Return the redirect path — the client component calls router.push().
  // Never call redirect() inside a server action used with useActionState:
  // it throws NEXT_REDIRECT which the action wire protocol can't serialise,
  // causing "unexpected response" on the client in production.
  return { success: true, data: undefined, redirectTo };
}

// ── Signup ────────────────────────────────────────────────────────────────────

export async function signupAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const raw = {
    full_name: (formData.get("full_name") as string)?.trim(),
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    role: formData.get("role") as string,
    employee_category: (formData.get("employee_category") as string) || null,
  };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { full_name, email, password, role, employee_category } = parsed.data;

  const supabase = await createClient();

  // Pass role + category in metadata so the handle_new_user DB trigger
  // (migration 007) can write them even when no service key is available.
  const {
    data: { user },
    error: signUpError,
  } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name, role, employee_category: employee_category ?? null },
    },
  });

  if (signUpError) {
    return { success: false, error: signUpError.message };
  }

  if (!user) {
    return {
      success: false,
      error: "Account creation failed. Please try again.",
    };
  }

  // Upsert profile via admin client (bypasses RLS, most reliable).
  // The handle_new_user trigger already created a bare row — upsert
  // overwrites it with the user-selected role and category.
  try {
    const adminClient = createAdminClient();
    const { error: profileError } = await adminClient
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email,
          full_name,
          role: role as SignupRole,
          employee_category: (employee_category as EmployeeCategory) ?? null,
        },
        { onConflict: "id" }
      );

    if (profileError) {
      await adminClient.auth.admin.deleteUser(user.id);
      return {
        success: false,
        error:
          "Failed to create account profile. Please contact your administrator.",
      };
    }
  } catch {
    // Service key not set — trigger + Bearer-token update (below) handle it
  }

  // Auto sign-in after signup.
  // Fails when Supabase email confirmation is required — that's fine, we
  // return a "check your inbox" message. No redirect() call here.
  const {
    data: { session },
    error: signInError,
  } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError || !session) {
    return {
      success: true,
      data: undefined,
      message:
        "Account created! Check your email and click the confirmation link, then sign in.",
    };
  }

  // Ensure correct role/category via Bearer token — reliable fallback when
  // the admin client upsert above was skipped due to missing service key.
  const signedInClient = createAuthedClient(session.access_token);
  await signedInClient
    .from("profiles")
    .update({
      role: role as SignupRole,
      employee_category: (employee_category as EmployeeCategory) ?? null,
      full_name,
    })
    .eq("id", session.user.id);

  revalidatePath("/", "layout");

  return {
    success: true,
    data: undefined,
    redirectTo: getRoleDashboardPath(role as Role),
  };
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logoutAction(): Promise<ActionResult> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  return { success: true, data: undefined, redirectTo: "/login" };
}
