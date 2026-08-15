// Minimal shape for the Razorpay Standard Checkout script loaded via
// index.html (https://checkout.razorpay.com/v1/checkout.js). Razorpay
// doesn't publish official types for the browser SDK.
type RazorpayCheckoutOptions = {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  order_id: string;
  handler: (response: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  }) => void;
  prefill?: { name?: string; email?: string };
  theme?: { color?: string };
  modal?: { ondismiss?: () => void };
};

type RazorpayCheckoutInstance = {
  open: () => void;
};

interface Window {
  Razorpay: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
}
