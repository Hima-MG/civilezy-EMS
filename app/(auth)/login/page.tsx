import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { LoginForm } from "@/components/auth/login-form";
import { getAuthContext } from "@/services/auth.service";
import { getRoleDashboardPath } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Login",
};

export default async function LoginPage() {
  const { profile, role } = await getAuthContext();

  if (profile?.is_active !== false && role) {
    redirect(getRoleDashboardPath(role));
  }

  return (
    <div className="w-full max-w-md">
      {/* Brand */}
      <div className="flex flex-col items-center mb-8">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary mb-4">
          <Building2 className="w-6 h-6 text-primary-foreground" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">CivilEzy EMS</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Enterprise Management System
        </p>
      </div>

      {/* Form card */}
      <div className="rounded-2xl border bg-card p-8 shadow-sm">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Welcome back</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Sign in to your account to continue
          </p>
        </div>

        <LoginForm />
      </div>

      <p className="text-center text-xs text-muted-foreground mt-6">
        &copy; {new Date().getFullYear()} CivilEzy. All rights reserved.
      </p>
    </div>
  );
}
