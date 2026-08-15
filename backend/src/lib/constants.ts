export const VERIFICATION_EXPIRY_HOURS = 24;

// Flat registration fee per team, charged once by the team leader after
// every member has verified their email. Stored/quoted in whole rupees;
// converted to paise only at the Razorpay API boundary (see lib/razorpay.ts).
export const REGISTRATION_FEE_RUPEES = 400;
