import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/services/auth.service";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { unwrap } from "@/lib/supabase/query";
import { StudentsSearch } from "@/components/admin/students-search";
import { StudentsTable } from "@/components/admin/students-table";
import type { Student } from "@/types";

export const metadata: Metadata = { title: "EzyCourse Students" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

interface StudentsPageProps {
  searchParams: Promise<{ page?: string; q?: string }>;
}

export default async function StudentsPage({ searchParams }: StudentsPageProps) {
  const { supabase, user, profile: userProfile, role } = await getAuthContext();

  if (!user || !userProfile || !role || userProfile.is_active === false) {
    redirect("/login");
  }

  // Role gate is centralized in app/(dashboard)/admin/layout.tsx

  const { page: pageParam, q } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const search = (q ?? "").trim();

  let query = supabase.from("students").select("*", { count: "exact" });
  if (search) {
    const escaped = search.replace(/[%,]/g, "");
    query = query.or(`email.ilike.%${escaped}%,full_name.ilike.%${escaped}%`);
  }

  const result = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const students = unwrap(result, "students") as Student[];
  const total = result.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <DashboardLayout
      profile={userProfile}
      role={role}
      title="EzyCourse Students"
      description="Synced from purchase and renewal webhooks"
    >
      <div className="space-y-4">
        <StudentsSearch search={search} pagination={{ page, totalPages, total, pageSize: PAGE_SIZE }} />
        <StudentsTable students={students} search={search} />
      </div>
    </DashboardLayout>
  );
}
