import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { processPendingEzyCourseLogs } from "@/lib/ezycourse/process";

// Vercel Cron calls this on a schedule (see vercel.json) to retry
// course-purchase/renew-order webhook_logs rows that failed processing.
// Vercel signs cron requests with a bearer token matching CRON_SECRET —
// if that env var isn't set, this only runs in environments where
// arbitrary callers reaching this URL isn't a concern (e.g. local dev).
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const supabase = createAdminClient();
  try {
    const result = await processPendingEzyCourseLogs(supabase, 100);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Retry sweep failed";
    console.error("EzyCourse retry cron failed:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
