import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/services/auth.service";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { AdminWorkReportsView } from "@/components/work-reports/admin-work-reports-view";
import { loadWorkReportsPage } from "@/lib/queries/work-reports";

export const metadata: Metadata = { title: "Work Reports – HR" };
export const dynamic = "force-dynamic";

interface HrWorkReportsPageProps {
  searchParams: Promise<{
    page?: string;
    employee?: string;
    category?: string;
    status?: string;
    approval?: string;
    date?: string;
  }>;
}

export default async function HrWorkReportsPage({ searchParams }: HrWorkReportsPageProps) {
  const { supabase, user, profile: userProfile, role } = await getAuthContext();

  if (!user || !userProfile || !role || userProfile.is_active === false) {
    redirect("/login");
  }

  // Role gate is centralized in app/(dashboard)/hr/layout.tsx

  const params = await searchParams;
  const { reports, pagination, employees, aggregates } = await loadWorkReportsPage(supabase, {
    page: params.page ? parseInt(params.page, 10) : 1,
    employeeId: params.employee,
    category: params.category,
    status: params.status,
    approvalStatus: params.approval,
    reportDate: params.date,
  });

  return (
    <DashboardLayout
      profile={userProfile}
      role={role}
      title="Work Reports"
      description="All employee work reports"
    >
      <AdminWorkReportsView
        reports={reports}
        employees={employees}
        pagination={pagination}
        aggregates={aggregates}
        filters={{
          employee: params.employee ?? "all",
          category: params.category ?? "all",
          status: params.status ?? "all",
          approval: params.approval ?? "all",
          date: params.date ?? "",
        }}
      />
    </DashboardLayout>
  );
}
