import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { payments, teamMembers, teams } from "../db/migrations/schema";
import { hashVerificationToken } from "../lib/verification-token";
import { REGISTRATION_FEE_RUPEES } from "../lib/constants";
import {
  createRazorpayOrder,
  fetchRazorpayPayment,
  isRazorpayConfigured,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "../lib/razorpay";
import { sendPaymentConfirmationEmail } from "./email.service";

const resolveLeaderTeamByToken = async (token: string) => {
  const tokenHash = hashVerificationToken(token);

  const [leader] = await db
    .select({
      id: teamMembers.id,
      role: teamMembers.role,
      teamId: teamMembers.teamId,
      email: teamMembers.email,
      fullName: teamMembers.fullName,
      emailVerificationExpiresAt: teamMembers.emailVerificationExpiresAt,
    })
    .from(teamMembers)
    .where(eq(teamMembers.emailVerificationTokenHash, tokenHash))
    .limit(1);

  if (!leader || leader.role !== "LEADER") {
    throw new Error("INVALID_TOKEN");
  }

  if (
    leader.emailVerificationExpiresAt &&
    new Date(leader.emailVerificationExpiresAt).getTime() < Date.now()
  ) {
    throw new Error("TOKEN_EXPIRED");
  }

  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, leader.teamId))
    .limit(1);

  if (!team) {
    throw new Error("TEAM_NOT_FOUND");
  }

  return { leader, team };
};

export const createPaymentOrder = async (token: string) => {
  const { team } = await resolveLeaderTeamByToken(token);

  if (team.status === "CONFIRMED") {
    throw new Error("ALREADY_CONFIRMED");
  }

  if (team.status !== "PENDING_PAYMENT") {
    throw new Error("NOT_READY_FOR_PAYMENT");
  }

  if (!isRazorpayConfigured()) {
    throw new Error("PAYMENT_NOT_CONFIGURED");
  }

  const [existingPayment] = await db
    .select()
    .from(payments)
    .where(eq(payments.teamId, team.id))
    .limit(1);

  if (existingPayment?.status === "SUCCESS") {
    throw new Error("ALREADY_CONFIRMED");
  }

  // Always mint a fresh Razorpay order on (re)entry to the payment page —
  // simpler and safer than trying to reuse a possibly-stale prior order,
  // and unpaid Razorpay orders simply expire unused.
  const order = await createRazorpayOrder(REGISTRATION_FEE_RUPEES, team.teamId);

  let paymentRowId: number;

  if (!existingPayment) {
    const [inserted] = await db
      .insert(payments)
      .values({
        paymentId: `TEMP-${Date.now()}`,
        teamId: team.id,
        razorpayOrderId: order.id,
        amount: REGISTRATION_FEE_RUPEES,
        currency: "INR",
        status: "CREATED",
      })
      .returning({ id: payments.id });

    paymentRowId = inserted.id;

    await db
      .update(payments)
      .set({ paymentId: `PAY-${String(paymentRowId).padStart(3, "0")}` })
      .where(eq(payments.id, paymentRowId));
  } else {
    paymentRowId = existingPayment.id;

    await db
      .update(payments)
      .set({
        razorpayOrderId: order.id,
        status: "CREATED",
      })
      .where(eq(payments.id, paymentRowId));
  }

  return {
    orderId: order.id,
    amount: REGISTRATION_FEE_RUPEES,
    currency: "INR",
    keyId: process.env.RAZORPAY_KEY_ID,
    teamId: team.teamId,
    teamName: team.teamName,
  };
};

