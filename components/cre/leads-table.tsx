"use client";

import { useState, useMemo } from "react";
import { Search, SlidersHorizontal, MessageSquare } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadStatusBadge } from "./lead-status-badge";
import { LeadNotesDialog } from "./lead-notes-dialog";
import { LeadForm } from "./lead-form";
import type { Lead, LeadNote, LeadStatus } from "@/types";

const PAGE_SIZE = 20;

const SOURCE_LABELS: Record<string, string> = {
  website: "Website",
  referral: "Referral",
  walk_in: "Walk-in",
  phone: "Phone Call",
  social_media: "Social Media",
  advertisement: "Advertisement",
  other: "Other",
};

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface LeadsTableProps {
  leads: Lead[];
  notesMap: Record<string, LeadNote[]>;
}

export function LeadsTable({ leads, notesMap }: LeadsTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return leads.filter((l) => {
      const matchSearch =
        !q ||
        l.name.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        (l.email?.toLowerCase() ?? "").includes(q) ||
        (l.course_interest?.toLowerCase() ?? "").includes(q);

      const matchStatus =
        statusFilter === "all" || l.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [leads, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleStatusChange(value: string) {
    setStatusFilter(value as LeadStatus | "all");
    setPage(1);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-1 items-center gap-2 w-full sm:max-w-sm">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, email…"
              className="pl-8 h-9"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-36 h-9 shrink-0">
              <SlidersHorizontal className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="interested">Interested</SelectItem>
              <SelectItem value="follow_up">Follow-up</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <LeadForm />
      </div>

      {/* Count */}
      <p className="text-xs text-muted-foreground">
        {filtered.length} lead{filtered.length !== 1 ? "s" : ""}
        {statusFilter !== "all" || search ? " (filtered)" : ""}
      </p>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {paginated.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-center px-4">
              <Search className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-sm font-medium">No leads found</p>
              <p className="text-xs text-muted-foreground">
                {search || statusFilter !== "all"
                  ? "Try adjusting your search or filter."
                  : "Add your first lead using the button above."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[180px]">Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead className="hidden sm:table-cell">Email</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Course / Interest
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">Source</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Added</TableHead>
                  <TableHead className="w-[80px] text-right">Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginated.map((lead) => {
                  const noteCount = (notesMap[lead.id] ?? []).length;
                  return (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium text-sm">
                        {lead.name}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {lead.phone}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {lead.email || "—"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm max-w-[160px] truncate text-muted-foreground">
                        {lead.course_interest || "—"}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {SOURCE_LABELS[lead.source ?? ""] ?? lead.source ?? "—"}
                      </TableCell>
                      <TableCell>
                        <LeadStatusBadge status={lead.status} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {fmtDate(lead.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <LeadNotesDialog
                          lead={lead}
                          initialNotes={notesMap[lead.id] ?? []}
                        >
                          <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs">
                            <MessageSquare className="w-3.5 h-3.5" />
                            {noteCount > 0 && (
                              <span className="font-medium">{noteCount}</span>
                            )}
                          </Button>
                        </LeadNotesDialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <p className="text-muted-foreground">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export function LeadsTableSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1 max-w-sm" />
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-24 ml-auto" />
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                {["Name", "Phone", "Status", "Added", "Notes"].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
