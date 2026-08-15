import api from "./api";

export type PaymentOrder = {
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  teamId: string;
  teamName: string;
};

export async function createPaymentOrder(token: string): Promise<PaymentOrder> {
  const response = await api.post<{ success: boolean; data: PaymentOrder }>(
    "/teams/payment/order",
    { token }
  );
  return response.data.data;
}

export async function verifyPayment(payload: {
  token: string;
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  const response = await api.post<{ success: boolean; message: string }>(
    "/teams/payment/verify",
    payload
  );
  return response.data;
}
