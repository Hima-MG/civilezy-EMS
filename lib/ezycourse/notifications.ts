import { sendEmail } from "@/lib/email/send";

interface RenewalConfirmationParams {
  to: string;
  name: string;
  productName: string;
  price: number;
  currency: string;
  expiryDate: string | null;
}

export async function sendRenewalConfirmationEmail(params: RenewalConfirmationParams): Promise<{ sent: boolean }> {
  const formattedExpiry = params.expiryDate
    ? new Date(params.expiryDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : null;

  const html = `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
      <h2>Renewal confirmed</h2>
      <p>Hi ${params.name},</p>
      <p>Your renewal for <strong>${params.productName}</strong> has been processed.</p>
      <table style="width: 100%; margin: 16px 0;">
        <tr><td style="color: #666;">Amount</td><td style="text-align: right;">${params.currency} ${params.price.toFixed(2)}</td></tr>
        ${formattedExpiry ? `<tr><td style="color: #666;">Valid until</td><td style="text-align: right;">${formattedExpiry}</td></tr>` : ""}
      </table>
      <p>Thank you for staying with us.</p>
    </div>
  `.trim();

  return sendEmail({
    to: params.to,
    subject: `Renewal confirmed — ${params.productName}`,
    html,
  });
}
