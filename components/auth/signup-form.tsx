"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  Loader2,
  Mail,
  Lock,
  User,
  ChevronDown,
} from "lucide-react";
import { signupAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionResult } from "@/types";

// ── Static options ────────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: "employee", label: "Employee" },
  { value: "cre", label: "CRE (Sales)" },
  { value: "hr_finance", label: "HR & Finance" },
] as const;

const CATEGORY_OPTIONS = [
  { value: "content_creator", label: "Content Creator" },
  { value: "content_manager", label: "Content Manager" },
  { value: "tech_lead", label: "Tech Lead" },
  { value: "digital_marketer", label: "Digital Marketer" },
  { value: "management", label: "Management" },
  { value: "finance", label: "Finance" },
  { value: "sales", label: "Sales" },
] as const;

// ── Sub-components ────────────────────────────────────────────────────────────

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="animate-spin" />
          Creating account…
        </>
      ) : (
        "Create account"
      )}
    </Button>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────

const initialState: ActionResult = { success: false, error: "" };

export function SignupForm() {
  const router = useRouter();
  const [state, formAction] = useActionState(signupAction, initialState);
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<string>("employee");

  useEffect(() => {
    if (state.success === false && state.error) {
      toast.error(state.error);
    }
    if (state.success === true && state.message) {
      toast.success(state.message, { duration: 8000 });
    }
    if (state.success === true && state.redirectTo) {
      router.push(state.redirectTo);
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4">
      {/* Full name */}
      <div className="space-y-2">
        <Label htmlFor="full_name">Full name</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="full_name"
            name="full_name"
            type="text"
            placeholder="Jane Smith"
            className="pl-9"
            autoComplete="name"
            required
          />
        </div>
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="email">Work email</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="you@civilezy.com"
            className="pl-9"
            autoComplete="email"
            required
          />
        </div>
      </div>

      {/* Password */}
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            placeholder="At least 8 characters"
            className="pl-9 pr-9"
            autoComplete="new-password"
            minLength={8}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Role */}
      <div className="space-y-2">
        <Label htmlFor="role">Role</Label>
        <div className="relative">
          <select
            id="role"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full h-10 appearance-none rounded-md border border-input bg-background pl-3 pr-8 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            required
          >
            {ROLE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
        <p className="text-xs text-muted-foreground">
          Admin access is assigned by IT — contact your administrator.
        </p>
      </div>

      {/* Employee category */}
      <div className="space-y-2">
        <Label htmlFor="employee_category">
          Employee category{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </Label>
        <div className="relative">
          <select
            id="employee_category"
            name="employee_category"
            className="w-full h-10 appearance-none rounded-md border border-input bg-background pl-3 pr-8 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="">— Select category —</option>
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>
      </div>

      <SubmitButton />
    </form>
  );
}
