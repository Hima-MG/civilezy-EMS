import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/services/auth.service";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { unwrap } from "@/lib/supabase/query";
import { StudentsSearch } from "@/components/admin/students-search";
import { EmptyState } from "@/components/ds";
import { Users } from "lucide-react";
import { formatDate } from "@/lib/utils";
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

        <div className="relative rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none" />
          {students.length === 0 ? (
            <EmptyState
              icon={Users}
              title={search ? "No students match your search" : "No students yet"}
              description={search ? undefined : "Students appear here once a course purchase or renewal webhook is processed."}
              variant="inline"
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40">
                    {["Name", "Email", "Phone", "Joined"].map((h) => (
                      <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted/20 text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {students.map((s) => (
                    <tr key={s.id} className="border-b border-border/30 last:border-0 hover:bg-accent/20 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/admin/ezycourse/students/${s.id}`} className="font-medium text-primary hover:underline">
                          {s.full_name || "—"}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{s.email}</td>
                      <td className="px-4 py-3 text-muted-foreground">{s.phone_number || "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(s.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
