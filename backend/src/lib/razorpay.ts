import crypto from "crypto";

const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";
const PAISE_PER_RUPEE = 100;

export const isRazorpayConfigured = (): boolean =>
  Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

const authHeader = () => {
  const keyId = process.env.RAZORPAY_KEY_ID ?? "";
  const keySecret = process.env.RAZORPAY_KEY_SECRET ?? "";
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
};

export type RazorpayOrder = {
  id: string;
  amount: number;
  currency: string;
  status: string;
};

/**
 * Creates a Razorpay order via the REST API directly (no SDK dependency).
 * `amountRupees` is whole rupees; Razorpay expects the smallest currency
 * unit (paise), so it is converted here at the API boundary only.
 */
export const createRazorpayOrder = async (
  amountRupees: number,
  receipt: string
): Promise<RazorpayOrder> => {
  if (!isRazorpayConfigured()) {
    throw new Error("RAZORPAY_NOT_CONFIGURED");
  }

  const response = await fetch(`${RAZORPAY_API_BASE}/orders`, {
    method: "POST",
    headers: {
      Authorization: authHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: Math.round(amountRupees * PAISE_PER_RUPEE),
      currency: "INR",
      receipt,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Razorpay order creation failed: ${response.status} ${body}`);
  }

  return (await response.json()) as RazorpayOrder;
};

export const verifyPaymentSignature = ({
  orderId,
  paymentId,
  signature,
}: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean => {
  const keySecret = process.env.RAZORPAY_KEY_SECRET ?? "";
  const expected = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  return timingSafeEqualHex(expected, signature);
};

export const verifyWebhookSignature = (
  rawBody: Buffer | string,
  signature: string
): boolean => {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";
  if (!webhookSecret) {
    return false;
  }

  const expected = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  return timingSafeEqualHex(expected, signature);
};

const timingSafeEqualHex = (a: string, b: string): boolean => {
  const bufferA = Buffer.from(a, "hex");
  const bufferB = Buffer.from(b, "hex");

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufferA, bufferB);
};
