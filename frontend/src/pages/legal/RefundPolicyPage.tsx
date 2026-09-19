import { LegalLayout, LegalSection } from "../../components/legal/LegalLayout";

export function RefundPolicyPage() {
  return (
    <LegalLayout title="Refund & Cancellation Policy" updatedOn="September 19, 2026">
      <LegalSection heading="No refunds">
        <p>
          All payments made for MUSA CodeX 2026 — including the ₹400 Round 2
          seat-confirmation fee — are <strong>final and non-refundable</strong>{" "}
          under any circumstance.
        </p>
      </LegalSection>

      <LegalSection heading="Reporting a payment discrepancy">
        <p>
          If you notice an issue with a payment (for example, a charge that
          doesn't match what you expected), you may email{" "}
          <a href="mailto:musaforstudents@gmail.com" className="text-purple-300 hover:text-white">
            musaforstudents@gmail.com
          </a>{" "}
          with your team ID, registered email, and Razorpay payment ID so we
          can look into it. Reporting a discrepancy does not guarantee a
          refund — all payments remain governed by the no-refund policy above.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
