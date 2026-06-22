import { redirect } from "next/navigation";
import { getAuthContext } from "@/services/auth.service";
import { getRoleDashboardPath } from "@/lib/utils";

// Centralizes the role gate for every /hr/* route — HR Finance and Admin only.
export default async function HrLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role } = await getAuthContext();
  if (role !== "hr_finance" && role !== "admin") {
    redirect(getRoleDashboardPath(role ?? "employee"));
  }
  return children;
}
