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

  // Use the access_token from the just-completed sign-in as the Authorization
  // header. This avoids the cookie-timing problem (new session tokens land in
  // *response* cookies; the SSR client's getAll() reads *request* cookies)
  // without requiring a service-role key.
  const authedClient = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: { getAll: () => [], setAll: () => {} },
      global: { headers: { Authorization: `Bearer ${session.access_token}` } },
    }
  );

  const { data: profile, error: profileError } = await authedClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    await supabase.auth.signOut();
    return {
      success: false,
      error: "Profile not found. Please contact an administrator.",
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
