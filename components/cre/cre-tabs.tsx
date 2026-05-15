"use client";

import {
  Users, Target, TrendingUp, PhoneCall, User, Mail,
  Phone, Building2, Briefcase, CalendarDays,
  ArrowRight, MessageSquare,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  KpiCard, HeroCard, ActivityFeed, EmptyState, StatusBadge,
} from "@/components/ds";
import type { ActivityItem } from "@/components/ds";
import { LeadsTable } from "./leads-table";
import { LeadStatusBadge, LEAD_STATUS_CONFIG } from "./lead-status-badge";
import { LeadNotesDialog } from "./lead-notes-dialog";
import { StatusChart } from "./status-chart";
import { MonthlyChart } from "./monthly-chart";
import { cn } from "@/lib/utils";
import { useUrlTab } from "@/hooks/use-url-tab";
import type { Lead, LeadNote, LeadStatus, UserProfile, EmployeeCategory } from "@/types";

// ── Constants ─────────────────────────────────────────────────

const PIPELINE_STAGES: LeadStatus[] = [
  "new", "contacted", "interested", "follow_up", "converted", "lost",
];

const VALID_TABS = ["overview", "leads", "followups", "notes", "analytics", "profile"] as const;

const CATEGORY_LABEL: Record<EmployeeCategory, string> = {
  content_creator:  "Content Creator",
  content_manager:  "Content Manager",
  tech_lead:        "Tech Lead",
  digital_marketer: "Digital Marketer",
  management:       "Management",
  finance:          "Finance",
  sales:            "Sales",
};

// ── Helpers ───────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60)   return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24)   return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7)    return `${days}d ago`;
  return fmtDate(iso);
}

// ── Section label ─────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
      {children}
    </p>
  );
}

// ── Pipeline strip ────────────────────────────────────────────

