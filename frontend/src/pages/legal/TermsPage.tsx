import { LegalLayout, LegalSection } from "../../components/legal/LegalLayout";

export function TermsPage() {
  return (
    <LegalLayout title="Terms & Conditions" updatedOn="September 19, 2026">
      <LegalSection heading="Acceptance of terms">
        <p>
          By registering for MUSA CodeX 2026 through hackathon.musforstudents.in,
          you agree to these Terms & Conditions. If you do not agree, please do
          not register.
        </p>
      </LegalSection>

      <LegalSection heading="Eligibility">
        <p>
          MUSA CodeX 2026 is open to currently enrolled college students who
          register as a team, meeting any team-size and domain requirements
          published on the website.
        </p>
      </LegalSection>

      <LegalSection heading="Registration & rounds">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>Round 1 registration is free of charge.</li>
          <li>
            Teams selected to advance to Round 2 must pay a seat-confirmation
            fee of ₹400 to confirm their participation, as communicated via
            email.
          </li>
          <li>
            The organizers reserve the right to verify eligibility, team
            details, and submissions at any stage, and to disqualify a team
            for inaccurate information or violation of these terms.
          </li>
        </ul>
      </LegalSection>

      <LegalSection heading="Code of conduct">
        <p>
          Participants are expected to behave professionally and respectfully
          toward organizers, judges, mentors, and fellow participants.
          Plagiarism or submission of prior/copied work as original is
          prohibited and may result in disqualification.
        </p>
      </LegalSection>

      <LegalSection heading="Changes to the event">
        <p>
          The organizers may modify the schedule, format, problem statements,
          or judging criteria of MUSA CodeX 2026 if required, and will
          communicate significant changes to registered teams via email.
        </p>
      </LegalSection>

      <LegalSection heading="Payments">
        <p>
          Payments are processed securely via Razorpay. Please refer to our{" "}
          <a href="/refund-policy" className="text-purple-300 hover:text-white">
            Refund & Cancellation Policy
          </a>{" "}
          for details on refunds.
        </p>
      </LegalSection>

      <LegalSection heading="Limitation of liability">
        <p>
          MUSA and its organizing team are not liable for any indirect,
          incidental, or consequential loss arising from participation in
          MUSA CodeX 2026, to the extent permitted by law.
        </p>
      </LegalSection>

      <LegalSection heading="Contact us">
        <p>
          Questions about these terms can be sent to{" "}
          <a href="mailto:musaforstudents@gmail.com" className="text-purple-300 hover:text-white">
            musaforstudents@gmail.com
          </a>.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
