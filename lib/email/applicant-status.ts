import { buildPublicQuotePdfUrl } from "@/lib/quotes/public-pdf";

type ApplicantStatusEmailParams = {
  applicantEmail: string | null;
  applicantName: string | null;
  applicationNumber: string | null;
  status: string;
  summary: string;
  quoteId?: string | null;
  quoteNumber?: string | null;
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const statusTone = (status: string): string => {
  if (status === "approved" || status === "accepted") return "#22C55E";
  if (status === "referred" || status === "quote_ready") return "#EAB308";
  if (status === "declined") return "#EF4444";
  return "#0EA5E9";
};

const titleForStatus = (status: string): string => {
  if (status === "approved") return "Your application has been approved";
  if (status === "referred") return "Your application is under manual review";
  if (status === "declined") return "Your application has been declined";
  if (status === "accepted") return "Your quote has been accepted";
  if (status === "changes_requested") return "Changes were requested on your quote";
  return "Your RiskIQ application has an update";
};

export const sendApplicantStatusEmail = async ({
  applicantEmail,
  applicantName,
  applicationNumber,
  status,
  summary,
  quoteId,
  quoteNumber,
}: ApplicantStatusEmailParams): Promise<void> => {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim();

  if (!apiKey || !fromEmail || !applicantEmail) {
    return;
  }

  const quotePdfUrl = quoteId ? buildPublicQuotePdfUrl(quoteId, applicantEmail) : null;
  const subject = `${titleForStatus(status)}${applicationNumber ? ` - ${applicationNumber}` : ""}`;
  const safeName = escapeHtml(applicantName || "Applicant");
  const safeApplicationNumber = escapeHtml(applicationNumber || "Pending application");
  const safeSummary = escapeHtml(summary);
  const accent = statusTone(status);

  const html = `
    <div style="background:#f8fafc;padding:32px;font-family:DM Sans,Arial,sans-serif;color:#0f172a;">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;">
        <div style="padding:24px 28px;background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);color:#f8fafc;">
          <div style="font-size:12px;letter-spacing:0.2em;text-transform:uppercase;color:#38bdf8;">RiskIQ</div>
          <h1 style="margin:12px 0 4px;font-size:28px;line-height:1.2;">${escapeHtml(titleForStatus(status))}</h1>
          <p style="margin:0;color:#cbd5e1;">Application ${safeApplicationNumber}</p>
        </div>
        <div style="padding:28px;">
          <p style="margin-top:0;font-size:15px;">Hello ${safeName},</p>
          <div style="border:1px solid ${accent}33;background:${accent}12;border-radius:16px;padding:16px 18px;margin:16px 0;">
            <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.18em;color:${accent};font-weight:700;">Current status</div>
            <div style="margin-top:8px;font-size:24px;font-weight:700;color:${accent};text-transform:capitalize;">${escapeHtml(status.replaceAll("_", " "))}</div>
            <p style="margin:10px 0 0;color:#334155;line-height:1.6;">${safeSummary}</p>
          </div>
          ${
            quotePdfUrl
              ? `
                <div style="margin-top:20px;">
                  <p style="margin:0 0 12px;font-size:14px;color:#475569;">A quote is available for this application${quoteNumber ? ` (${escapeHtml(quoteNumber)})` : ""}.</p>
                  <a href="${quotePdfUrl}" style="display:inline-block;background:#0ea5e9;color:#ffffff;text-decoration:none;padding:12px 18px;border-radius:12px;font-weight:700;">
                    Download Quote PDF
                  </a>
                </div>
              `
              : ""
          }
          <p style="margin:24px 0 0;font-size:13px;color:#64748b;line-height:1.6;">
            This email was sent automatically by RiskIQ to keep you updated when your application or quote status changes.
          </p>
        </div>
      </div>
    </div>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [applicantEmail],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("sendApplicantStatusEmail error", errorText);
    }
  } catch (error: unknown) {
    console.error("sendApplicantStatusEmail error", error);
  }
};

