import type { Metadata } from "next";
import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getAuthContext } from "@/services/auth.service";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StudentTimeline } from "@/components/admin/student-timeline";
import { unwrap } from "@/lib/supabase/query";
import type { ActivityLog, Student } from "@/types";

export const metadata: Metadata = { title: "Student Timeline" };
export const dynamic = "force-dynamic";

interface StudentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function StudentDetailPage({ params }: StudentDetailPageProps) {
  const { supabase, user, profile: userProfile, role } = await getAuthContext();

  if (!user || !userProfile || !role || userProfile.is_active === false) {
    redirect("/login");
  }

  // Role gate is centralized in app/(dashboard)/admin/layout.tsx

  const { id } = await params;

  const [studentResult, activityResult] = await Promise.all([
    supabase.from("students").select("*").eq("id", id).maybeSingle(),
    supabase.from("activity_logs").select("*").eq("student_id", id).order("occurred_at", { ascending: false }),
  ]);

  if (studentResult.error) throw new Error(`Failed to load student: ${studentResult.error.message}`);
  const student = studentResult.data as Student | null;
  if (!student) notFound();

  const activity = unwrap(activityResult, "student activity") as ActivityLog[];

  return (
    <DashboardLayout
      profile={userProfile}
      role={role}
      title={student.full_name || student.email}
      description={student.email}
    >
      <div className="space-y-5">
        <Link href="/admin/ezycourse/students" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to students
        </Link>

        <div className="rounded-2xl border border-border/60 bg-card p-5 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Phone</p>
            <p className="text-sm font-medium mt-0.5">{student.phone_number || "—"}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Location</p>
            <p className="text-sm font-medium mt-0.5">{[student.city, student.country].filter(Boolean).join(", ") || "—"}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">First Seen</p>
            <p className="text-sm font-medium mt-0.5">{new Date(student.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Events</p>
            <p className="text-sm font-medium mt-0.5">{activity.length}</p>
          </div>
        </div>

        <StudentTimeline activity={activity} />
      </div>
    </DashboardLayout>
  );
}
