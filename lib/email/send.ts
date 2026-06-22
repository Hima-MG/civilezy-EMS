// Minimal email abstraction over Resend's HTTP API — no SDK dependency,
// just a fetch call, since the project has no email provider configured
// yet. If you use a different provider, swap the fetch call below; the
// call sites (lib/ezycourse/notifications.ts) don't need to change.
//
// Required env vars: RESEND_API_KEY, EZYCOURSE_NOTIFY_FROM_EMAIL
// Without them, this no-ops (logs and returns sent: false) rather than
// throwing — a missing email provider should never fail webhook processing.

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<{ sent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EZYCOURSE_NOTIFY_FROM_EMAIL;

  if (!apiKey || !from) {
    console.warn(`Email not sent (no provider configured) — subject="${subject}" to="${to}"`);
    return { sent: false };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error(`Email send failed (${response.status}): ${text}`);
    return { sent: false };
  }

  return { sent: true };
}
