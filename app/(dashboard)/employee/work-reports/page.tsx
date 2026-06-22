import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/services/auth.service";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { WorkReportsView } from "@/components/work-reports/work-reports-view";
import { unwrap } from "@/lib/supabase/query";
import type { EmployeeCategory, WorkReport } from "@/types";

export const metadata: Metadata = { title: "Work Reports" };
export const dynamic = "force-dynamic";

export default async function EmployeeWorkReportsPage() {
  const { supabase, user, profile: userProfile, role } = await getAuthContext();

  if (!user || !userProfile || !role || userProfile.is_active === false) {
    redirect("/login");
  }

  const reportsResult = await
    supabase
      .from("work_reports")
      .select("*")
      .eq("user_id", user.id)
      .order("report_date", { ascending: false })
      .order("created_at", { ascending: false });

  const reports = unwrap(reportsResult, "work reports") as WorkReport[];

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
