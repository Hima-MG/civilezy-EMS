import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Role } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getRoleDashboardPath(role: Role): string {
  const paths: Record<Role, string> = {
    employee: "/employee",
    cre: "/cre",
    hr_finance: "/hr",
    admin: "/admin",
  };
  return paths[role] ?? "/employee";
}

export function getRoleLabel(role: Role): string {
  const labels: Record<Role, string> = {
    employee: "Employee",
    cre: "CRE",
    hr_finance: "HR & Finance",
    admin: "Administrator",
  };
  return labels[role] ?? role;
}

export function getRoleBadgeVariant(
  role: Role
): "default" | "secondary" | "outline" | "destructive" {
  const variants: Record<
    Role,
    "default" | "secondary" | "outline" | "destructive"
  > = {
    employee: "secondary",
    cre: "outline",
    hr_finance: "default",
    admin: "destructive",
  };
  return variants[role] ?? "secondary";
}

export function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(dateStr));
}

export function formatCurrency(amount: number, currency = "INR"): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
