"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Phone, MessageCircle, ArrowUpRight, GraduationCap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { StatusBadge, EmptyState } from "@/components/ds";
import type { StatusVariant } from "@/components/ds";
import { cn, formatDate } from "@/lib/utils";
import type { StudentWithMembership } from "@/types";

function waLink(phone: string | null) {
  if (!phone) return null;
  const digits = phone.replace(/[^\d]/g, "");
  return digits ? `https://wa.me/${digits}` : null;
}

function membershipMeta(expiryDate: string | null): { label: string; variant: StatusVariant } {
  if (!expiryDate) return { label: "No Membership", variant: "neutral" };
  const expired = new Date(expiryDate).getTime() < Date.now();
  return expired ? { label: "Expired", variant: "danger" } : { label: "Active", variant: "success" };
}

export function StudentsModule({ students }: { students: StudentWithMembership[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return students;
    return students.filter((s) =>
      (s.full_name?.toLowerCase() ?? "").includes(q) ||
      s.email.toLowerCase().includes(q) ||
      (s.phone_number ?? "").includes(q)
    );
  }, [students, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search name, phone, or email…"
            className="pl-8.5 h-9 bg-muted/40 border-border/60 text-sm rounded-xl focus-visible:ring-0 focus-visible:border-border"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <p className="text-xs text-muted-foreground">{filtered.length} of {students.length} students</p>
      </div>

      <div className="relative rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none" />
        {filtered.length === 0 ? (
          <EmptyState
            icon={GraduationCap}
            title={search ? "No students match your search" : "No students synced yet"}
            description={search ? undefined : "Students appear here once a course purchase or renewal webhook is processed."}
            variant="inline"
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40">
                  {["Name", "Contact", "Membership", "Expiry", "Actions"].map((h) => (
                    <th key={h} className={cn(
                      "px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted/20 text-left",
                      h === "Actions" && "text-right"
                    )}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const meta = membershipMeta(s.expiry_date);
                  const wa = waLink(s.phone_number);
                  return (
                    <tr key={s.id} className="border-b border-border/30 last:border-0 hover:bg-accent/20 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/admin/ezycourse/students/${s.id}`} className="font-medium text-foreground hover:text-primary transition-colors inline-flex items-center gap-1 group">
                          {s.full_name || "—"}
                          <ArrowUpRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                        </Link>
                        <p className="text-xs text-muted-foreground">{s.product_name ?? "—"}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <p className="text-xs">{s.email}</p>
                        <p className="text-xs">{s.phone_number || "—"}</p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={meta.variant} label={meta.label} size="sm" dot />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {s.expiry_date ? formatDate(s.expiry_date) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {s.phone_number && (
                            <a
                              aria-label={`Call ${s.full_name || s.email}`}
                              title="Call"
                              href={`tel:${s.phone_number}`}
                              className="flex items-center justify-center w-7 h-7 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-colors"
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {wa && (
                            <a
                              aria-label={`WhatsApp ${s.full_name || s.email}`}
                              title="WhatsApp"
                              href={wa}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center justify-center w-7 h-7 rounded-lg border border-border/60 text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
