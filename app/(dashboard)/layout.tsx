import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role, UserProfile } from "@/types";

export default async function DashboardRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return <>{children}</>;
}
