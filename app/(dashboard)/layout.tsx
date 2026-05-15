import { redirect } from "next/navigation";
import { getAuthContext } from "@/services/auth.service";
import { SidebarProvider } from "@/components/layout/sidebar-context";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, profile, role } = await getAuthContext();

  if (!user || !profile || !role || profile.is_active === false) {
    redirect("/login");
  }

  return (
    <SidebarProvider>
      <DashboardShell>
        <Sidebar profile={profile} role={role} />
        <div className="flex flex-col flex-1 min-w-0">
          {children}
        </div>
      </DashboardShell>
    </SidebarProvider>
  );
}
