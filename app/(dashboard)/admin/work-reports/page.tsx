import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/services/auth.service";
import { getRoleDashboardPath } from "@/lib/utils";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AdminWorkReportsView } from "@/components/work-reports/admin-work-reports-view";
import type { UserProfile, WorkReport, WorkReportWithProfile } from "@/types";

export const metadata: Metadata = { title: "Work Reports – Admin" };
export const dynamic = "force-dynamic";

export default async function AdminWorkReportsPage() {
  const { supabase, user, profile: userProfile, role } = await getAuthContext();

  if (!user || !userProfile || !role || userProfile.is_active === false) {
    redirect("/login");
  }

  if (role !== "admin") redirect(getRoleDashboardPath(role));

  const [reportsResult, profilesResult] = await Promise.all([
    supabase
      .from("work_reports")
      .select("*")
      .order("report_date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name, email, employee_category")
      .eq("is_active", true)
      .order("full_name"),
  ]);

  const rawReports = (reportsResult.data ?? []) as WorkReport[];
  const allProfiles = (profilesResult.data ?? []) as Pick<
    UserProfile,
    "id" | "full_name" | "email" | "employee_category"
  >[];

  // Merge profile info into reports
  const profileMap = new Map(allProfiles.map((p) => [p.id, p]));
  const reports: WorkReportWithProfile[] = rawReports.map((r) => ({
    ...r,
    full_name: profileMap.get(r.user_id)?.full_name ?? "Unknown",
    email: profileMap.get(r.user_id)?.email ?? "",
  }));

  return (
    <DashboardLayout
      profile={userProfile}
      role={role}
      title="Work Reports"
      description="All employee work reports"
    >
      <AdminWorkReportsView reports={reports} employees={allProfiles} />
    </DashboardLayout>
  );
}
