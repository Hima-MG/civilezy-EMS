import { redirect } from "next/navigation";
import { getAuthContext } from "@/services/auth.service";
import { getRoleDashboardPath } from "@/lib/utils";

// Centralizes the role gate for every /admin/* route. Middleware already
// blocks this at the edge for other roles; this is the server-render
// defense-in-depth layer so a page can never skip the check.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role } = await getAuthContext();
  if (role !== "admin") redirect(getRoleDashboardPath(role ?? "employee"));
  return children;
}
