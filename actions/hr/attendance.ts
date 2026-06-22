"use server";

import { createClient } from "@/lib/supabase/server";
import type { ActionResult, AttendanceRecord, AttendanceWithProfile, UserProfile } from "@/types";

// Supabase's filter-builder generics make a precisely-typed "apply these
// filters conditionally" helper impractical; narrowed to `any` here only,
// the public functions below remain fully typed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyAttendanceQuery = any;

const PAGE_SIZE = 25;

export interface AttendanceFilters {
  page?: number;
  employeeId?: string;
  month?: string; // "YYYY-MM" or "all"
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

export interface AttendancePageResult {
  records: AttendanceWithProfile[];
  total: number;
  page: number;
  totalPages: number;
  totalHours: number;
  presentCount: number;
  absentCount: number;
}

async function assertHrOrAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase: null, error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !["hr_finance", "admin"].includes(profile.role)) {
    return { supabase: null, error: "Access denied" };
  }
  return { supabase, error: null };
}

async function resolveMatchingUserIds(
  supabase: NonNullable<Awaited<ReturnType<typeof assertHrOrAdmin>>["supabase"]>,
  search: string
): Promise<string[]> {
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .ilike("full_name", `%${search}%`);
  return (data ?? []).map((p: { id: string }) => p.id);
}

function applyAttendanceFilters(
  query: AnyAttendanceQuery,
  filters: AttendanceFilters,
  matchingUserIds: string[] | null
): AnyAttendanceQuery {
  let q = query;
  if (filters.employeeId) q = q.eq("user_id", filters.employeeId);
  if (filters.month && filters.month !== "all") {
    q = q.gte("attendance_date", `${filters.month}-01`).lt(
      "attendance_date",
      `${filters.month.slice(0, 4)}-${String(Number(filters.month.slice(5, 7)) + 1).padStart(2, "0")}-01`
    );
  }
  if (filters.dateFrom) q = q.gte("attendance_date", filters.dateFrom);
  if (filters.dateTo) q = q.lte("attendance_date", filters.dateTo);
  if (matchingUserIds) q = q.in("user_id", matchingUserIds.length > 0 ? matchingUserIds : ["__none__"]);
  return q;
}

export async function getAttendancePageAction(
  filters: AttendanceFilters
): Promise<ActionResult<AttendancePageResult>> {
  const { supabase, error } = await assertHrOrAdmin();
  if (error || !supabase) return { success: false, error: error ?? "Access denied" };

  const page = Math.max(1, filters.page ?? 1);
  const search = filters.search?.trim();
  const matchingUserIds = search ? await resolveMatchingUserIds(supabase, search) : null;

  const recordsQuery = applyAttendanceFilters(
    supabase.from("attendance").select("*", { count: "exact" }),
    filters,
    matchingUserIds
  )
    .order("attendance_date", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const aggregateQuery = applyAttendanceFilters(
    supabase.from("attendance").select("user_id, total_hours, status"),
    filters,
    matchingUserIds
  );

  const [recordsResult, aggregateResult] = await Promise.all([recordsQuery, aggregateQuery]);

  if (recordsResult.error) return { success: false, error: recordsResult.error.message };
  if (aggregateResult.error) return { success: false, error: aggregateResult.error.message };

  const rawRecords = (recordsResult.data ?? []) as AttendanceRecord[];
  const userIds = Array.from(new Set(rawRecords.map((r) => r.user_id)));

  const { data: profilesData } = userIds.length > 0
    ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds)
    : { data: [] };

  const profileMap = new Map(
    ((profilesData ?? []) as Pick<UserProfile, "id" | "full_name" | "email">[]).map((p) => [p.id, p])
  );

  const records: AttendanceWithProfile[] = rawRecords.map((r) => ({
    ...r,
    full_name: profileMap.get(r.user_id)?.full_name ?? "Unknown",
    email: profileMap.get(r.user_id)?.email ?? "",
  }));

  const aggregateRows = (aggregateResult.data ?? []) as Pick<AttendanceRecord, "user_id" | "total_hours" | "status">[];
  const total = recordsResult.count ?? 0;

  return {
    success: true,
    data: {
      records,
      total,
      page,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      totalHours: aggregateRows.reduce((sum, r) => sum + (r.total_hours ?? 0), 0),
      presentCount: aggregateRows.filter((r) => r.status === "present").length,
      absentCount: aggregateRows.filter((r) => r.status === "absent").length,
    },
  };
}

export async function exportAttendanceAction(
  filters: AttendanceFilters
): Promise<ActionResult<AttendanceWithProfile[]>> {
  const { supabase, error } = await assertHrOrAdmin();
  if (error || !supabase) return { success: false, error: error ?? "Access denied" };

  const search = filters.search?.trim();
  const matchingUserIds = search ? await resolveMatchingUserIds(supabase, search) : null;

  const { data, error: dbError } = await applyAttendanceFilters(
    supabase.from("attendance").select("*"),
    filters,
    matchingUserIds
  ).order("attendance_date", { ascending: false });

  if (dbError) return { success: false, error: dbError.message };

  const rawRecords = (data ?? []) as AttendanceRecord[];
  const userIds = Array.from(new Set(rawRecords.map((r) => r.user_id)));

  const { data: profilesData } = userIds.length > 0
    ? await supabase.from("profiles").select("id, full_name, email").in("id", userIds)
    : { data: [] };

  const profileMap = new Map(
    ((profilesData ?? []) as Pick<UserProfile, "id" | "full_name" | "email">[]).map((p) => [p.id, p])
  );

  const records: AttendanceWithProfile[] = rawRecords.map((r) => ({
    ...r,
    full_name: profileMap.get(r.user_id)?.full_name ?? "Unknown",
    email: profileMap.get(r.user_id)?.email ?? "",
  }));

  return { success: true, data: records };
}
