import { LegalLayout, LegalSection } from "../../components/legal/LegalLayout";

export function ContactPage() {
  return (
    <LegalLayout title="Contact Us" updatedOn="September 19, 2026">
      <LegalSection heading="Get in touch">
        <p>
          For questions about registration, payments, or MUSA CodeX 2026 in
          general, reach out to us through any of the channels below.
        </p>
      </LegalSection>

      <LegalSection heading="Email">
        <p>
          <a href="mailto:musaforstudents@gmail.com" className="text-purple-300 hover:text-white">
            musaforstudents@gmail.com
          </a>
        </p>
      </LegalSection>

      <LegalSection heading="Phone">
        <p>
          Shifa Shaikh (President):{" "}
          <a href="tel:+918657224803" className="text-purple-300 hover:text-white">
            +91 86572 24803
          </a>
        </p>
      </LegalSection>

      <LegalSection heading="Address">
        <p>
          Global Mill Passage, Municipal School, Near Deepak Talkies,
          <br />
          Lower Parel, Mumbai 400013, Maharashtra, India
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
