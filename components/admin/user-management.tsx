"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ds";
import { EmptyState } from "@/components/ds";
import { cn } from "@/lib/utils";
import { updateUserRoleAction } from "@/actions/admin/users";
import { CreateEmployeeForm } from "./create-employee-form";
import type { UserProfile, Role } from "@/types";
import type { StatusVariant } from "@/components/ds";

const ROLES: Role[] = ["employee", "cre", "hr_finance", "admin"];

const ROLE_CONFIG: Record<Role, { label: string; variant: StatusVariant }> = {
  employee:   { label: "Employee",   variant: "info" },
  cre:        { label: "CRE",        variant: "violet" },
  hr_finance: { label: "HR Finance", variant: "success" },
  admin:      { label: "Admin",      variant: "pending" },
};

interface UserManagementProps {
  users: UserProfile[];
  currentUserId: string;
}

export function UserManagement({ users, currentUserId }: UserManagementProps) {
  const [search,      setSearch]      = useState("");
  const [roleFilter,  setRoleFilter]  = useState<Role | "all">("all");
  const [updatingId,  setUpdatingId]  = useState<string | null>(null);
  const [isPending,   startTransition] = useTransition();

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch = (u.full_name ?? "").toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchRole   = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  function handleRoleChange(userId: string, newRole: Role) {
    setUpdatingId(userId);
    startTransition(async () => {
      const result = await updateUserRoleAction(userId, newRole);
      setUpdatingId(null);
      if (result.success) toast.success("Role updated.");
      else toast.error(result.error);
    });
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8.5 h-9 bg-muted/40 border-border/60 rounded-xl focus-visible:ring-0 focus-visible:border-border text-sm"
          />
        </div>
        <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as Role | "all")}>
          <SelectTrigger className="w-40 h-9 shrink-0 bg-muted/40 border-border/60 rounded-xl focus:ring-0">
            <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground shrink-0" />
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {ROLES.map((r) => <SelectItem key={r} value={r}>{ROLE_CONFIG[r].label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-3 sm:ml-auto shrink-0">
          <p className="text-xs text-muted-foreground">
            {filtered.length} of {users.length} users
          </p>
          <CreateEmployeeForm />
        </div>
      </div>

      {/* Table */}
      <div className="relative rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none z-10" />

        {filtered.length === 0 ? (
          <EmptyState icon={Search} title="No users match your search" variant="inline" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40">
                  {[
                    { label: "Name",        cls: "" },
                    { label: "Email",       cls: "hidden sm:table-cell" },
                    { label: "Role",        cls: "" },
                    { label: "Change Role", cls: "" },
                    { label: "Joined",      cls: "hidden md:table-cell" },
                  ].map(({ label, cls }) => (
                    <th key={label} className={cn(
                      "px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted/20 text-left",
                      cls
                    )}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => {
                  const cfg = ROLE_CONFIG[user.role];
                  const isCurrentUser = user.id === currentUserId;
                  const isUpdating    = updatingId === user.id;

                  return (
                    <tr key={user.id} className="border-b border-border/30 last:border-0 hover:bg-accent/20 transition-colors duration-100">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-[11px] font-semibold text-primary">
                              {(user.full_name || user.email).charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-foreground leading-none">{user.full_name || "—"}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 sm:hidden">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-xs text-muted-foreground">{user.email}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={cfg.variant} label={cfg.label} size="sm" />
                      </td>
                      <td className="px-4 py-3">
                        {isCurrentUser ? (
                          <span className="text-xs text-muted-foreground italic">You</span>
                        ) : isUpdating ? (
                          <span className="inline-block h-7 w-28 rounded-lg bg-muted animate-pulse" />
                        ) : (
                          <Select value={user.role} onValueChange={(v) => handleRoleChange(user.id, v as Role)} disabled={isPending}>
                            <SelectTrigger className="h-7 w-32 text-xs rounded-lg border-border/60">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map((r) => (
                                <SelectItem key={r} value={r} className="text-xs">{ROLE_CONFIG[r].label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "2-digit" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-border/40 bg-muted/10">
            <p className="text-xs text-muted-foreground">{filtered.length} user{filtered.length !== 1 ? "s" : ""}</p>
          </div>
        )}
      </div>
    </div>
  );
}
