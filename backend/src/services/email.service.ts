import { escapeHtml } from "../lib/html";
import { renderEmailLayout } from "../lib/email-template";

const BREVO_SEND_URL = "https://api.brevo.com/v3/smtp/email";

// EMAIL_FROM is "Name <email>" (matches the format the old Resend client
// took directly); Brevo's API wants sender name/email split out.
const parseSender = (raw: string): { name?: string; email: string } => {
  const match = raw.match(/^(.*)<(.+)>$/);
  if (!match) return { email: raw.trim() };

  const name = match[1].trim().replace(/^"|"$/g, "");
  return { name: name || undefined, email: match[2].trim() };
};

const sender = parseSender(process.env.EMAIL_FROM ?? "");

const sendViaBrevo = async ({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) => {
  const response = await fetch(BREVO_SEND_URL, {
    method: "POST",
    headers: {
      "api-key": process.env.BREVO_API_KEY!,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      sender,
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Brevo API responded ${response.status}: ${body}`);
  }

  return response.json();
};

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

  try {
    return await sendViaBrevo({
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
          "This link expires in 3 days. If you didn't expect this email, you can safely ignore it. — MUSA CodeX 2026 Team",
      }),
    });
  } catch (error) {
    throw new Error(`Failed to send verification email: ${(error as Error).message}`);
  }
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

  try {
    return await sendViaBrevo({
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
          "This link expires in 3 days. If you didn't request this email, you can safely ignore it. — MUSA CodeX 2026 Team",
      }),
    });
  } catch (error) {
    throw new Error(`Failed to send resume email: ${(error as Error).message}`);
  }
};

export const sendConfirmRegistrationEmail = async ({
  email,
  name,
  teamName,
  confirmToken,
}: {
  email: string;
  name: string;
  teamName: string;
  confirmToken: string;
}) => {
  const confirmUrl = `${process.env.FRONTEND_URL}/confirm?token=${confirmToken}`;
  const safeName = escapeHtml(name);
  const safeTeamName = escapeHtml(teamName);

  try {
    return await sendViaBrevo({
      to: email,
      subject: "Confirm your registration – MUSA CodeX 2026",
      html: renderEmailLayout({
        preheader: `Confirm ${safeTeamName}'s registration for MUSA CodeX 2026 Round 1.`,
        heading: `Almost there, ${safeName}!`,
        bodyHtml: `
          <p style="margin:0 0 12px;">
            <strong>${safeTeamName}</strong> has been submitted for MUSA CodeX 2026 — Round 1.
            Confirm your registration below to lock in your team's spot.
          </p>
          <p style="margin:0;">
            Round 1 is free, so there's nothing to pay — just confirm to finish up.
          </p>
        `,
        ctaLabel: "Confirm Registration",
        ctaUrl: confirmUrl,
        footerNote:
          "This link expires in 3 days. If you didn't request this, you can safely ignore it. — MUSA CodeX 2026 Team",
      }),
    });
  } catch (error) {
    throw new Error(`Failed to send confirmation email: ${(error as Error).message}`);
  }
};

export const sendRegistrationConfirmationEmail = async ({
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
  const editUrl = `${process.env.FRONTEND_URL}/resume?token=${resumeToken}`;
  const safeName = escapeHtml(name);
  const safeTeamName = escapeHtml(teamName);

  try {
    return await sendViaBrevo({
      to: email,
      subject: "You're registered! – MUSA CodeX 2026",
      html: renderEmailLayout({
        preheader: `${safeTeamName} is registered for MUSA CodeX 2026 Round 1 — no payment or verification needed.`,
        heading: `You're in, ${safeName}!`,
        bodyHtml: `
          <p style="margin:0 0 12px;">
            <strong>${safeTeamName}</strong>'s registration for MUSA CodeX 2026 — Round 1 is confirmed.
            Round 1 is free, so there's nothing more to verify or pay.
          </p>
          <p style="margin:0 0 12px;">
            Need to fix a typo or swap a member? Use the button below anytime to review and edit your team's details.
          </p>
          <p style="margin:0;">
            Don't forget to upload your team's presentation (PPT) from the same page once it's ready.
          </p>
        `,
        ctaLabel: "View / Edit Your Team",
        ctaUrl: editUrl,
        footerNote:
          "You can request a new link anytime from the homepage if this one stops working. — MUSA CodeX 2026 Team",
      }),
    });
  } catch (error) {
    throw new Error(`Failed to send registration confirmation email: ${(error as Error).message}`);
  }
};

export const sendRound2SelectionEmail = async ({
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

  try {
    return await sendViaBrevo({
      to: email,
      subject: "You're through to Round 2! – MUSA CodeX 2026",
      html: renderEmailLayout({
        preheader: `${safeTeamName} has been selected for Round 2 — complete payment to confirm your seat.`,
        heading: `Congratulations, ${safeName}!`,
        bodyHtml: `
          <p style="margin:0 0 12px;">
            <strong>${safeTeamName}</strong> has been selected to advance to <strong>Round 2</strong> of
            MUSA CodeX 2026.
          </p>
          <p style="margin:0;">
            Complete the registration fee of <strong>₹${amount}</strong> below to confirm your team's seat
            for Round 2:
          </p>
        `,
        ctaLabel: `Pay ₹${amount} & Confirm Seat`,
        ctaUrl: paymentUrl,
        footerNote:
          "This link expires in 3 days — you can request a new one anytime from the homepage. — MUSA CodeX 2026 Team",
      }),
    });
  } catch (error) {
    throw new Error(`Failed to send Round 2 selection email: ${(error as Error).message}`);
  }
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

  try {
    return await sendViaBrevo({
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
          "This link expires in 3 days — you can request a new one anytime from the homepage. — MUSA CodeX 2026 Team",
      }),
    });
  } catch (error) {
    throw new Error(`Failed to send payment link email: ${(error as Error).message}`);
  }
};

export const sendPaymentConfirmationEmail = async ({
  email,
  name,
  teamName,
  teamId,
  amount,
}: {
  email: string;
  name: string;
  teamName: string;
  teamId: string | null;
  amount: number;
}) => {
  const safeName = escapeHtml(name);
  const safeTeamName = escapeHtml(teamName);

  try {
    return await sendViaBrevo({
      to: email,
      subject: "Payment confirmed — you're in! – MUSA CodeX 2026",
      html: renderEmailLayout({
        preheader: `${safeTeamName}'s registration is confirmed for MUSA CodeX 2026.`,
        heading: `You're confirmed, ${safeName}!`,
        bodyHtml: `
          <p style="margin:0 0 12px;">
            We've received your payment of <strong>₹${amount}</strong> and <strong>${safeTeamName}</strong>'s
            registration for MUSA CodeX 2026 is now confirmed.
          </p>
          ${teamId ? `<p style="margin:0 0 12px;">Team ID: <strong>${escapeHtml(teamId)}</strong></p>` : ""}
          <p style="margin:0;">We'll be in touch with further details as the event approaches. See you there!</p>
        `,
        ctaLabel: "Visit MUSA CodeX 2026",
        ctaUrl: process.env.FRONTEND_URL!,
        footerNote:
          "This is a confirmation of your team's payment — no action is needed. — MUSA CodeX 2026 Team",
      }),
    });
  } catch (error) {
    throw new Error(`Failed to send payment confirmation email: ${(error as Error).message}`);
  }
};
