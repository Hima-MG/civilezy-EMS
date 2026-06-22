import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";

// Payload-discovery endpoint. EzyCourse has no API and no documented
// webhook payload schema for this account, so this route makes no
// assumptions about shape — it captures the raw body, headers, and a
// best-guess event type, and stores them for inspection at
// /admin/ezycourse. Steps 2+ (typed tables, processing) are designed
// from what actually lands here, not from a guess.

const EVENT_TYPE_KEYS = ["event", "event_type", "type", "action", "eventName", "event_name"];

function guessEventType(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const obj = payload as Record<string, unknown>;
  for (const key of EVENT_TYPE_KEYS) {
    if (typeof obj[key] === "string") return obj[key] as string;
  }
  return null;
}

async function handle(request: NextRequest, secret: string) {
  const expected = process.env.EZYCOURSE_WEBHOOK_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rawBody = await request.text();
  let payload: unknown;
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    payload = { _unparsable_raw_body: rawBody };
  }

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const supabase = createAdminClient();
  const { error } = await supabase.from("webhook_logs").insert({
    source: "ezycourse",
    event_type: guessEventType(payload),
    payload,
    headers,
    processed: false,
  });

  if (error) {
    // Log server-side for now — still ack with 200 so EzyCourse doesn't
    // retry-storm us while we're still standing this up. Once Step 7's
    // retry/error-log pipeline exists this will route through that instead.
    console.error("Failed to store EzyCourse webhook log:", error.message);
  }

  return NextResponse.json({ received: true });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ secret: string }> }
) {
  const { secret } = await params;
  return handle(request, secret);
}

// Some webhook providers send a GET ping to verify the URL is reachable
// before saving it — accept it the same way rather than 405ing.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ secret: string }> }
) {
  const { secret } = await params;
  const expected = process.env.EZYCOURSE_WEBHOOK_SECRET;
  if (!expected || secret !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ status: "ok", message: "EzyCourse webhook endpoint is live." });
}
