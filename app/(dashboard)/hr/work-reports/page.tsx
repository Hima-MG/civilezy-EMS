import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AdminWorkReportsView } from "@/components/work-reports/admin-work-reports-view";
import type { Role, UserProfile, WorkReport, WorkReportWithProfile } from "@/types";

export const metadata: Metadata = { title: "Work Reports – HR" };

export default async function HrWorkReportsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [profileResult, reportsResult, profilesResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
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

  if (!profileResult.data) redirect("/login");
  const userProfile = profileResult.data as UserProfile;
  const role = userProfile.role as Role;

  if (role !== "hr_finance" && role !== "admin") redirect("/employee");

  const rawReports = (reportsResult.data ?? []) as WorkReport[];
  const allProfiles = (profilesResult.data ?? []) as Pick<
    UserProfile,
    "id" | "full_name" | "email" | "employee_category"
  >[];

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
