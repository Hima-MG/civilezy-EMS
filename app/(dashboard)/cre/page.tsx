import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/services/auth.service";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { CreTabs } from "@/components/cre/cre-tabs";
import { unwrap } from "@/lib/supabase/query";
import type { Lead, LeadNote, LeadStatus } from "@/types";

export const metadata: Metadata = { title: "CRE Dashboard" };
export const dynamic = "force-dynamic";

const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  new: "New",
  contacted: "Contacted",
  interested: "Interested",
  follow_up: "Follow-up",
  converted: "Converted",
  lost: "Lost",
};

const ALL_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "interested",
  "follow_up",
  "converted",
  "lost",
];

const PAGE_SIZE = 25;

interface CREDashboardProps {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}

export default async function CREDashboard({ searchParams }: CREDashboardProps) {
  const { supabase, user, profile: userProfile, role } = await getAuthContext();

  if (!user || !userProfile || !role || userProfile.is_active === false) {
    redirect("/login");
  }

  // Role gate is centralized in app/(dashboard)/cre/layout.tsx

  const { page: pageParam, q, status: statusParam } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);
  const search = (q ?? "").trim();
  const statusFilter = statusParam && ALL_STATUSES.includes(statusParam as LeadStatus)
    ? (statusParam as LeadStatus)
    : null;

  const ownershipFilter = `created_by.eq.${user.id},assigned_to.eq.${user.id}`;

  // Pre-aggregated via SQL views (migration 010) instead of fetching every
  // row and reducing in JS — RLS (security_invoker) scopes each view to
  // this CRE's own leads automatically, same as the leads table itself.
  const [statusSummaryResult, monthlySummaryResult] = await Promise.all([
    supabase.from("lead_status_summary").select("status, count"),
    supabase.from("lead_monthly_summary").select("month, count"),
  ]);

  const statusSummary = unwrap(statusSummaryResult, "lead status summary") as { status: string; count: number }[];
  const monthlySummary = unwrap(monthlySummaryResult, "lead monthly summary") as { month: string; count: number }[];

  // Paginated, filtered table query — the only query that scales with the
  // table view rather than the user's total historical lead count.
  let tableQuery = supabase
    .from("leads")
    .select("*", { count: "exact" })
    .or(ownershipFilter);

  if (statusFilter) tableQuery = tableQuery.eq("status", statusFilter);
  if (search) {
    const escaped = search.replace(/[%,]/g, "");
    tableQuery = tableQuery.or(
      `name.ilike.%${escaped}%,phone.ilike.%${escaped}%,course_interest.ilike.%${escaped}%`
    );
  }

  const tableResult = await tableQuery
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const leads = unwrap(tableResult, "leads") as Lead[];
  const totalLeadsMatching = tableResult.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalLeadsMatching / PAGE_SIZE));

  // Follow-up cards (separate tab) need the full follow_up set, not just
  // the current table page — fetch full rows for that status only.
  const followupsResult = await supabase
    .from("leads")
    .select("*")
    .or(ownershipFilter)
    .eq("status", "follow_up")
    .order("created_at", { ascending: false });
  const followupLeads = unwrap(followupsResult, "follow-up leads") as Lead[];

  const leadIds = leads.map((l) => l.id);
  const followupIds = followupLeads.map((l) => l.id);
  const allLeadIdsNeeded = Array.from(new Set([...leadIds, ...followupIds]));

  // Notes only for leads actually rendered on screen (current table page +
  // follow-up cards), not the user's entire lead history.
  const notesResult =
    allLeadIdsNeeded.length > 0
      ? await supabase
          .from("lead_notes")
          .select("*")
          .in("lead_id", allLeadIdsNeeded)
          .order("created_at", { ascending: false })
      : { data: [], error: null };

  const visibleNotes = unwrap(notesResult, "lead notes") as LeadNote[];

  const notesMap: Record<string, LeadNote[]> = {};
  for (const note of visibleNotes) {
    if (!notesMap[note.lead_id]) notesMap[note.lead_id] = [];
    notesMap[note.lead_id].push(note);
  }

  // Activity timeline for the "Notes" tab — RLS already scopes lead_notes
  // to this user's own leads, so this is a cheap bounded query, not a full
  // re-fetch of every note across every lead the rep owns.
  const recentNotesResult = await supabase
    .from("lead_notes")
    .select("*, leads(name)")
    .order("created_at", { ascending: false })
    .limit(30);
  const recentNotes = unwrap(recentNotesResult, "recent notes") as (LeadNote & {
    leads: { name: string } | null;
  })[];

  const notesCountResult = await supabase
    .from("lead_notes")
    .select("*", { count: "exact", head: true });
  if (notesCountResult.error) {
    throw new Error(`Failed to load notes count: ${notesCountResult.error.message}`);
  }
  const totalNotesCount = notesCountResult.count ?? 0;

  // ── Analytics calculations (pre-aggregated by SQL views) ─────────────
  const statusCounts: Record<string, number> = {};
  for (const row of statusSummary) statusCounts[row.status] = row.count;
  const monthCounts: Record<string, number> = {};
  for (const row of monthlySummary) monthCounts[row.month] = row.count;

  const totalLeads = statusSummary.reduce((sum, r) => sum + r.count, 0);
  const convertedLeads = statusCounts["converted"] ?? 0;
  const pendingFollowups = statusCounts["follow_up"] ?? 0;
  const conversionRate =
    totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

  const statusData = ALL_STATUSES.map((status) => ({
    status: LEAD_STATUS_LABELS[status],
    count: statusCounts[status] ?? 0,
  }));
  const statusCountsByStage = Object.fromEntries(
    ALL_STATUSES.map((status) => [status, statusCounts[status] ?? 0])
  ) as Record<LeadStatus, number>;

  // ── Monthly lead creation (last 6 months) ─────────────────
  const now = new Date();
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
    return { month: label, count: monthCounts[yearMonth] ?? 0 };
  });

  return (
    <DashboardLayout
      profile={userProfile}
      role={role}
      title="CRE Dashboard"
      description="Customer Relationship & Sales Overview"
    >
      <CreTabs
        leads={leads}
        followupLeads={followupLeads}
        notesMap={notesMap}
        recentNotes={recentNotes}
        totalNotesCount={totalNotesCount}
        analytics={{ totalLeads, convertedLeads, pendingFollowups, conversionRate }}
        statusData={statusData}
        statusCountsByStage={statusCountsByStage}
        monthlyData={monthlyData}
        profile={userProfile}
        pagination={{ page, totalPages, total: totalLeadsMatching, pageSize: PAGE_SIZE }}
        search={search}
        statusFilter={statusFilter}
      />
    </DashboardLayout>
  );
}
