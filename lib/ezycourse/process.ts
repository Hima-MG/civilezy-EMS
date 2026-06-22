import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sendRenewalConfirmationEmail } from "@/lib/ezycourse/notifications";
import type { WebhookLog } from "@/types";

// Schemas match the ACTUAL captured payloads for these two event types —
// see the audit conversation for the raw JSON. Every other field EzyCourse
// might send is allowed through untyped (zod strips unknown keys by
// default with .object(), which is fine — we only need what we use).
//
// .nullish() (not .optional()) on every non-required field: EzyCourse
// sends explicit `null` for some absent fields rather than omitting the
// key, and .optional() alone rejects null — confirmed by testing against
// real captured rows, where a purchase payload with `address_line_2: null`
// failed validation under .optional() before this fix.
const coursePurchaseSchema = z.object({
  id: z.union([z.number(), z.string()]),
  email: z.string().email(),
  name: z.string().nullish(),
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  phone_number: z.string().nullish(),
  city: z.string().nullish(),
  state: z.string().nullish(),
  country: z.string().nullish(),
  postal_code: z.string().nullish(),
  address_line_1: z.string().nullish(),
  address_line_2: z.string().nullish(),
  product_id: z.union([z.number(), z.string()]),
  product_name: z.string(),
  product_type: z.string(),
  product_owner_id: z.union([z.number(), z.string()]).nullish(),
  product_owner_email: z.string().nullish(),
  price: z.number(),
  gateway: z.string().nullish(),
  interval: z.string().nullish(),
  interval_count: z.number().nullish(),
  couppon_code: z.string().nullish(), // EzyCourse's actual (misspelled) field name
  expiry_date: z.string().nullish(),
  metadata: z.record(z.string(), z.unknown()).nullish(),
});

const renewOrderSchema = z.object({
  email: z.string().email(),
  full_name: z.string().nullish(),
  first_name: z.string().nullish(),
  last_name: z.string().nullish(),
  phone_number: z.string().nullish(),
  price: z.number().nullish(),
  gateway: z.string().nullish(),
  currency: z.string().nullish(),
  school_id: z.union([z.number(), z.string()]).nullish(),
  seller_id: z.union([z.number(), z.string()]).nullish(),
  change_type: z.string().nullish(),
  expiry_date: z.string().nullish(),
  product_name: z.string().nullish(),
  membership_id: z.union([z.number(), z.string()]),
  membership_type: z.string().nullish(),
  membership_status: z.string().nullish(),
});

type ProcessResult = { status: "processed" } | { status: "failed"; error: string };

const MAX_RETRIES = 5;

interface StudentInfo {
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  full_name?: string | null;
  phone_number?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  postal_code?: string | null;
  address_line_1?: string | null;
  address_line_2?: string | null;
  ezycourse_school_id?: string | null;
}

// Upsert-by-email that never clobbers a previously-known field with a
// null just because the current payload happened not to include it
// (e.g. renew-order has no address fields, but course-purchase does).
async function upsertStudent(supabase: SupabaseClient, info: StudentInfo): Promise<string> {
  const { data: existing } = await supabase
    .from("students")
    .select("*")
    .eq("email", info.email)
    .maybeSingle();

  const fallbackFullName = [info.first_name, info.last_name].filter(Boolean).join(" ") || null;

  const merged = {
    email: info.email,
    first_name: info.first_name ?? existing?.first_name ?? null,
    last_name: info.last_name ?? existing?.last_name ?? null,
    full_name: info.full_name ?? fallbackFullName ?? existing?.full_name ?? null,
    phone_number: info.phone_number ?? existing?.phone_number ?? null,
    city: info.city ?? existing?.city ?? null,
    state: info.state ?? existing?.state ?? null,
    country: info.country ?? existing?.country ?? null,
    postal_code: info.postal_code ?? existing?.postal_code ?? null,
    address_line_1: info.address_line_1 ?? existing?.address_line_1 ?? null,
    address_line_2: info.address_line_2 ?? existing?.address_line_2 ?? null,
    ezycourse_school_id: info.ezycourse_school_id ?? existing?.ezycourse_school_id ?? null,
  };

  const { data, error } = await supabase
    .from("students")
    .upsert(merged, { onConflict: "email" })
    .select("id")
    .single();

  if (error) throw new Error(`Student upsert failed: ${error.message}`);
  return data.id as string;
}

async function processCoursePurchase(supabase: SupabaseClient, log: WebhookLog): Promise<ProcessResult> {
  const parsed = coursePurchaseSchema.safeParse(log.payload);
  if (!parsed.success) {
    return { status: "failed", error: parsed.error.issues[0]?.message ?? "Invalid course-purchase payload" };
  }
  const p = parsed.data;

  try {
    const studentId = await upsertStudent(supabase, {
      email: p.email,
      first_name: p.first_name,
      last_name: p.last_name,
      full_name: p.name,
      phone_number: p.phone_number,
      city: p.city,
      state: p.state,
      country: p.country,
      postal_code: p.postal_code,
      address_line_1: p.address_line_1,
      address_line_2: p.address_line_2,
    });

    const { error } = await supabase.from("course_purchases").upsert(
      {
        ezycourse_order_id: String(p.id),
        student_id: studentId,
        product_id: String(p.product_id),
        product_name: p.product_name,
        product_type: p.product_type,
        product_owner_id: p.product_owner_id != null ? String(p.product_owner_id) : null,
        product_owner_email: p.product_owner_email ?? null,
        price: p.price,
        gateway: p.gateway ?? null,
        interval: p.interval ?? null,
        interval_count: p.interval_count ?? null,
        coupon_code: p.couppon_code ?? null,
        expiry_date: p.expiry_date ?? null,
        metadata: p.metadata ?? null,
        webhook_log_id: log.id,
      },
      { onConflict: "ezycourse_order_id" }
    );
    if (error) throw new Error(error.message);

    await supabase.from("activity_logs").insert({
      student_id: studentId,
      activity_type: "purchase",
      description: `Purchased ${p.product_name}`,
      metadata: { price: p.price, gateway: p.gateway, product_id: p.product_id },
      source_table: "course_purchases",
      occurred_at: log.created_at,
    });

    return { status: "processed" };
  } catch (err) {
    return { status: "failed", error: err instanceof Error ? err.message : "Unknown error" };
  }
}

