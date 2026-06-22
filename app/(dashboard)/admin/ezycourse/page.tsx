import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/services/auth.service";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { WebhookLogViewer } from "@/components/admin/webhook-log-viewer";
import { unwrap } from "@/lib/supabase/query";
import type { WebhookLog } from "@/types";

export const metadata: Metadata = { title: "EzyCourse Integration" };
export const dynamic = "force-dynamic";

const PAGE_SIZE = 25;

interface EzyCoursePageProps {
  searchParams: Promise<{ page?: string; event?: string }>;
}

export default async function EzyCoursePage({ searchParams }: EzyCoursePageProps) {
  const { supabase, user, profile: userProfile, role } = await getAuthContext();

  if (!user || !userProfile || !role || userProfile.is_active === false) {
    redirect("/login");
  }

  // Role gate is centralized in app/(dashboard)/admin/layout.tsx

  const { page: pageParam, event } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  let query = supabase.from("webhook_logs").select("*", { count: "exact" }).eq("source", "ezycourse");
  if (event) query = query.eq("event_type", event);

  const result = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const logs = unwrap(result, "webhook logs") as WebhookLog[];
  const total = result.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const eventTypesResult = await supabase
    .from("webhook_logs")
    .select("event_type")
    .eq("source", "ezycourse")
    .not("event_type", "is", null);
  const eventTypes = Array.from(
    new Set(unwrap(eventTypesResult, "event types").map((r: { event_type: string }) => r.event_type))
  ).sort();

  return (
    <DashboardLayout
      profile={userProfile}
      role={role}
      title="EzyCourse Integration"
      description="Webhook payload discovery — captures every raw event before any schema is built around it"
    >
      <WebhookLogViewer
        logs={logs}
        eventTypes={eventTypes}
        pagination={{ page, totalPages, total, pageSize: PAGE_SIZE }}
        eventFilter={event ?? null}
      />
    </DashboardLayout>
  );
}
