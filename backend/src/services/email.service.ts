import { Resend } from "resend";
import { escapeHtml } from "../lib/html";
import { renderEmailLayout } from "../lib/email-template";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendVerificationEmail = async ({
  email,
  name,
  verificationToken,
}: {
  email: string;
  name: string;
  verificationToken: string;
}) => {
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
  const safeName = escapeHtml(name);

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: "Verify your email – MUSA CodeX 2026",
    html: renderEmailLayout({
      preheader: "Verify your email to continue your MUSA CodeX 2026 registration.",
      heading: `Welcome, ${safeName}!`,
      bodyHtml: `
        <p style="margin:0 0 12px;">
          You've been added as a team member for <strong>MUSA CodeX 2026</strong>.
          Please verify your email address to continue with the registration.
        </p>
      `,
      ctaLabel: "Verify Email Address",
      ctaUrl: verificationUrl,
      footerNote:
        "This link expires in 24 hours. If you didn't expect this email, you can safely ignore it. — MUSA CodeX 2026 Team",
    }),
  });

  if (error) {
    throw new Error(`Failed to send verification email: ${error.message}`);
  }

  return data;
};

export const sendApplicationResumeEmail = async ({
  email,
  name,
  teamName,
  resumeToken,
}: {
  email: string;
  name: string;
  teamName: string;
  resumeToken: string;
}) => {
  const resumeUrl = `${process.env.FRONTEND_URL}/resume?token=${resumeToken}`;
  const safeName = escapeHtml(name);
  const safeTeamName = escapeHtml(teamName);

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: "Continue your application – MUSA CodeX 2026",
    html: renderEmailLayout({
      preheader: `Pick up where you left off on ${safeTeamName}'s registration.`,
      heading: `Hi ${safeName},`,
      bodyHtml: `
        <p style="margin:0 0 12px;">
          You recently started a team registration for <strong>${safeTeamName}</strong> but
          haven't submitted it yet.
        </p>
        <p style="margin:0;">To continue where you left off, use the button below:</p>
      `,
      ctaLabel: "Continue Your Application",
      ctaUrl: resumeUrl,
      footerNote:
        "This link expires in 24 hours. If you didn't request this email, you can safely ignore it. — MUSA CodeX 2026 Team",
    }),
  });

  if (error) {
    throw new Error(`Failed to send resume email: ${error.message}`);
  }

  return data;
};

export const sendPaymentLinkEmail = async ({
  email,
  name,
  teamName,
  amount,
  paymentToken,
}: {
  email: string;
  name: string;
  teamName: string;
  amount: number;
  paymentToken: string;
}) => {
  const paymentUrl = `${process.env.FRONTEND_URL}/resume?token=${paymentToken}`;
  const safeName = escapeHtml(name);
  const safeTeamName = escapeHtml(teamName);

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: "Your team is verified — complete payment – MUSA CodeX 2026",
    html: renderEmailLayout({
      preheader: `${safeTeamName} is fully verified — complete payment to confirm your spot.`,
      heading: `Great news, ${safeName}!`,
      bodyHtml: `
        <p style="margin:0 0 12px;">
          Every member of <strong>${safeTeamName}</strong> has verified their email.
          You're one step away from confirming your team's registration.
        </p>
        <p style="margin:0;">
          Complete the registration fee of <strong>₹${amount}</strong> to confirm your spot:
        </p>
      `,
      ctaLabel: `Pay ₹${amount} Now`,
      ctaUrl: paymentUrl,
      footerNote:
        "This link expires in 24 hours — you can request a new one anytime from the homepage. — MUSA CodeX 2026 Team",
    }),
  });

  if (error) {
    throw new Error(`Failed to send payment link email: ${error.message}`);
  }

  return data;
};