export const verifyAndConfirmPayment = async (input: {
  token: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) => {
  const { leader, team } = await resolveLeaderTeamByToken(input.token);

  if (team.status === "CONFIRMED") {
    return { alreadyConfirmed: true };
  }

  if (team.status !== "PENDING_PAYMENT") {
    throw new Error("NOT_READY_FOR_PAYMENT");
  }

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.teamId, team.id))
    .limit(1);

  if (!payment || payment.razorpayOrderId !== input.razorpayOrderId) {
    throw new Error("ORDER_MISMATCH");
  }

  const signatureValid = verifyPaymentSignature({
    orderId: input.razorpayOrderId,
    paymentId: input.razorpayPaymentId,
    signature: input.razorpaySignature,
  });

  if (!signatureValid) {
    await db
      .update(payments)
      .set({ status: "FAILED" })
      .where(eq(payments.id, payment.id));
    throw new Error("SIGNATURE_INVALID");
  }

  // Best-effort: fetch the method straight from Razorpay now rather than
  // waiting on the webhook, which may be delayed or (e.g. local dev without
  // a public URL) never arrive at all. Never blocks payment confirmation.
  let method: string | null = null;
  try {
    const razorpayPayment = await fetchRazorpayPayment(input.razorpayPaymentId);
    method = razorpayPayment.method ?? null;
  } catch (error) {
    console.error("Failed to fetch payment method from Razorpay:", error);
  }

  await db
    .update(payments)
    .set({
      status: "SUCCESS",
      razorpayPaymentId: input.razorpayPaymentId,
      razorpaySignature: input.razorpaySignature,
      method,
      paidAt: new Date().toISOString(),
    })
    .where(eq(payments.id, payment.id));

  // .returning() here is the atomic signal that THIS call performed the
  // transition (guards against the client-side verify call and the webhook
  // racing each other) — only the caller that actually flips the status
  // sends the one confirmation email, to the leader only.
  const [transitioned] = await db
    .update(teams)
    .set({ status: "CONFIRMED" })
    .where(and(eq(teams.id, team.id), eq(teams.status, "PENDING_PAYMENT")))
    .returning({ id: teams.id });

  if (transitioned) {
    try {
      await sendPaymentConfirmationEmail({
        email: leader.email,
        name: leader.fullName,
        teamName: team.teamName,
        teamId: team.teamId,
        amount: REGISTRATION_FEE_RUPEES,
      });
    } catch (error) {
      console.error("Failed to send payment confirmation email:", error);
    }
  }

  return { alreadyConfirmed: false };
};

/**
 * Source of truth for payment confirmation: covers the case where the
 * browser closes (or the network drops) before the client-side verify
 * call completes, which would otherwise strand a paid team in
 * PENDING_PAYMENT forever.
 */
export const handleRazorpayWebhook = async (
  rawBody: Buffer,
  signature: string | undefined
) => {
  if (!signature || !verifyWebhookSignature(rawBody, signature)) {
    throw new Error("INVALID_SIGNATURE");
  }

  const event = JSON.parse(rawBody.toString("utf-8")) as {
    event?: string;
    payload?: {
      payment?: {
        entity?: {
          id: string;
          order_id: string;
          method?: string;
          error_description?: string;
        };
      };
    };
  };

  const paymentEntity = event.payload?.payment?.entity;
  if (!paymentEntity?.order_id) {
    return;
  }

  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.razorpayOrderId, paymentEntity.order_id))
    .limit(1);

  if (!payment) {
    return;
  }

  if (event.event === "payment.captured") {
    // The client-side verify call usually lands before this webhook does, so
    // status is often already SUCCESS by now — but the method still needs
    // backfilling, so it's updated unconditionally while paidAt stays
    // guarded to the first-time transition.
    const alreadyConfirmed = payment.status === "SUCCESS";

    await db
      .update(payments)
      .set({
        razorpayPaymentId: paymentEntity.id,
        method: paymentEntity.method ?? null,
        ...(alreadyConfirmed ? {} : { status: "SUCCESS", paidAt: new Date().toISOString() }),
      })
      .where(eq(payments.id, payment.id));

    // The WHERE guard below is the atomic, race-safe signal for "did THIS
    // call perform the transition" (it's what decides whether the client-side
    // verify call or this webhook wins the race) — always attempt it rather
    // than pre-gating on `alreadyConfirmed`, which reflects the payments
    // table and could be a beat out of sync with the teams table.
    const [transitioned] = await db
      .update(teams)
      .set({ status: "CONFIRMED" })
      .where(and(eq(teams.id, payment.teamId), eq(teams.status, "PENDING_PAYMENT")))
      .returning({ id: teams.id, teamName: teams.teamName, teamId: teams.teamId });

    if (transitioned) {
      const [leader] = await db
        .select({ email: teamMembers.email, fullName: teamMembers.fullName })
        .from(teamMembers)
        .where(and(eq(teamMembers.teamId, transitioned.id), eq(teamMembers.role, "LEADER")))
        .limit(1);

      if (leader) {
        try {
          await sendPaymentConfirmationEmail({
            email: leader.email,
            name: leader.fullName,
            teamName: transitioned.teamName,
            teamId: transitioned.teamId,
            amount: payment.amount,
          });
        } catch (error) {
          console.error("Failed to send payment confirmation email:", error);
        }
      }
    }
  } else if (event.event === "payment.failed") {
    await db
      .update(payments)
      .set({
        method: paymentEntity.method ?? null,
        failureReason: paymentEntity.error_description ?? null,
        ...(payment.status === "CREATED" || payment.status === "PENDING"
          ? { status: "FAILED" as const }
          : {}),
      })
      .where(eq(payments.id, payment.id));
  }
};
