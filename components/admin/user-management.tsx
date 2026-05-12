"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { updateUserRoleAction } from "@/actions/admin/users";
import type { UserProfile, Role } from "@/types";

const ROLES: Role[] = ["employee", "cre", "hr_finance", "admin"];

const ROLE_BADGE: Record<Role, { label: string; className: string }> = {
  employee: {
    label: "Employee",
    className:
      "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
  },
  cre: {
    label: "CRE",
    className:
      "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400",
  },
  hr_finance: {
    label: "HR Finance",
    className:
      "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  admin: {
    label: "Admin",
    className:
      "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400",
  },
};

interface UserManagementProps {
  users: UserProfile[];
  currentUserId: string;
}

export function UserManagement({ users, currentUserId }: UserManagementProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    const matchSearch =
      (u.full_name ?? "").toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q);
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  function handleRoleChange(userId: string, newRole: Role) {
    setUpdatingId(userId);
    startTransition(async () => {
      const result = await updateUserRoleAction(userId, newRole);
      setUpdatingId(null);
      if (result.success) {
        toast.success("Role updated successfully");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">User Management</CardTitle>
          <span className="text-xs text-muted-foreground">
            {filtered.length} of {users.length} users
          </span>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 mt-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
          </div>
          <Select
            value={roleFilter}
            onValueChange={(v) => setRoleFilter(v as Role | "all")}
          >
            <SelectTrigger className="w-full sm:w-36 h-8 text-sm">
              <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Filter role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {ROLES.map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_BADGE[r].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            No users match your search.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="text-left font-medium text-muted-foreground px-4 py-2.5">
                    Name
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-2.5 hidden sm:table-cell">
                    Email
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-2.5">
                    Current Role
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-2.5">
                    Change Role
                  </th>
                  <th className="text-left font-medium text-muted-foreground px-4 py-2.5 hidden md:table-cell">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => {
                  const badge = ROLE_BADGE[user.role];
                  const isCurrentUser = user.id === currentUserId;
                  const isUpdating = updatingId === user.id;

                  return (
                    <tr
                      key={user.id}
                      className="border-b last:border-0 hover:bg-muted/20 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium truncate max-w-[140px]">
                          {user.full_name || "—"}
                        </div>
                        <div className="text-xs text-muted-foreground sm:hidden truncate max-w-[140px]">
                          {user.email}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="text-muted-foreground text-xs truncate max-w-[200px] block">
                          {user.email}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={`text-xs ${badge.className}`}
                        >
                          {badge.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {isCurrentUser ? (
                          <span className="text-xs text-muted-foreground italic">
                            You
                          </span>
                        ) : isUpdating ? (
                          <span className="inline-block h-7 w-28 rounded bg-muted animate-pulse" />
                        ) : (
                          <Select
                            value={user.role}
                            onValueChange={(v) =>
                              handleRoleChange(user.id, v as Role)
                            }
                            disabled={isPending}
                          >
                            <SelectTrigger className="h-7 w-28 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLES.map((r) => (
                                <SelectItem
                                  key={r}
                                  value={r}
                                  className="text-xs"
                                >
                                  {ROLE_BADGE[r].label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-xs text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
