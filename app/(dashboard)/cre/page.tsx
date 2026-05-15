import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/services/auth.service";
import { getRoleDashboardPath } from "@/lib/utils";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { CreTabs } from "@/components/cre/cre-tabs";
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

export default async function CREDashboard() {
  const { supabase, user, profile: userProfile, role } = await getAuthContext();

  if (!user || !userProfile || !role || userProfile.is_active === false) {
    redirect("/login");
  }

  if (role !== "cre" && role !== "admin") redirect(getRoleDashboardPath(role));

  const leadsResult =
    await supabase
      .from("leads")
      .select("*")
      .or(`created_by.eq.${user.id},assigned_to.eq.${user.id}`)
      .order("created_at", { ascending: false });

  const leads = (leadsResult.data ?? []) as Lead[];
  const leadIds = leads.map((l) => l.id);

  // Fetch all notes for the current user's leads in one query
  const notesResult =
    leadIds.length > 0
      ? await supabase
          .from("lead_notes")
          .select("*")
          .in("lead_id", leadIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  const allNotes = (notesResult.data ?? []) as LeadNote[];

  // Build notesMap: Record<lead_id, LeadNote[]>
  const notesMap: Record<string, LeadNote[]> = {};
  for (const note of allNotes) {
    if (!notesMap[note.lead_id]) notesMap[note.lead_id] = [];
    notesMap[note.lead_id].push(note);
  }

  // ── Analytics calculations ─────────────────────────────────
  const totalLeads = leads.length;
  const convertedLeads = leads.filter((l) => l.status === "converted").length;
  const pendingFollowups = leads.filter((l) => l.status === "follow_up").length;
  const conversionRate =
    totalLeads > 0 ? Math.round((convertedLeads / totalLeads) * 100) : 0;

  // ── Status distribution for chart ─────────────────────────
  const statusData = ALL_STATUSES.map((status) => ({
    status: LEAD_STATUS_LABELS[status],
    count: leads.filter((l) => l.status === status).length,
  }));

  // ── Monthly lead creation (last 6 months) ─────────────────
  const now = new Date();
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
    const yearMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const label = d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
    return {
      month: label,
      count: leads.filter((l) => l.created_at.startsWith(yearMonth)).length,
    };
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
        notesMap={notesMap}
        allNotes={allNotes}
        analytics={{ totalLeads, convertedLeads, pendingFollowups, conversionRate }}
        statusData={statusData}
        monthlyData={monthlyData}
        profile={userProfile}
      />
    </DashboardLayout>
  );
}
