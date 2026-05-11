import { Sidebar } from "./sidebar";
import { Header } from "./header";
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
    <div className="flex min-h-screen">
      <Sidebar profile={profile} role={role} />
      <div className="flex flex-col flex-1 min-w-0">
        <Header title={title} description={description} />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
