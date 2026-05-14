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

  // Use the access_token from signInWithPassword as the Authorization header.
  // This sidesteps the cookie-timing problem (new session tokens land in
  // *response* cookies; the SSR client's getAll() reads *request* cookies).
  const authedClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
      global: { headers: { Authorization: `Bearer ${session.access_token}` } },
    }
  );

  // maybeSingle() returns null instead of throwing when no row is found.
  let { data: profile } = await authedClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  // Auto-create profile if the database trigger didn't fire (e.g. fresh project
  // without migrations applied, or a race condition during first sign-up).
  if (!profile) {
    const { data: created } = await authedClient
      .from("profiles")
      .insert({
        id: user.id,
        email: user.email ?? "",
        full_name: (user.user_metadata?.full_name as string | undefined) ?? "",
        role: "employee",
      })
      .select("role")
      .maybeSingle();

    profile = created;
  }

  if (!profile) {
    return {
      success: false,
      error:
        "Account profile not found. Please ask your administrator to create your profile in the system.",
    };
  }

  const role = profile.role as Role;
  revalidatePath("/", "layout");
  redirect(getRoleDashboardPath(role));
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
