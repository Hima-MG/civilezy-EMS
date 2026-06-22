import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { processWebhookLog } from "@/lib/ezycourse/process";
import type { WebhookLog } from "@/types";

// EzyCourse's Data Out webhooks don't include an event-type field in the
// payload or headers (confirmed by inspecting captured rows in
// webhook_logs) — each event is a separate trigger configured with its
// own target URL in EzyCourse's dashboard. The URL path segment is the
// only reliable place to read the event type from.
export const EZYCOURSE_EVENT_TYPES = [
  "course-purchase",
  "renew-order",
  "student-registration",
  "payment-success",
  "payment-failed",
  "refund",
  "membership-expired",
] as const;

export type EzyCourseEventType = (typeof EZYCOURSE_EVENT_TYPES)[number];

export function isKnownEventType(value: string): value is EzyCourseEventType {
  return (EZYCOURSE_EVENT_TYPES as readonly string[]).includes(value);
}

// Legacy fallback only — used by the route with no [eventType] segment, for
// any pre-existing EzyCourse trigger still pointed at the old URL. Real
// payloads checked so far never contain any of these keys.
const LEGACY_EVENT_TYPE_KEYS = ["event", "event_type", "type", "action", "eventName", "event_name"];

function guessEventTypeFromPayload(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const obj = payload as Record<string, unknown>;
  for (const key of LEGACY_EVENT_TYPE_KEYS) {
    if (typeof obj[key] === "string") return obj[key] as string;
  }
  return null;
}

export function checkEzyCourseSecret(secret: string): boolean {
  const expected = process.env.EZYCOURSE_WEBHOOK_SECRET;
  return Boolean(expected) && secret === expected;
}

/**
 * Shared by both the route-based ([eventType] segment present) and legacy
 * (no segment) webhook handlers. Resolves the final event_type string and
 * writes the raw payload + headers to webhook_logs.
 *
 * - Known route segment → stored as-is (e.g. "course-purchase").
 * - Unrecognized route segment → stored as "unknown:<segment>" so a typo'd
 *   or newly-added EzyCourse trigger is still visible and distinguishable
 *   in the admin viewer, not silently lumped in with everything else.
 * - No segment (legacy URL) → falls back to the old body-guessing logic;
 *   "unknown" if that also finds nothing.
 */
export async function logEzyCourseWebhook(
  request: NextRequest,
  routeEventType: string | null
): Promise<NextResponse> {
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

  let eventType: string;
  if (routeEventType) {
    eventType = isKnownEventType(routeEventType) ? routeEventType : `unknown:${routeEventType}`;
  } else {
    eventType = guessEventTypeFromPayload(payload) ?? "unknown";
  }

  const supabase = createAdminClient();
  const { data: insertedLog, error } = await supabase
    .from("webhook_logs")
    .insert({
      source: "ezycourse",
      event_type: eventType,
      payload,
      headers,
      processed: false,
    })
    .select("*")
    .single();

  if (error) {
    // Still ack with 200 so EzyCourse doesn't retry-storm us while we're
    // debugging logging itself — there's nothing to retry-process if the
    // log row was never written.
    console.error("Failed to store EzyCourse webhook log:", error.message);
    return NextResponse.json({ received: true });
  }

  // Process inline, synchronously, before acking. If this throws or fails,
  // processWebhookLog has already recorded the failure + retry count on
  // the log row — the periodic retry sweep (cron + admin "Retry" action)
  // picks it back up. The webhook response itself is unaffected either way.
  try {
    await processWebhookLog(supabase, insertedLog as WebhookLog);
  } catch (processingError) {
    console.error("EzyCourse webhook processing threw:", processingError);
  }

  return NextResponse.json({ received: true });
}
