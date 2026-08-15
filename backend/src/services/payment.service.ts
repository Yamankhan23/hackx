import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { payments, teamMembers, teams } from "../db/migrations/schema";
import { hashVerificationToken } from "../lib/verification-token";
import { REGISTRATION_FEE_RUPEES } from "../lib/constants";
import {
  createRazorpayOrder,
  isRazorpayConfigured,
  verifyPaymentSignature,
  verifyWebhookSignature,
} from "../lib/razorpay";

const resolveLeaderTeamByToken = async (token: string) => {
  const tokenHash = hashVerificationToken(token);

  const [leader] = await db
    .select({
      id: teamMembers.id,
      role: teamMembers.role,
      teamId: teamMembers.teamId,
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
  const { team } = await resolveLeaderTeamByToken(input.token);

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

  await db
    .update(payments)
    .set({
      status: "SUCCESS",
      razorpayPaymentId: input.razorpayPaymentId,
      razorpaySignature: input.razorpaySignature,
      paidAt: new Date().toISOString(),
    })
    .where(eq(payments.id, payment.id));

  await db
    .update(teams)
    .set({ status: "CONFIRMED" })
    .where(and(eq(teams.id, team.id), eq(teams.status, "PENDING_PAYMENT")));

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
    payload?: { payment?: { entity?: { id: string; order_id: string } } };
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
    if (payment.status !== "SUCCESS") {
      await db
        .update(payments)
        .set({
          status: "SUCCESS",
          razorpayPaymentId: paymentEntity.id,
          paidAt: new Date().toISOString(),
        })
        .where(eq(payments.id, payment.id));

      await db
        .update(teams)
        .set({ status: "CONFIRMED" })
        .where(
          and(eq(teams.id, payment.teamId), eq(teams.status, "PENDING_PAYMENT"))
        );
    }
  } else if (event.event === "payment.failed") {
    if (payment.status === "CREATED" || payment.status === "PENDING") {
      await db
        .update(payments)
        .set({ status: "FAILED" })
        .where(eq(payments.id, payment.id));
    }
  }
};
