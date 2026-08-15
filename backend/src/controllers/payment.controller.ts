import type { Request, Response } from "express";
import { ZodError } from "zod";
import {
  createPaymentOrderSchema,
  verifyPaymentSchema,
} from "../validators/payment.validator";
import {
  createPaymentOrder,
  handleRazorpayWebhook,
  verifyAndConfirmPayment,
} from "../services/payment.service";

const errorResponse = (res: Response, error: unknown) => {
  const code = error instanceof Error ? error.message : "UNKNOWN";

  const responses: Record<string, { status: number; message: string }> = {
    INVALID_TOKEN: { status: 404, message: "This link is invalid." },
    TOKEN_EXPIRED: {
      status: 410,
      message: "This link has expired. Please request a new one.",
    },
    TEAM_NOT_FOUND: { status: 404, message: "Team not found." },
    ALREADY_CONFIRMED: {
      status: 409,
      message: "This team's registration is already confirmed.",
    },
    NOT_READY_FOR_PAYMENT: {
      status: 409,
      message: "This team is not ready for payment yet.",
    },
    PAYMENT_NOT_CONFIGURED: {
      status: 503,
      message: "Payment is not available right now. Please try again later.",
    },
    ORDER_MISMATCH: {
      status: 409,
      message: "This payment session is out of date. Please refresh and try again.",
    },
    SIGNATURE_INVALID: {
      status: 400,
      message: "Payment verification failed. If money was deducted, contact support.",
    },
  };

  const mapped = responses[code];

  if (mapped) {
    return res
      .status(mapped.status)
      .json({ success: false, code, message: mapped.message });
  }

  console.error("Payment error:", error);
  return res.status(500).json({
    success: false,
    message: "Something went wrong processing your payment. Please try again.",
  });
};

export const createPaymentOrderController = async (
  req: Request,
  res: Response
) => {
  try {
    const { token } = createPaymentOrderSchema.parse(req.body);
    const order = await createPaymentOrder(token);

    return res.status(200).json({ success: true, data: order });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid request",
        errors: error.issues,
      });
    }

    return errorResponse(res, error);
  }
};

export const verifyPaymentController = async (
  req: Request,
  res: Response
) => {
  try {
    const parsed = verifyPaymentSchema.parse(req.body);
    const result = await verifyAndConfirmPayment({
      token: parsed.token,
      razorpayOrderId: parsed.razorpay_order_id,
      razorpayPaymentId: parsed.razorpay_payment_id,
      razorpaySignature: parsed.razorpay_signature,
    });

    return res.status(200).json({
      success: true,
      message: result.alreadyConfirmed
        ? "This team's registration is already confirmed."
        : "Payment verified. Your team's registration is confirmed!",
      data: result,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid request",
        errors: error.issues,
      });
    }

    return errorResponse(res, error);
  }
};

export const razorpayWebhookController = async (
  req: Request,
  res: Response
) => {
  try {
    const signature = req.headers["x-razorpay-signature"] as string | undefined;
    const rawBody = req.body as Buffer;

    await handleRazorpayWebhook(rawBody, signature);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    return res.status(400).json({ success: false });
  }
};
