import type { SupabaseClient } from "@supabase/supabase-js";
import { unwrap } from "@/lib/supabase/query";
import type { UserProfile, WorkReport, WorkReportWithProfile } from "@/types";

export const WORK_REPORTS_PAGE_SIZE = 25;

export interface PaginationMeta {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
}

interface WorkReportFilters {
  page?: number;
  employeeId?: string;
  category?: string;
  status?: string;
  approvalStatus?: string;
  reportDate?: string;
}

/**
 * Shared by the admin and HR work-reports pages — previously each page
 * duplicated this exact query (full table + active profiles) with no
 * pagination, so the page got slower as report volume grew.
 */
export interface WorkReportAggregates {
  totalHours: number;
  uniqueEmployees: number;
}

export async function loadWorkReportsPage(
  supabase: SupabaseClient,
  filters: WorkReportFilters = {}
): Promise<{
  reports: WorkReportWithProfile[];
  pagination: PaginationMeta;
  employees: Pick<UserProfile, "id" | "full_name" | "email" | "employee_category">[];
  aggregates: WorkReportAggregates;
}> {
  const page = Math.max(1, filters.page ?? 1);

  let reportsQuery = supabase.from("work_reports").select("*", { count: "exact" });
  let aggregatesQuery = supabase.from("work_reports").select("user_id, hours_spent");

  if (filters.employeeId) {
    reportsQuery = reportsQuery.eq("user_id", filters.employeeId);
    aggregatesQuery = aggregatesQuery.eq("user_id", filters.employeeId);
  }
  if (filters.category) {
    reportsQuery = reportsQuery.eq("category", filters.category);
    aggregatesQuery = aggregatesQuery.eq("category", filters.category);
  }
  if (filters.status) {
    reportsQuery = reportsQuery.eq("status", filters.status);
    aggregatesQuery = aggregatesQuery.eq("status", filters.status);
  }
  if (filters.approvalStatus) {
    reportsQuery = reportsQuery.eq("approval_status", filters.approvalStatus);
    aggregatesQuery = aggregatesQuery.eq("approval_status", filters.approvalStatus);
  }
  if (filters.reportDate) {
    reportsQuery = reportsQuery.eq("report_date", filters.reportDate);
    aggregatesQuery = aggregatesQuery.eq("report_date", filters.reportDate);
  }

  const [reportsResult, profilesResult, aggregatesResult] = await Promise.all([
    reportsQuery
      .order("report_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range((page - 1) * WORK_REPORTS_PAGE_SIZE, page * WORK_REPORTS_PAGE_SIZE - 1),
    supabase
      .from("profiles")
      .select("id, full_name, email, employee_category")
      .eq("is_active", true)
      .order("full_name"),
    // Narrow-column aggregate over the same filter set (not paginated) so
    // "total hours" / "employees reporting" reflect all matching reports,
    // not just the 25 rows on screen — without re-selecting full rows.
    aggregatesQuery,
  ]);

  const rawReports = unwrap(reportsResult, "work reports") as WorkReport[];
  const employees = unwrap(profilesResult, "profiles") as Pick<
    UserProfile,
    "id" | "full_name" | "email" | "employee_category"
  >[];
  const aggregateRows = unwrap(aggregatesResult, "work report aggregates") as Pick<
    WorkReport,
    "user_id" | "hours_spent"
  >[];

  const profileMap = new Map(employees.map((p) => [p.id, p]));
  const reports: WorkReportWithProfile[] = rawReports.map((r) => ({
    ...r,
    full_name: profileMap.get(r.user_id)?.full_name ?? "Unknown",
    email: profileMap.get(r.user_id)?.email ?? "",
  }));

  const total = reportsResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / WORK_REPORTS_PAGE_SIZE));

  const aggregates: WorkReportAggregates = {
    totalHours: aggregateRows.reduce((sum, r) => sum + r.hours_spent, 0),
    uniqueEmployees: new Set(aggregateRows.map((r) => r.user_id)).size,
  };

  return {
    reports,
    employees,
    aggregates,
    pagination: { page, totalPages, total, pageSize: WORK_REPORTS_PAGE_SIZE },
  };
}
