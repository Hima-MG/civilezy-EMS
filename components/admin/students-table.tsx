"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import { EmptyState } from "@/components/ds";
import { formatDate } from "@/lib/utils";
import type { Student } from "@/types";

interface StudentsTableProps {
  students: Student[];
  search: string;
}

export function StudentsTable({ students, search }: StudentsTableProps) {
  return (
    <div className="relative rounded-2xl border border-border/60 bg-card overflow-hidden shadow-sm">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent pointer-events-none" />
      {students.length === 0 ? (
        <EmptyState
          icon={Users}
          title={search ? "No students match your search" : "No students yet"}
          description={search ? undefined : "Students appear here once a course purchase or renewal webhook is processed."}
          variant="inline"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40">
                {["Name", "Email", "Phone", "Joined"].map((h) => (
                  <th key={h} className="px-4 py-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground bg-muted/20 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-border/30 last:border-0 hover:bg-accent/20 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/admin/ezycourse/students/${s.id}`} className="font-medium text-primary hover:underline">
                      {s.full_name || "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">{s.phone_number || "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(s.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
