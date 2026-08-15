/**
 * Shared branded layout for outbound emails. Inline styles only — most
 * email clients strip <style> blocks / external CSS, so this keeps
 * rendering consistent across Gmail, Outlook, Apple Mail, etc.
 */
export const renderEmailLayout = ({
  preheader,
  heading,
  bodyHtml,
  ctaLabel,
  ctaUrl,
  footerNote,
}: {
  preheader: string;
  heading: string;
  bodyHtml: string;
  ctaLabel: string;
  ctaUrl: string;
  footerNote: string;
}) => `
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
  <div style="background:#f1f2f8;padding:32px 16px;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(15,23,42,0.08);">
      <div style="background:#5b21b6;padding:28px 32px;">
        <p style="margin:0;color:#e9d5ff;font-size:11px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;">MUSA CodeX 2026</p>
        <h1 style="margin:10px 0 0;color:#ffffff;font-size:22px;font-weight:700;line-height:1.3;">${heading}</h1>
      </div>
      <div style="padding:32px;color:#1e293b;font-size:15px;line-height:1.65;">
        ${bodyHtml}
        <div style="text-align:center;margin:28px 0 8px;">
          <a href="${ctaUrl}" style="display:inline-block;background:#7c3aed;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:14px 32px;border-radius:10px;">${ctaLabel}</a>
        </div>
        <p style="margin:16px 0 0;font-size:12px;color:#94a3b8;">
          Or paste this link into your browser:<br>
          <span style="word-break:break-all;color:#7c3aed;">${ctaUrl}</span>
        </p>
      </div>
      <div style="padding:18px 32px;background:#f8fafc;border-top:1px solid #eef2f7;">
        <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.5;">${footerNote}</p>
      </div>
    </div>
  </div>
`;
