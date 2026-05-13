import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { WorkReportsView } from "@/components/work-reports/work-reports-view";
import type { EmployeeCategory, Role, UserProfile, WorkReport } from "@/types";

export const metadata: Metadata = { title: "Work Reports" };

export default async function EmployeeWorkReportsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [profileResult, reportsResult] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("work_reports")
      .select("*")
      .eq("user_id", user.id)
      .order("report_date", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);

  if (!profileResult.data) redirect("/login");
  const userProfile = profileResult.data as UserProfile;
  const role = userProfile.role as Role;

  const reports = (reportsResult.data ?? []) as WorkReport[];

  return (
    <DashboardLayout
      profile={userProfile}
      role={role}
      title="Work Reports"
      description="Log and track your daily work"
    >
      <WorkReportsView
        reports={reports}
        employeeCategory={userProfile.employee_category as EmployeeCategory | null}
      />
    </DashboardLayout>
  );
}
