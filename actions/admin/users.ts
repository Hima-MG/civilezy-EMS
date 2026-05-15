"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import type { ActionResult, Role, UserProfile, EmployeeCategory } from "@/types";

// ── Auth guard ────────────────────────────────────────────────────────────────

async function assertAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" as const };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || profile.role !== "admin") return { error: "Access denied" as const };
  return { error: null, userId: user.id };
}

// ── Create employee ───────────────────────────────────────────────────────────

const createEmployeeSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["employee", "cre", "hr_finance", "admin"]),
  employee_category: z.string().nullable().optional(),
});

export async function createEmployeeAction(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const { error: authError } = await assertAdmin();
  if (authError) return { success: false, error: authError };

  const raw = {
    full_name: (formData.get("full_name") as string)?.trim(),
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    role: formData.get("role") as string,
    employee_category: (formData.get("employee_category") as string) || null,
  };

  const parsed = createEmployeeSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { full_name, email, password, role, employee_category } = parsed.data;

  let adminClient: ReturnType<typeof createAdminClient>;
  try {
    adminClient = createAdminClient();
  } catch {
    return {
      success: false,
      error: "Admin client unavailable. Set SUPABASE_SERVICE_ROLE_KEY in environment variables.",
    };
  }

  // Create the Supabase auth user with email already confirmed — no verification email.
  const {
    data: { user },
    error: createError,
  } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role, employee_category: employee_category ?? null },
  });

  if (createError) return { success: false, error: createError.message };
  if (!user) return { success: false, error: "Failed to create user account." };

  // Create the profile row immediately.
  const { error: profileError } = await adminClient.from("profiles").upsert(
    {
      id: user.id,
      email,
      full_name,
      role: role as Role,
      employee_category: (employee_category as EmployeeCategory) ?? null,
      is_active: true,
    },
    { onConflict: "id" }
  );

  if (profileError) {
    // Roll back the auth user so there's no orphan account.
    await adminClient.auth.admin.deleteUser(user.id);
    return { success: false, error: profileError.message };
  }

  revalidatePath("/admin");
  return { success: true, data: undefined, message: `Account created for ${full_name}.` };
}

// ── Update employee ───────────────────────────────────────────────────────────

const updateEmployeeSchema = z.object({
  full_name: z.string().min(2, "Name must be at least 2 characters").max(80),
  role: z.enum(["employee", "cre", "hr_finance", "admin"]),
  employee_category: z.string().nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  department: z.string().max(80).nullable().optional(),
});

export async function updateEmployeeAction(
  userId: string,
  _prevState: ActionResult<UserProfile>,
  formData: FormData
): Promise<ActionResult<UserProfile>> {
  const { error: authError } = await assertAdmin();
  if (authError) return { success: false, error: authError };

  const raw = {
    full_name: (formData.get("full_name") as string)?.trim(),
    role: formData.get("role") as string,
    employee_category: (formData.get("employee_category") as string) || null,
    phone: (formData.get("phone") as string)?.trim() || null,
    department: (formData.get("department") as string)?.trim() || null,
  };

  const parsed = updateEmployeeSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      role: parsed.data.role as Role,
      employee_category: (parsed.data.employee_category as EmployeeCategory) ?? null,
      phone: parsed.data.phone ?? null,
      department: parsed.data.department ?? null,
    })
    .eq("id", userId)
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  revalidatePath("/admin");
  return { success: true, data: data as UserProfile, message: "Employee updated." };
}

// ── Update role ───────────────────────────────────────────────────────────────

export async function updateUserRoleAction(
  userId: string,
  newRole: Role
): Promise<ActionResult<UserProfile>> {
  const { error, userId: currentUserId } = await assertAdmin();
  if (error) return { success: false, error };

  if (userId === currentUserId) {
    return { success: false, error: "Cannot change your own role" };
  }

  const supabase = await createClient();
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

// ── Toggle active status ──────────────────────────────────────────────────────

export async function toggleEmployeeActiveAction(
  userId: string,
  isActive: boolean
): Promise<ActionResult> {
  const { error: authError, userId: currentUserId } = await assertAdmin();
  if (authError) return { success: false, error: authError };

  if (userId === currentUserId) {
    return { success: false, error: "Cannot change your own account status" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: isActive })
    .eq("id", userId);

  if (error) return { success: false, error: error.message };

  // When deactivating, force-sign-out all active sessions for this user.
  if (!isActive) {
    try {
      const adminClient = createAdminClient();
      await adminClient.auth.admin.signOut(userId);
    } catch {
      // Non-critical — profile is already deactivated; sessions expire naturally.
    }
  }

  revalidatePath("/admin");
  return { success: true, data: undefined };
}

// ── Delete employee ───────────────────────────────────────────────────────────

export async function deleteEmployeeAction(userId: string): Promise<ActionResult> {
  const { error: authError, userId: currentUserId } = await assertAdmin();
  if (authError) return { success: false, error: authError };

  if (userId === currentUserId) {
    return { success: false, error: "Cannot delete your own account" };
  }

  let adminClient: ReturnType<typeof createAdminClient>;
  try {
    adminClient = createAdminClient();
  } catch {
    return { success: false, error: "Admin client unavailable. Set SUPABASE_SERVICE_ROLE_KEY." };
  }

  // Deleting the auth user cascades to the profiles row via DB FK / trigger.
  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error) return { success: false, error: error.message };

  revalidatePath("/admin");
  return { success: true, data: undefined };
}
