"use client";

import { useState, useMemo } from "react";
import { Search, MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { LeadStatusBadge, LEAD_STATUS_CONFIG } from "./lead-status-badge";
import { LeadNotesDialog } from "./lead-notes-dialog";
import { LeadForm } from "./lead-form";
import { EmptyState } from "@/components/ds";
import { cn } from "@/lib/utils";
import type { Lead, LeadNote, LeadStatus } from "@/types";

const PAGE_SIZE = 20;

const SOURCE_LABELS: Record<string, string> = {
  website:       "Website",
  referral:      "Referral",
  walk_in:       "Walk-in",
  phone:         "Phone",
  social_media:  "Social",
  advertisement: "Ad",
  other:         "Other",
};

const STAGE_FILTERS: { value: LeadStatus | "all"; label: string }[] = [
  { value: "all",        label: "All" },
  { value: "new",        label: "New" },
  { value: "contacted",  label: "Contacted" },
  { value: "interested", label: "Interested" },
  { value: "follow_up",  label: "Follow-up" },
  { value: "converted",  label: "Converted" },
  { value: "lost",       label: "Lost" },
];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

interface LeadsTableProps {
  leads: Lead[];
  notesMap: Record<string, LeadNote[]>;
}

export function LeadsTable({ leads, notesMap }: LeadsTableProps) {
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [page,         setPage]         = useState(1);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return leads.filter((l) => {
      const matchSearch =
        !q ||
        l.name.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        (l.email?.toLowerCase() ?? "").includes(q) ||
        (l.course_interest?.toLowerCase() ?? "").includes(q);
      const matchStatus = statusFilter === "all" || l.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [leads, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function onSearch(v: string) { setSearch(v);       setPage(1); }
  function onStage (v: LeadStatus | "all") { setStatusFilter(v); setPage(1); }

  const stageCounts = useMemo(
    () => Object.fromEntries(
      (["new","contacted","interested","follow_up","converted","lost"] as LeadStatus[])
        .map((s) => [s, leads.filter((l) => l.status === s).length])
    ),
    [leads]
  );

  return (
    <div className="space-y-4">

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search name, phone, email…"
            className="pl-8.5 h-9 bg-muted/40 border-border/60 text-sm rounded-xl focus-visible:ring-0 focus-visible:border-border"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
        </div>
        <LeadForm />
      </div>

      {/* ── Stage filter pills ── */}
      <div className="flex flex-wrap gap-1.5">
        {STAGE_FILTERS.map((f) => {
          const isActive = statusFilter === f.value;
          const count    = f.value === "all" ? leads.length : (stageCounts[f.value as LeadStatus] ?? 0);
          const cfg      = f.value !== "all" ? LEAD_STATUS_CONFIG[f.value as LeadStatus] : null;

          return (
            <button
              key={f.value}
              onClick={() => onStage(f.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full text-xs font-medium px-2.5 py-1",
                "border transition-all duration-150",
                isActive
                  ? "border-primary/40 bg-primary/12 text-primary"
                  : "border-border/60 bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              {cfg && <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />}
              {f.label}
              <span className={cn(
                "text-[10px] font-semibold rounded-full px-1.5 py-px",
                isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
              )}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Table ── */}
      <div className="relative rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none z-10" />

        {paginated.length === 0 ? (
          <EmptyState
            icon={Search}
            title={search || statusFilter !== "all" ? "No leads match your filter" : "No leads yet"}
            description={search || statusFilter !== "all" ? "Try clearing the search or changing the stage filter." : "Add your first lead using the button above."}
            variant="inline"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40">
                  {["Name","Phone","Course / Interest","Source","Added","Status","Notes"].map((h) => (
                    <th
                      key={h}
                      className={cn(
                        "px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted/20 text-left",
                        h === "Notes"  && "text-right",
                        h === "Source" && "hidden lg:table-cell",
                        h === "Course / Interest" && "hidden md:table-cell",
                      )}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <AnimatePresence initial={false}>
                  {paginated.map((lead, i) => {
                    const noteCount = (notesMap[lead.id] ?? []).length;
                    return (
                      <motion.tr
                        key={lead.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.12, delay: i * 0.02 }}
                        className="border-b border-border/30 last:border-0 hover:bg-accent/20 transition-colors duration-100"
                      >
                        <td className="px-4 py-3 font-medium text-foreground whitespace-nowrap">
                          {lead.name}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs tracking-wide">
                          {lead.phone}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell max-w-[160px]">
                          <span className="truncate block">{lead.course_interest || "—"}</span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell text-xs">
                          {SOURCE_LABELS[lead.source ?? ""] ?? lead.source ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                          {fmtDate(lead.created_at)}
                        </td>
                        <td className="px-4 py-3">
                          <LeadStatusBadge status={lead.status} />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <LeadNotesDialog lead={lead} initialNotes={notesMap[lead.id] ?? []}>
                            <button className={cn(
                              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium",
                              "transition-colors duration-100",
                              noteCount > 0
                                ? "bg-primary/10 text-primary hover:bg-primary/18"
                                : "text-muted-foreground hover:text-foreground hover:bg-accent/40"
                            )}>
                              <MessageSquare className="w-3.5 h-3.5" />
                              {noteCount > 0 && <span>{noteCount}</span>}
                            </button>
                          </LeadNotesDialog>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}

        {/* Footer / pagination */}
        {(totalPages > 1 || filtered.length > 0) && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/40 bg-muted/10">
            <p className="text-xs text-muted-foreground">
              {filtered.length} lead{filtered.length !== 1 ? "s" : ""}
              {(search || statusFilter !== "all") ? " (filtered)" : ""}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  className="flex items-center justify-center w-7 h-7 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  disabled={page === 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-xs text-muted-foreground px-1">
                  {page} / {totalPages}
                </span>
                <button
                  className="flex items-center justify-center w-7 h-7 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  disabled={page === totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
