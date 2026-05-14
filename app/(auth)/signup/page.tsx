import type { Metadata } from "next";
import Link from "next/link";
import { Building2, ShieldCheck } from "lucide-react";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = {
  title: "Create Account",
};

export default function SignupPage() {
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
          <h2 className="text-xl font-semibold">Create your account</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Internal team access only
          </p>
        </div>

        <SignupForm />

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground hover:underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </div>

      {/* Internal-only notice */}
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <p className="text-xs text-muted-foreground">
          This signup is restricted to CivilEzy team members. Admin access must
          be granted by IT after account creation.
        </p>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-6">
        &copy; {new Date().getFullYear()} CivilEzy. All rights reserved.
      </p>
    </div>
  );
}
