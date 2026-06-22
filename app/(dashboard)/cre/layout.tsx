import { redirect } from "next/navigation";
import { getAuthContext } from "@/services/auth.service";
import { getRoleDashboardPath } from "@/lib/utils";

// Centralizes the role gate for every /cre/* route — CRE and Admin only.
export default async function CreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role } = await getAuthContext();
  if (role !== "cre" && role !== "admin") {
    redirect(getRoleDashboardPath(role ?? "employee"));
  }
  return children;
}
