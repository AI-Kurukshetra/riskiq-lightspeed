import { createHmac, timingSafeEqual } from "node:crypto";

const normalizeEmail = (value: string): string => value.trim().toLowerCase();

const getQuoteShareSecret = (): string | null => process.env.QUOTE_SHARE_SECRET?.trim() || null;

export const getPublicAppUrl = (): string => {
  const configured =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  return configured ? configured.replace(/\/$/, "") : "http://localhost:3000";
};

export const createQuotePdfToken = (quoteId: string, applicantEmail: string): string | null => {
  const secret = getQuoteShareSecret();
  if (!secret) {
    return null;
  }

  return createHmac("sha256", secret).update(`${quoteId}:${normalizeEmail(applicantEmail)}`).digest("hex");
};

export const verifyQuotePdfToken = (quoteId: string, applicantEmail: string, token: string): boolean => {
  const expected = createQuotePdfToken(quoteId, applicantEmail);
  if (!expected) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected, "utf8");
  const tokenBuffer = Buffer.from(token, "utf8");

  if (expectedBuffer.length !== tokenBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, tokenBuffer);
};

export const buildPublicQuotePdfUrl = (quoteId: string, applicantEmail: string): string | null => {
  const token = createQuotePdfToken(quoteId, applicantEmail);
  if (!token) {
    return null;
  }

  return `${getPublicAppUrl()}/api/quotes/${quoteId}/pdf?token=${token}`;
};