async function processRenewOrder(supabase: SupabaseClient, log: WebhookLog): Promise<ProcessResult> {
  const parsed = renewOrderSchema.safeParse(log.payload);
  if (!parsed.success) {
    return { status: "failed", error: parsed.error.issues[0]?.message ?? "Invalid renew-order payload" };
  }
  const p = parsed.data;

  try {
    const studentId = await upsertStudent(supabase, {
      email: p.email,
      first_name: p.first_name,
      last_name: p.last_name,
      full_name: p.full_name,
      phone_number: p.phone_number,
      ezycourse_school_id: p.school_id != null ? String(p.school_id) : undefined,
    });

    // (membership_id, expiry_date) is the only available idempotency key —
    // the real payload has no per-event id. A duplicate delivery for the
    // same membership at the same expiry is a no-op, not a new row or a
    // second confirmation email.
    const { data: existing } = await supabase
      .from("membership_renewals")
      .select("id")
      .eq("membership_id", String(p.membership_id))
      .eq("expiry_date", p.expiry_date ?? null)
      .maybeSingle();

    if (existing) {
      return { status: "processed" };
    }

    const { error } = await supabase.from("membership_renewals").insert({
      membership_id: String(p.membership_id),
      student_id: studentId,
      membership_type: p.membership_type ?? null,
      membership_status: p.membership_status ?? null,
      change_type: p.change_type ?? null,
      product_name: p.product_name ?? null,
      price: p.price ?? null,
      gateway: p.gateway ?? null,
      currency: p.currency ?? null,
      school_id: p.school_id != null ? String(p.school_id) : null,
      seller_id: p.seller_id != null ? String(p.seller_id) : null,
      expiry_date: p.expiry_date ?? null,
      webhook_log_id: log.id,
    });
    if (error) throw new Error(error.message);

    await supabase.from("activity_logs").insert({
      student_id: studentId,
      activity_type: "renewal",
      description: `Renewed ${p.product_name ?? p.membership_type ?? "membership"} (${p.change_type ?? "renewal"})`,
      metadata: { membership_id: p.membership_id, price: p.price, change_type: p.change_type },
      source_table: "membership_renewals",
      occurred_at: log.created_at,
    });

    if (p.price != null) {
      try {
        await sendRenewalConfirmationEmail({
          to: p.email,
          name: p.full_name || [p.first_name, p.last_name].filter(Boolean).join(" ") || "there",
          productName: p.product_name ?? p.membership_type ?? "your membership",
          price: p.price,
          currency: p.currency ?? "USD",
          expiryDate: p.expiry_date ?? null,
        });
      } catch (emailErr) {
        // Email failure must never roll back the DB write — the renewal
        // is real and recorded either way.
        console.error("Renewal confirmation email failed (non-fatal):", emailErr);
      }
    }

    return { status: "processed" };
  } catch (err) {
    return { status: "failed", error: err instanceof Error ? err.message : "Unknown error" };
  }
}

/**
 * Dispatches a single webhook_logs row to its typed-table processor and
 * writes the resulting processing_status/retry_count/last_error back.
 * Event types with no confirmed payload shape (payment-success,
 * payment-failed, refund, membership-expired, student-registration, and
 * any "unknown:*") are intentionally left untouched — there is no handler
 * to dispatch to yet, so they stay pending until one exists.
 */
export async function processWebhookLog(supabase: SupabaseClient, log: WebhookLog): Promise<void> {
  let result: ProcessResult;
  switch (log.event_type) {
    case "course-purchase":
      result = await processCoursePurchase(supabase, log);
      break;
    case "renew-order":
      result = await processRenewOrder(supabase, log);
      break;
    default:
      return;
  }

  if (result.status === "processed") {
    await supabase
      .from("webhook_logs")
      .update({
        processed: true,
        processing_status: "processed",
        processed_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("id", log.id);
  } else {
    const nextRetryCount = (log.retry_count ?? 0) + 1;
    await supabase
      .from("webhook_logs")
      .update({
        processing_status: nextRetryCount >= MAX_RETRIES ? "failed" : "pending",
        retry_count: nextRetryCount,
        last_error: result.error,
      })
      .eq("id", log.id);
  }
}

/**
 * Batch retry sweep — finds course-purchase/renew-order logs that aren't
 * yet processed and haven't exhausted retries, and reprocesses them.
 * Called from the admin "Retry" action and the Vercel Cron route.
 */
export async function processPendingEzyCourseLogs(
  supabase: SupabaseClient,
  limit = 50
): Promise<{ attempted: number }> {
  const { data, error } = await supabase
    .from("webhook_logs")
    .select("*")
    .eq("source", "ezycourse")
    .in("event_type", ["course-purchase", "renew-order"])
    .neq("processing_status", "processed")
    .lt("retry_count", MAX_RETRIES)
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);

  const logs = (data ?? []) as WebhookLog[];
  for (const log of logs) {
    await processWebhookLog(supabase, log);
  }

  return { attempted: logs.length };
}
