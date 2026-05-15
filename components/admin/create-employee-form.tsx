"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { useTransition } from "react";
import { toast } from "sonner";
import {
  UserPlus, Loader2, Eye, EyeOff, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createEmployeeAction } from "@/actions/admin/users";
import type { ActionResult } from "@/types";

// ── Static options ────────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  { value: "employee",   label: "Employee" },
  { value: "cre",        label: "CRE (Sales)" },
  { value: "hr_finance", label: "HR & Finance" },
  { value: "admin",      label: "Administrator" },
] as const;

const CATEGORY_OPTIONS = [
  { value: "content_creator",  label: "Content Creator" },
  { value: "content_manager",  label: "Content Manager" },
  { value: "tech_lead",        label: "Tech Lead" },
  { value: "digital_marketer", label: "Digital Marketer" },
  { value: "management",       label: "Management" },
  { value: "finance",          label: "Finance" },
  { value: "sales",            label: "Sales" },
] as const;

// ── Submit button ─────────────────────────────────────────────────────────────

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? (
        <><Loader2 className="w-3.5 h-3.5 animate-spin" />Creating…</>
      ) : (
        "Create Account"
      )}
    </Button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const initialState: ActionResult = { success: false, error: "" };

export function CreateEmployeeForm() {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction] = useActionState(createEmployeeAction, initialState);

  useEffect(() => {
    if (state.success === false && state.error) {
      toast.error(state.error);
    }
    if (state.success === true) {
      if (state.message) toast.success(state.message);
      const closeTimer = window.setTimeout(() => setOpen(false), 0);
      startTransition(() => router.refresh());
      return () => window.clearTimeout(closeTimer);
    }
  }, [state, router, startTransition]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <UserPlus className="w-3.5 h-3.5" />
          Create Employee
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create Employee Account</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="space-y-4 mt-1">
          {/* Full name */}
          <div className="space-y-1.5">
            <Label htmlFor="ce_full_name">Full Name</Label>
            <Input
              id="ce_full_name"
              name="full_name"
              type="text"
              placeholder="Jane Smith"
              autoComplete="off"
              required
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="ce_email">Work Email</Label>
            <Input
              id="ce_email"
              name="email"
              type="email"
              placeholder="jane@civilezy.com"
              autoComplete="off"
              required
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <Label htmlFor="ce_password">Temporary Password</Label>
            <div className="relative">
              <Input
                id="ce_password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                minLength={8}
                className="pr-9"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Employee should change this after first login.
            </p>
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <Label htmlFor="ce_role">Role</Label>
            <div className="relative">
              <select
                id="ce_role"
                name="role"
                defaultValue="employee"
                className="w-full h-10 appearance-none rounded-md border border-input bg-background pl-3 pr-8 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
          </div>

          {/* Employee category */}
          <div className="space-y-1.5">
            <Label htmlFor="ce_category">
              Employee Category{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <div className="relative">
              <select
                id="ce_category"
                name="employee_category"
                className="w-full h-10 appearance-none rounded-md border border-input bg-background pl-3 pr-8 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <SubmitButton />
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
