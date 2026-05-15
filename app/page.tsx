import { redirect } from "next/navigation";
import { getAuthContext } from "@/services/auth.service";
import { getRoleDashboardPath } from "@/lib/utils";

export default async function RootPage() {
  const { user, profile, role } = await getAuthContext();

  if (!user || !profile || !role || profile.is_active === false) {
    redirect("/login");
  }

  redirect(getRoleDashboardPath(role));
}
