import { NextResponse, type NextRequest } from "next/server";
import { checkEzyCourseSecret, logEzyCourseWebhook } from "@/lib/ezycourse/webhook";

// Legacy endpoint — kept for backward compatibility with any EzyCourse
// trigger still pointed here from before event-type routing existed.
// New triggers should use /api/webhooks/ezycourse/[secret]/[eventType]
// instead, since this route has no way to know which event fired and
// will log everything as "unknown".

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ secret: string }> }
) {
  const { secret } = await params;
  if (!checkEzyCourseSecret(secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return logEzyCourseWebhook(request, null);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ secret: string }> }
) {
  const { secret } = await params;
  if (!checkEzyCourseSecret(secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    status: "ok",
    message: "EzyCourse webhook endpoint is live (legacy — no event-type routing).",
  });
}
