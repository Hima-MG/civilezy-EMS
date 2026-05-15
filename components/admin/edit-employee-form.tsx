"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Pencil, Loader2, ChevronDown } from "lucide-react";
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
import { updateEmployeeAction } from "@/actions/admin/users";
import type { ActionResult, UserProfile } from "@/types";

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
        <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving…</>
      ) : (
        "Save Changes"
      )}
    </Button>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

interface EditEmployeeFormProps {
  user: UserProfile;
  isCurrentUser: boolean;
}

const initialState: ActionResult<UserProfile> = { success: false, error: "" };

export function EditEmployeeForm({ user, isCurrentUser }: EditEmployeeFormProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  // Bind userId so useActionState only sees (prevState, formData)
  const boundAction = updateEmployeeAction.bind(null, user.id);
  const [state, formAction] = useActionState(boundAction, initialState);

  useEffect(() => {
    if (!open) return;
    if (state.success === false && state.error) {
      toast.error(state.error);
    }
    if (state.success === true) {
      if (state.message) toast.success(state.message);
      setOpen(false);
      startTransition(() => router.refresh());
    }
  }, [state, open, router, startTransition]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
          disabled={isCurrentUser}
          title={isCurrentUser ? "Cannot edit your own account here" : "Edit employee"}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Employee</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="space-y-4 mt-1">
          {/* Full name */}
          <div className="space-y-1.5">
            <Label htmlFor={`ee_name_${user.id}`}>Full Name</Label>
            <Input
              id={`ee_name_${user.id}`}
              name="full_name"
              type="text"
              defaultValue={user.full_name}
              autoComplete="off"
              required
            />
          </div>

          {/* Role */}
          <div className="space-y-1.5">
            <Label htmlFor={`ee_role_${user.id}`}>Role</Label>
            <div className="relative">
              <select
                id={`ee_role_${user.id}`}
                name="role"
                defaultValue={user.role}
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
            <Label htmlFor={`ee_cat_${user.id}`}>
              Employee Category{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <div className="relative">
              <select
                id={`ee_cat_${user.id}`}
                name="employee_category"
                defaultValue={user.employee_category ?? ""}
                className="w-full h-10 appearance-none rounded-md border border-input bg-background pl-3 pr-8 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">— No category —</option>
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-1.5">
            <Label htmlFor={`ee_phone_${user.id}`}>
              Phone{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id={`ee_phone_${user.id}`}
              name="phone"
              type="tel"
              defaultValue={user.phone ?? ""}
              autoComplete="off"
              placeholder="+91 98765 43210"
            />
          </div>

          {/* Department */}
          <div className="space-y-1.5">
            <Label htmlFor={`ee_dept_${user.id}`}>
              Department{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id={`ee_dept_${user.id}`}
              name="department"
              type="text"
              defaultValue={user.department ?? ""}
              autoComplete="off"
              placeholder="Engineering, Sales…"
            />
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
