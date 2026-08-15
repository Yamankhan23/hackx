import { z } from "zod";

export const createPaymentOrderSchema = z.object({
  token: z.string().trim().min(1, "Token is required"),
});

export const verifyPaymentSchema = z.object({
  token: z.string().trim().min(1, "Token is required"),
  razorpay_order_id: z.string().trim().min(1),
  razorpay_payment_id: z.string().trim().min(1),
  razorpay_signature: z.string().trim().min(1),
});

export type CreatePaymentOrderInput = z.infer<typeof createPaymentOrderSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