function PipelineStrip({ leads }: { leads: Lead[] }) {
  const total = leads.length;

  return (
    <div className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none" />

      <div className="px-5 pt-4 pb-1">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
          Pipeline
        </p>
      </div>

      <div className="flex divide-x divide-border/40 overflow-x-auto">
        {PIPELINE_STAGES.map((stage) => {
          const cfg   = LEAD_STATUS_CONFIG[stage];
          const count = leads.filter((l) => l.status === stage).length;
          const pct   = total > 0 ? Math.round((count / total) * 100) : 0;

          return (
            <div key={stage} className="flex-1 min-w-[80px] px-4 py-3 group">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className={cn("w-2 h-2 rounded-full shrink-0", cfg.dot)} />
                <p className={cn("text-[10px] font-semibold uppercase tracking-wider", cfg.text)}>
                  {cfg.label}
                </p>
              </div>
              <p className="text-xl font-bold tracking-tight">{count}</p>
              <p className="text-[10px] text-muted-foreground/60 mt-0.5">{pct}%</p>
              {/* micro bar */}
              <div className="mt-2 h-0.5 bg-border/40 rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", cfg.dot)}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Follow-up card ────────────────────────────────────────────

function FollowupCard({ lead, notes }: { lead: Lead; notes: LeadNote[] }) {
  const lastNote = notes[0];

  return (
    <LeadNotesDialog lead={lead} initialNotes={notes}>
      <div className="group relative rounded-2xl border border-border/60 bg-card hover:border-border hover:shadow-md shadow-sm transition-all duration-150 p-4 cursor-pointer text-left w-full">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none rounded-t-2xl" />

        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-foreground truncate">{lead.name}</p>
              <LeadStatusBadge status={lead.status} size="sm" />
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="font-mono">{lead.phone}</span>
              {lead.course_interest && (
                <>
                  <span className="text-border">·</span>
                  <span className="truncate max-w-[160px]">{lead.course_interest}</span>
                </>
              )}
            </div>
            {lastNote ? (
              <p className="text-xs text-muted-foreground/80 mt-2 line-clamp-2 leading-relaxed border-l-2 border-border/60 pl-2.5">
                {lastNote.note}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground/50 mt-2 italic">No notes yet</p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {notes.length > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium bg-primary/10 text-primary rounded-full px-2 py-0.5">
                <MessageSquare className="w-3 h-3" />
                {notes.length}
              </span>
            )}
            <p className="text-[10px] text-muted-foreground">
              {fmtDate(lead.created_at)}
            </p>
            <ArrowRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
          </div>
        </div>
      </div>
    </LeadNotesDialog>
  );
}

// ── Props ─────────────────────────────────────────────────────

interface Analytics {
  totalLeads: number;
  convertedLeads: number;
  pendingFollowups: number;
  conversionRate: number;
}

interface StatusDataPoint  { status: string; count: number }
interface MonthlyDataPoint { month: string;  count: number }

interface CreTabsProps {
  leads: Lead[];
  notesMap: Record<string, LeadNote[]>;
  allNotes: LeadNote[];
  analytics: Analytics;
  statusData: StatusDataPoint[];
  monthlyData: MonthlyDataPoint[];
  profile: UserProfile;
}

// ── Main component ────────────────────────────────────────────

export function CreTabs({
  leads,
  notesMap,
  allNotes,
  analytics,
  statusData,
  monthlyData,
  profile,
}: CreTabsProps) {
  const [activeTab, setActiveTab] = useUrlTab(VALID_TABS, "overview");
  const followupLeads = leads.filter((l) => l.status === "follow_up");

  // Lead lookup map for notes timeline
  const leadMap = Object.fromEntries(leads.map((l) => [l.id, l]));

  // Build activity items from allNotes
  const noteActivities: ActivityItem[] = allNotes.slice(0, 30).map((n) => {
    const lead = leadMap[n.lead_id];
    return {
      id:          n.id,
      title:       lead?.name ?? `Lead ${n.lead_id.slice(0, 6)}…`,
      description: n.note,
      timestamp:   fmtRelative(n.created_at),
      accent:      "info" as const,
      status:      lead ? undefined : undefined,
    };
  });

  const firstName = profile.full_name?.split(" ")[0] ?? "there";

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">

      {/* Tab bar */}
      <TabsList className="h-9 bg-muted/50 border border-border/60 p-0.5 rounded-xl flex flex-wrap gap-0.5">
        {[
          { value: "overview",  label: "Overview" },
          { value: "leads",     label: "Leads", count: analytics.totalLeads },
          { value: "followups", label: "Follow-ups", count: followupLeads.length },
          { value: "notes",     label: "Notes" },
          { value: "analytics", label: "Analytics" },
          { value: "profile",   label: "Profile" },
        ].map((t) => (
          <TabsTrigger
            key={t.value}
            value={t.value}
            className="text-xs font-medium rounded-lg px-3 h-[30px] gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            {t.label}
            {t.count != null && t.count > 0 && (
              <span className={cn(
                "text-[10px] font-semibold rounded-full px-1.5 py-px",
                t.value === "followups"
                  ? "bg-orange-500/15 text-orange-400"
                  : "bg-primary/12 text-primary"
              )}>
                {t.count}
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>

      {/* ─────────────── OVERVIEW ─────────────────────────── */}
      <TabsContent value="overview" className="space-y-5 mt-0">

        <HeroCard
          title={`${firstName}'s Pipeline`}
          subtitle="Sales performance · Customer Relationship Executive"
          icon={Target}
          gradient="indigo"
          stats={[
            { label: "Total Leads",  value: analytics.totalLeads },
            { label: "Converted",    value: analytics.convertedLeads },
            { label: "Follow-ups",   value: analytics.pendingFollowups },
          ]}
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard title="Total Leads"      value={analytics.totalLeads}      subtitle="All time"              icon={Users}     accent="blue"    />
          <KpiCard title="Converted"        value={analytics.convertedLeads}  subtitle="Successfully closed"   icon={Target}    accent="green"   />
          <KpiCard title="Pending Follow-ups" value={analytics.pendingFollowups} subtitle="Awaiting action"   icon={PhoneCall} accent="orange"  />
          <KpiCard
            title="Conversion Rate"
            value={`${analytics.conversionRate}%`}
            subtitle="Leads → closed"
            icon={TrendingUp}
            accent={analytics.conversionRate >= 30 ? "green" : analytics.conversionRate >= 15 ? "yellow" : "red"}
          />
        </div>

        {/* Pipeline stage breakdown */}
        <PipelineStrip leads={leads} />

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <StatusChart  data={statusData} />
          <MonthlyChart data={monthlyData} />
        </div>
      </TabsContent>

      {/* ─────────────── LEADS ────────────────────────────── */}
      <TabsContent value="leads" className="mt-0">
        <LeadsTable leads={leads} notesMap={notesMap} />
      </TabsContent>

      {/* ─────────────── FOLLOW-UPS ───────────────────────── */}
      <TabsContent value="followups" className="space-y-5 mt-0">

        <div className="flex items-center justify-between">
          <div>
            <SectionLabel>Pending follow-ups</SectionLabel>
          </div>
          <span className="text-xs text-muted-foreground -mt-1">
            {followupLeads.length} lead{followupLeads.length !== 1 ? "s" : ""} waiting
          </span>
        </div>

        {followupLeads.length === 0 ? (
          <EmptyState
            icon={PhoneCall}
            title="All caught up!"
            description="No leads are currently awaiting a follow-up. Great work."
            variant="card"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {followupLeads.map((lead) => (
              <FollowupCard
                key={lead.id}
                lead={lead}
                notes={notesMap[lead.id] ?? []}
              />
            ))}
          </div>
        )}
      </TabsContent>

      {/* ─────────────── NOTES ────────────────────────────── */}
      <TabsContent value="notes" className="space-y-5 mt-0">
        <div className="flex items-center justify-between">
          <SectionLabel>Activity timeline</SectionLabel>
          <span className="text-xs text-muted-foreground -mt-1">
            {allNotes.length} note{allNotes.length !== 1 ? "s" : ""}
          </span>
        </div>

        {allNotes.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No notes yet"
            description="Open a lead and add a follow-up note to start your activity log."
            variant="card"
          />
        ) : (
          <ActivityFeed
            items={noteActivities}
            emptyLabel="No activity yet."
          />
        )}
      </TabsContent>

      {/* ─────────────── ANALYTICS ────────────────────────── */}
      <TabsContent value="analytics" className="space-y-5 mt-0">

        <SectionLabel>Performance overview</SectionLabel>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard title="Total Leads"       value={analytics.totalLeads}      subtitle="All time"           icon={Users}     accent="blue"   />
          <KpiCard title="Converted"         value={analytics.convertedLeads}  subtitle="Closed"             icon={Target}    accent="green"  />
          <KpiCard title="Follow-ups Active" value={analytics.pendingFollowups} subtitle="In pipeline"       icon={PhoneCall} accent="orange" />
          <KpiCard title="Conversion Rate"   value={`${analytics.conversionRate}%`} subtitle="Overall"      icon={TrendingUp} accent={analytics.conversionRate >= 30 ? "green" : "yellow"} />
        </div>

        <PipelineStrip leads={leads} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <StatusChart  data={statusData} />
          <MonthlyChart data={monthlyData} />
        </div>

        {/* Stage breakdown table */}
        <div>
          <SectionLabel>Stage breakdown</SectionLabel>
          <div className="rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none" />
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted/20 text-left">Stage</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted/20 text-right">Count</th>
                  <th className="px-5 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted/20 text-right">Share</th>
                </tr>
              </thead>
              <tbody>
                {PIPELINE_STAGES.map((stage) => {
                  const count = leads.filter((l) => l.status === stage).length;
                  const pct   = analytics.totalLeads > 0 ? Math.round((count / analytics.totalLeads) * 100) : 0;
                  return (
                    <tr key={stage} className="border-b border-border/30 last:border-0 hover:bg-accent/20 transition-colors">
                      <td className="px-5 py-3">
                        <LeadStatusBadge status={stage} size="md" />
                      </td>
                      <td className="px-5 py-3 text-right font-semibold">{count}</td>
                      <td className="px-5 py-3 text-right text-muted-foreground">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </TabsContent>

      {/* ─────────────── PROFILE ──────────────────────────── */}
      <TabsContent value="profile" className="space-y-5 mt-0">

        <div className="relative rounded-2xl border border-border/60 bg-card shadow-sm overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none" />

          {/* Header */}
          <div className="px-6 pt-6 pb-4 border-b border-border/50 flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-primary/12 text-primary text-lg font-bold shrink-0">
              {(profile.full_name ?? profile.email)?.[0]?.toUpperCase() ?? "U"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-base font-bold leading-tight truncate">{profile.full_name || "—"}</p>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{profile.email}</p>
            </div>
            <StatusBadge
              status={profile.is_active ? "success" : "danger"}
              label={profile.is_active ? "Active" : "Inactive"}
              size="md"
            />
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2">
            {[
              { icon: Phone,     label: "Phone",      value: profile.phone      || "—" },
              { icon: Building2, label: "Department", value: profile.department || "—" },
              { icon: Briefcase, label: "Role",       value: profile.role.replace("_", " ") },
              {
                icon: User,
                label: "Category",
                value: profile.employee_category ? CATEGORY_LABEL[profile.employee_category] : "Not assigned",
              },
              {
                icon: CalendarDays,
                label: "Member Since",
                value: new Date(profile.created_at).toLocaleDateString("en-IN", {
                  day: "numeric", month: "long", year: "numeric",
                }),
              },
              { icon: Mail, label: "Account ID", value: profile.id.slice(0, 8) + "…" },
            ].map((field, i) => (
              <div
                key={i}
                className="flex items-start gap-3 px-6 py-4 border-t border-border/40 first:border-t-0 sm:[&:nth-child(2)]:border-t-0 sm:odd:border-r sm:odd:border-border/40"
              >
                <field.icon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" strokeWidth={1.75} />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{field.label}</p>
                  <p className="text-sm font-medium mt-0.5 capitalize">{field.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CRM summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <KpiCard title="My Leads"    value={leads.length}                  subtitle="Assigned to me"  icon={Users}     accent="blue"   />
          <KpiCard title="Converted"   value={analytics.convertedLeads}      subtitle="Closed by me"    icon={Target}    accent="green"  />
          <KpiCard title="Follow-ups"  value={analytics.pendingFollowups}    subtitle="Pending"         icon={PhoneCall} accent="orange" />
        </div>
      </TabsContent>
    </Tabs>
  );
}
