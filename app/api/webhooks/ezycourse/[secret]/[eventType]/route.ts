import { NextResponse, type NextRequest } from "next/server";
import { checkEzyCourseSecret, logEzyCourseWebhook } from "@/lib/ezycourse/webhook";

// Primary EzyCourse webhook endpoint — one URL per event type. Configure
// each EzyCourse "Data Out" trigger to POST to its own eventType segment
// (see EZYCOURSE_EVENT_TYPES in lib/ezycourse/webhook.ts for the full list).

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ secret: string; eventType: string }> }
) {
  const { secret, eventType } = await params;
  if (!checkEzyCourseSecret(secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return logEzyCourseWebhook(request, eventType);
}

// Accept a GET ping too — some webhook providers verify reachability
// before saving the configured URL.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ secret: string; eventType: string }> }
) {
  const { secret, eventType } = await params;
  if (!checkEzyCourseSecret(secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ status: "ok", eventType, message: "EzyCourse webhook endpoint is live." });
}
