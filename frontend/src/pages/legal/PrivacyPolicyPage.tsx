import { LegalLayout, LegalSection } from "../../components/legal/LegalLayout";

export function PrivacyPolicyPage() {
  return (
    <LegalLayout title="Privacy Policy" updatedOn="September 19, 2026">
      <LegalSection heading="Overview">
        <p>
          This Privacy Policy explains how MUSA (Maharashtra University Students
          Association) collects, uses, and protects the information you share
          with us when registering for MUSA CodeX 2026 at hackathon.musforstudents.in.
        </p>
      </LegalSection>

      <LegalSection heading="Information we collect">
        <p>During registration and participation, we collect:</p>
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Team and member details: full name, email address, phone number, college, branch, and year of study</li>
          <li>Problem statement / domain selections and submitted presentations (PPTs)</li>
          <li>Payment-related details processed via Razorpay (see below)</li>
          <li>Basic technical data such as IP address and browser type, for security and fraud prevention</li>
        </ul>
      </LegalSection>

      <LegalSection heading="How we use your information">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>To verify and confirm your team's registration</li>
          <li>To communicate updates about rounds, deadlines, and results via email</li>
          <li>To process the seat-confirmation payment and send payment receipts</li>
          <li>To evaluate submitted problem statements and PPTs</li>
        </ul>
      </LegalSection>

      <LegalSection heading="Payment information">
        <p>
          Payments are processed by Razorpay, a PCI-DSS compliant payment
          gateway. We do not store your card, UPI, or net-banking credentials
          on our servers — Razorpay handles this directly, and we only receive
          confirmation of a successful or failed payment.
        </p>
      </LegalSection>

      <LegalSection heading="Data sharing">
        <p>
          We do not sell or rent your personal information. Data is shared
          only with Razorpay (to process payments) and Brevo (our current
          email service provider, to deliver registration and confirmation
          emails), strictly for the purposes described above.
        </p>
        <p>
          Resend, our previous email service provider, processed
          registration-related emails prior to our migration to Brevo and may
          retain that historical data in line with its own retention policy.
        </p>
      </LegalSection>

      <LegalSection heading="Data retention">
        <p>
          We retain registration and payment records for as long as necessary
          to run MUSA CodeX 2026 and to meet accounting/compliance
          requirements, after which they may be archived or deleted.
        </p>
      </LegalSection>

      <LegalSection heading="Contact us">
        <p>
          For questions about this Privacy Policy or your data, contact us at{" "}
          <a href="mailto:musaforstudents@gmail.com" className="text-purple-300 hover:text-white">
            musaforstudents@gmail.com
          </a>{" "}
          or +91 86572 24803.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
