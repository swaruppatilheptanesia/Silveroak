import { env } from '../../config/env';
import { logger } from '../../config/logger';

/**
 * ZeptoMail transactional-email transport (https://api.zeptomail.in/v1.1/email).
 *
 * Uses the built-in global `fetch` (Node 18+), mirroring the CRM `fetchCrmList` pattern — no extra
 * npm dependency. The auth token (`env.mailZeptoToken`) is the FULL `Zoho-enczapikey …` header value and
 * is a SECRET (configured in .env only). When it is unset, `mailEnabled()` is false and callers fall back
 * to their dev behaviour instead of attempting a send.
 */

export interface SendEmailInput {
  to: string;
  toName?: string;
  subject: string;
  htmlBody: string;
}

/** True when a ZeptoMail token is configured, i.e. real email can be sent. */
export function mailEnabled(): boolean {
  return Boolean(env.mailZeptoToken);
}

/**
 * Sends one HTML email via ZeptoMail. Throws on a misconfigured transport or a non-2xx / unreachable API
 * so the caller can react (e.g. fail an OTP request rather than pretend it was delivered).
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  if (!mailEnabled()) {
    throw new Error('Email transport is not configured (MAIL_ZEPTO_TOKEN is empty)');
  }

  const payload = {
    from: { address: env.mailFromAddress, name: env.mailFromName },
    to: [{ email_address: { address: input.to, name: input.toName ?? input.to } }],
    subject: input.subject,
    htmlbody: input.htmlBody,
  };

  let response: Response;
  try {
    response = await fetch(env.mailZeptoUrl, {
      method: 'POST',
      headers: {
        Authorization: env.mailZeptoToken,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    logger.error({ err }, 'ZeptoMail request failed to reach the mail service');
    throw new Error('Unable to reach the email service');
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    logger.error({ status: response.status, detail }, 'ZeptoMail returned a non-2xx response');
    throw new Error(`Email service responded with ${response.status}`);
  }
}
