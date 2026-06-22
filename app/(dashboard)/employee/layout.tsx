import { redirect } from "next/navigation";
import { getAuthContext } from "@/services/auth.service";

// Centralizes the role gate for every /employee/* route — every active role
// except CRE has employee-area access (Admin, HR Finance, Employee).
export default async function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { role } = await getAuthContext();
  if (role === "cre") redirect("/cre");
  return children;
}
