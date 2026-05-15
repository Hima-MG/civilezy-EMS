import { Header } from "./header";
import { ContentContainer } from "./content-container";
import type { UserProfile, Role } from "@/types";

interface DashboardLayoutProps {
  children: React.ReactNode;
  // profile/role kept for call-site compatibility — sidebar now lives in the route layout
  profile?: UserProfile | null;
  role?: Role;
  title: string;
  description?: string;
}

export function DashboardLayout({
  children,
  title,
  description,
}: DashboardLayoutProps) {
  return (
    <>
      <Header title={title} description={description} />
      <main className="flex-1 overflow-auto py-4 md:py-6 px-4 md:px-6">
        <ContentContainer>{children}</ContentContainer>
      </main>
    </>
  );
}
