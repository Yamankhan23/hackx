import { and, eq, ne } from "drizzle-orm";
import crypto from "crypto";
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
import { enqueueEmailJob } from "./email-queue.service";
import { logger } from "../lib/logger";

// Date.now() alone has only millisecond resolution — under a launch spike,
// two concurrent payment-order creations landing in the same millisecond
// would collide on the payments.payment_id unique constraint.
const randomSuffix = () => crypto.randomInt(100000, 999999);

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
    .select({ status: payments.status })
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

  // Upsert on the team's (unique) payment row instead of select-then-branch:
  // two concurrent calls for the same team (double-click, a slow in-flight
  // request racing a webhook that just confirmed payment) can no longer
  // interleave into a lost update, and `setWhere` guarantees this can never
  // downgrade a row a webhook/verify already marked SUCCESS back to CREATED.
  const [row] = await db
    .insert(payments)
    .values({
      paymentId: `TEMP-${Date.now()}-${randomSuffix()}`,
      teamId: team.id,
      razorpayOrderId: order.id,
      amount: REGISTRATION_FEE_RUPEES,
      currency: "INR",
      status: "CREATED",
    })
    .onConflictDoUpdate({
      target: payments.teamId,
      set: { razorpayOrderId: order.id, status: "CREATED" },
      setWhere: ne(payments.status, "SUCCESS"),
    })
    .returning({ id: payments.id, paymentId: payments.paymentId });

  if (!row) {
    // Conflict existed and setWhere blocked the update: a concurrent
    // request already confirmed this payment.
    throw new Error("ALREADY_CONFIRMED");
  }

  if (row.paymentId.startsWith("TEMP-")) {
    await db
      .update(payments)
      .set({ paymentId: `PAY-${String(row.id).padStart(3, "0")}` })
      .where(eq(payments.id, row.id));
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

// Resolves the team/leader for a verify call primarily via the Razorpay
// order id, not the leader token: the token can be reminted by an unrelated
// "resend my link" request while checkout is still in progress with
// Razorpay, and the order id (which the frontend always has, straight from
// the checkout response) is stable regardless. The token is only a fallback
// for producing a sensible error when the order id doesn't resolve to
// anything — it plays no role once a payment row is found, since the
// signature check right after this is the actual security boundary.
const resolveTeamAndLeaderForVerify = async (input: {
  token: string;
  razorpayOrderId: string;
}) => {
  const [payment] = await db
    .select()
    .from(payments)
    .where(eq(payments.razorpayOrderId, input.razorpayOrderId))
    .limit(1);

  if (!payment) {
    const { leader, team } = await resolveLeaderTeamByToken(input.token);
    return { payment: null, team, leader };
  }

  const [team] = await db
    .select()
    .from(teams)
    .where(eq(teams.id, payment.teamId))
    .limit(1);

  if (!team) {
    throw new Error("TEAM_NOT_FOUND");
  }

  const [leader] = await db
    .select({ email: teamMembers.email, fullName: teamMembers.fullName })
    .from(teamMembers)
    .where(and(eq(teamMembers.teamId, team.id), eq(teamMembers.role, "LEADER")))
    .limit(1);

  if (!leader) {
    throw new Error("TEAM_NOT_FOUND");
  }

  return { payment, team, leader };
};

export const verifyAndConfirmPayment = async (input: {
  token: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) => {
  const { payment, team, leader } = await resolveTeamAndLeaderForVerify(input);

  if (team.status === "CONFIRMED") {
    return { alreadyConfirmed: true };
  }

  if (team.status !== "PENDING_PAYMENT") {
    throw new Error("NOT_READY_FOR_PAYMENT");
  }

  if (!payment) {
    throw new Error("ORDER_MISMATCH");
  }

  const signatureValid = verifyPaymentSignature({
    orderId: input.razorpayOrderId,
    paymentId: input.razorpayPaymentId,
    signature: input.razorpaySignature,
  });

  if (!signatureValid) {
    // Guarded so this can't clobber a SUCCESS row the webhook already
    // confirmed a beat earlier (this call's signature check racing behind it).
    await db
      .update(payments)
      .set({ status: "FAILED" })
      .where(and(eq(payments.id, payment.id), ne(payments.status, "SUCCESS")));
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
    logger.error({ err: error }, "Failed to fetch payment method from Razorpay");
  }

  // Payment-row update, team-status transition, and email-job enqueue all
  // commit together — if the process died between separate statements here,
  // a team could be stuck at PENDING_PAYMENT forever with payments.status
  // already SUCCESS and no automatic recovery.
  const transitioned = await db.transaction(async (tx) => {
    await tx
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
    // enqueues the one confirmation email, to the leader only.
    const [row] = await tx
      .update(teams)
      .set({ status: "CONFIRMED" })
      .where(and(eq(teams.id, team.id), eq(teams.status, "PENDING_PAYMENT")))
      .returning({ id: teams.id });

    return row;
  });

  if (transitioned) {
    // Keyed on the actual charge, not just the team: a legitimate second
    // payment (e.g. after an admin resets a team back to PENDING_PAYMENT
    // post-refund) gets its own razorpayPaymentId and so still gets an email,
    // instead of being silently dropped by a dedupe row from the first charge.
    await enqueueEmailJob({
      emailType: "payment_confirmation",
      recipient: leader.email,
      dedupeKey: `payment_confirmation:${team.id}:${input.razorpayPaymentId}`,
      payload: {
        email: leader.email,
        name: leader.fullName,
        teamName: team.teamName,
        teamId: team.teamId,
        amount: REGISTRATION_FEE_RUPEES,
      },
    });
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

    // Payment-row update, team-status transition, and email-job enqueue all
    // commit together (see the same pattern/rationale in
    // verifyAndConfirmPayment above). The webhook stays fast either way —
    // this is all DB work, no external calls, and the email itself is sent
    // later by the background worker, never awaited here.
    const transitioned = await db.transaction(async (tx) => {
      await tx
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
      const [row] = await tx
        .update(teams)
        .set({ status: "CONFIRMED" })
        .where(and(eq(teams.id, payment.teamId), eq(teams.status, "PENDING_PAYMENT")))
        .returning({ id: teams.id, teamName: teams.teamName, teamId: teams.teamId });

      return row;
    });

    if (transitioned) {
      const [leader] = await db
        .select({ email: teamMembers.email, fullName: teamMembers.fullName })
        .from(teamMembers)
        .where(and(eq(teamMembers.teamId, transitioned.id), eq(teamMembers.role, "LEADER")))
        .limit(1);

      if (leader) {
        await enqueueEmailJob({
          emailType: "payment_confirmation",
          recipient: leader.email,
          dedupeKey: `payment_confirmation:${transitioned.id}:${paymentEntity.id}`,
          payload: {
            email: leader.email,
            name: leader.fullName,
            teamName: transitioned.teamName,
            teamId: transitioned.teamId,
            amount: payment.amount,
          },
        });
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
