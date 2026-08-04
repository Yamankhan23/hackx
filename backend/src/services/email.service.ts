import { Resend } from "resend";

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

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: "Verify your email – MUSA HackX 2026",
    html: `
      <h2>Welcome to MUSA HackX 2026, ${name}!</h2>

      <p>
        You have been added as a team member.
        Please verify your email address to continue with the registration.
      </p>

      <p>
        <a href="${verificationUrl}">
          Verify Email Address
        </a>
      </p>

      <p>This verification link will expire in 24 hours.</p>

      <p>
        If you did not expect this email, you can safely ignore it.
      </p>

      <p>Regards,<br>MUSA HackX 2026 Team</p>
    `,
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

  const { data, error } = await resend.emails.send({
    from: process.env.EMAIL_FROM!,
    to: email,
    subject: "Continue your application – MUSA HackX 2026",
    html: `
      <h2>Hi ${name},</h2>

      <p>
        You recently started a team registration for
        <strong>${teamName}</strong> but haven't submitted it yet.
      </p>

      <p>To continue where you left off, click the link below:</p>

      <p>
        <a href="${resumeUrl}">
          Continue Your Application
        </a>
      </p>

      <p>This link will expire in 24 hours.</p>

      <p>
        If you did not request this email, you can safely ignore it.
      </p>

      <p>Regards,<br>MUSA HackX 2026 Team</p>
    `,
  });

  if (error) {
    throw new Error(`Failed to send resume email: ${error.message}`);
  }

  return data;
};
