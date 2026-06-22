import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/services/auth.service";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { WebhookLogViewer } from "@/components/admin/webhook-log-viewer";
import { EzyCourseAnalytics } from "@/components/admin/ezycourse-analytics";
import { unwrap } from "@/lib/supabase/query";
import { EZYCOURSE_EVENT_TYPES } from "@/lib/ezycourse/webhook";
import type { CoursePurchase, WebhookLog } from "@/types";

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

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    revenueTodayResult,
    revenueMonthResult,
    renewalsDueResult,
    expiredMembershipsResult,
    newStudentsResult,
    recentPurchasesResult,
  ] = await Promise.all([
    supabase.from("ezycourse_revenue_events").select("amount").gte("created_at", todayStart),
    supabase.from("ezycourse_revenue_events").select("amount").gte("created_at", monthStart),
    supabase
      .from("current_memberships")
      .select("membership_id", { count: "exact", head: true })
      .gte("expiry_date", now.toISOString())
      .lte("expiry_date", sevenDaysAhead),
    supabase
      .from("current_memberships")
      .select("membership_id", { count: "exact", head: true })
      .lt("expiry_date", now.toISOString()),
    supabase
      .from("students")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo),
    supabase
      .from("course_purchases")
      .select("*, students(email, full_name)")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const revenueToday = unwrap(revenueTodayResult, "today's revenue").reduce(
    (sum: number, r: { amount: number }) => sum + r.amount,
    0
  );
  const revenueThisMonth = unwrap(revenueMonthResult, "monthly revenue").reduce(
    (sum: number, r: { amount: number }) => sum + r.amount,
    0
  );
  const recentPurchasesRaw = unwrap(recentPurchasesResult, "recent purchases") as (CoursePurchase & {
    students: { email: string; full_name: string | null } | null;
  })[];
  const recentPurchases = recentPurchasesRaw.map((p) => {
    const { students, ...rest } = p;
    return { ...rest, student_email: students?.email ?? "", student_name: students?.full_name ?? "" };
  });

  const { page: pageParam, event } = await searchParams;
  const page = Math.max(1, parseInt(pageParam ?? "1", 10) || 1);

  // "Unknown" is a bucket, not a single value — it covers legacy NULL/
  // "unknown" rows and any "unknown:<segment>" rows from an unrecognized
  // or typo'd route segment, so it needs a prefix match rather than eq().
  let query = supabase.from("webhook_logs").select("*", { count: "exact" }).eq("source", "ezycourse");
  if (event === "unknown") {
    query = query.like("event_type", "unknown%");
  } else if (event) {
    query = query.eq("event_type", event);
  }

  const result = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const logs = unwrap(result, "webhook logs") as WebhookLog[];
  const total = result.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // Filter options: the 7 supported event types always show (even with 0
  // logs yet), "Unknown" always shows, plus anything else actually seen in
  // the DB that isn't covered by either (shouldn't normally happen, but
  // surfaces it rather than hiding it if it does).
  const eventTypesResult = await supabase
    .from("webhook_logs")
    .select("event_type")
    .eq("source", "ezycourse")
    .not("event_type", "is", null);
  const seenTypes = new Set(
    unwrap(eventTypesResult, "event types").map((r: { event_type: string }) => r.event_type)
  );
  const hasUnknown = Array.from(seenTypes).some((t) => t.startsWith("unknown"));
  const otherTypes = Array.from(seenTypes).filter(
    (t) => !t.startsWith("unknown") && !(EZYCOURSE_EVENT_TYPES as readonly string[]).includes(t)
  );
  const eventTypes = [
    ...EZYCOURSE_EVENT_TYPES,
    ...(hasUnknown ? ["unknown"] : []),
    ...otherTypes.sort(),
  ];

  return (
    <DashboardLayout
      profile={userProfile}
      role={role}
      title="EzyCourse Integration"
      description="Webhook payload discovery — captures every raw event before any schema is built around it"
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            <Link href="/admin/ezycourse/students" className="text-primary hover:underline font-medium">
              View all students &amp; timelines →
            </Link>
          </p>
        </div>

        <EzyCourseAnalytics
          revenueToday={revenueToday}
          revenueThisMonth={revenueThisMonth}
          renewalsDueCount={renewalsDueResult.count ?? 0}
          expiredMembershipsCount={expiredMembershipsResult.count ?? 0}
          newStudentsCount={newStudentsResult.count ?? 0}
          recentPurchases={recentPurchases}
        />

        <WebhookLogViewer
          logs={logs}
          eventTypes={eventTypes}
          pagination={{ page, totalPages, total, pageSize: PAGE_SIZE }}
          eventFilter={event ?? null}
        />
      </div>
    </DashboardLayout>
  );
}
