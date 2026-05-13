import { SidebarProvider } from "./sidebar-context";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { DashboardShell } from "./dashboard-shell";
import { ContentContainer } from "./content-container";
import type { UserProfile, Role } from "@/types";

interface DashboardLayoutProps {
  children: React.ReactNode;
  profile: UserProfile | null;
  role: Role;
  title: string;
  description?: string;
}

export function DashboardLayout({
  children,
  profile,
  role,
  title,
  description,
}: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <DashboardShell>
        <Sidebar profile={profile} role={role} />
        <div className="flex flex-col flex-1 min-w-0">
          <Header title={title} description={description} />
          <main className="flex-1 overflow-auto py-4 md:py-6 px-4 md:px-6">
            <ContentContainer>
              {children}
            </ContentContainer>
          </main>
        </div>
      </DashboardShell>
    </SidebarProvider>
  );
}
