"use server";

import { redirect } from "next/navigation";
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
  full_name: z.string().min(2, "Full name must be at least 2 characters").max(80),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(ALLOWED_SIGNUP_ROLES, { message: "Invalid role selected" }),
  employee_category: z.string().nullable().optional(),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Creates an authenticated Supabase client using a Bearer token from a fresh
 * sign-in session. Required because new session tokens land in *response*
 * cookies and the SSR server client reads *request* cookies — so the freshly
 * signed-in user's JWT isn't yet visible to a regular server client.
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
    return { success: false, error: "Authentication failed. Please try again." };
  }

  // Fetch the profile using the fresh access token (bypasses the cookie
  // timing gap where the new session isn't yet visible in request cookies).
  const authedClient = createAuthedClient(session.access_token);

  let { data: profile } = await authedClient
    .from("profiles")
    .select("role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  // Auto-repair: profile row is missing — create it now.
  // Try the authedClient first (works via the self-insert RLS policy from
  // migration 006, no service key required). Fall back to the admin client
  // if available so it can bypass RLS as a last resort.
  if (!profile) {
    const profilePayload = {
      id: user.id,
      email: user.email ?? "",
      full_name: (user.user_metadata?.full_name as string | undefined) ?? "",
      role: "employee" as Role,
      employee_category: null,
    };

    // Attempt 1: authedClient — uses Bearer token, allowed by RLS INSERT policy
    const { data: created } = await authedClient
      .from("profiles")
      .insert(profilePayload)
      .select("role, is_active")
      .maybeSingle();
    profile = created;

    // Attempt 2: admin client (requires SUPABASE_SERVICE_ROLE_KEY)
    if (!profile) {
      try {
        const adminClient = createAdminClient();
        const { data: adminCreated } = await adminClient
          .from("profiles")
          .insert(profilePayload)
          .select("role, is_active")
          .maybeSingle();
        profile = adminCreated;
      } catch {
        // Service role key not configured — fall through to the error below
      }
    }
  }

  if (!profile) {
    return {
      success: false,
      error:
        "Profile not found. Please ask your administrator to set up your account profile.",
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
  revalidatePath("/", "layout");
  redirect(getRoleDashboardPath(role));
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

  // Create the auth user.
  // Pass role and employee_category in metadata so the handle_new_user
  // trigger (migration 007) can write them even without a service key.
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

  // Create the profile row using the admin client to reliably bypass RLS.
  // This ensures "Profile not found" never happens after a successful signup.
  try {
    const adminClient = createAdminClient();
    // Upsert rather than insert because the handle_new_user trigger fires
    // synchronously during auth.signUp() and creates a bare profile row.
    // The upsert overwrites that row with the user-selected role and category.
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
      // Profile insert failed — the auth user was created but the profile
      // wasn't. Delete the dangling auth user to keep state consistent, then
      // return an actionable error.
      await adminClient.auth.admin.deleteUser(user.id);
      return {
        success: false,
        error: "Failed to create account profile. Please contact your administrator.",
      };
    }
  } catch {
    // Service role key not configured — the Supabase trigger on auth.users
    // should handle profile creation in this case. Fall through.
  }

  // Sign the new user in immediately so they land on their dashboard.
  // This fails when Supabase email confirmation is enabled — in that case
  // we return a success message telling them to check their inbox.
  const {
    data: { session },
    error: signInError,
  } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError || !session) {
    return {
      success: true,
      data: undefined,
      message:
        "Account created! Please check your email and click the confirmation link, then sign in.",
    };
  }

  revalidatePath("/", "layout");
  redirect(getRoleDashboardPath(role as Role));
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
