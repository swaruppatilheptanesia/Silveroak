/**
 * Shared helpers for parsing backend error envelopes and formatting them for users.
 *
 * The backend's standard error response is:
 *   { error: { code, message, details?: [{ field, message, code? }] } }
 *
 * Per-service ApiError classes (PostingApiError, OfferApiError, …) all carry
 * a `details` array. `formatApiErrorMessage` reads it structurally so it works
 * for any of them without per-class imports.
 */

export interface ApiErrorDetail {
  field: string;
  message: string;
  code?: string;
}

export interface ApiErrorEnvelope {
  message?: string;
  code?: string;
  details?: ApiErrorDetail[];
  error?: ApiErrorEnvelope;
}

export interface ParsedApiError {
  message: string;
  code: string;
  details: ApiErrorDetail[];
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function coerceDetails(value: unknown): ApiErrorDetail[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(isObject)
    .map((item) => ({
      field: typeof item.field === 'string' ? item.field : '',
      message: typeof item.message === 'string' ? item.message : '',
      code: typeof item.code === 'string' ? item.code : undefined,
    }))
    .filter((d) => d.message.length > 0);
}

/**
 * Extract `{ message, code, details }` from a backend response body.
 * Handles both flat (`{ message, code, details }`) and nested
 * (`{ error: { message, code, details } }`) shapes.
 */
export function parseApiErrorEnvelope(
  body: unknown,
  fallbackMessage = 'Request failed',
): ParsedApiError {
  const root = isObject(body) ? body : {};
  const inner = isObject(root.error) ? root.error : root;

  const message =
    (typeof inner.message === 'string' && inner.message) ||
    (typeof root.message === 'string' && root.message) ||
    fallbackMessage;

  const code =
    (typeof inner.code === 'string' && inner.code) ||
    (typeof root.code === 'string' && root.code) ||
    'UNKNOWN_ERROR';

  const details = coerceDetails(
    (isObject(inner) && inner.details) ?? (isObject(root) && root.details) ?? [],
  );

  return { message, code, details };
}

function formatDetail(detail: ApiErrorDetail): string {
  return detail.field ? `${detail.field}: ${detail.message}` : detail.message;
}

/**
 * Render any thrown error into a user-facing string. If the error carries a
 * non-empty `details` array (per-service ApiError classes do), join them with
 * ' · '. Otherwise fall back to `error.message` → fallback.
 */
export function formatApiErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  if (isObject(error) && Array.isArray((error as { details?: unknown }).details)) {
    const details = coerceDetails((error as { details: unknown }).details);
    if (details.length > 0) {
      return details.map(formatDetail).join(' · ');
    }
  }

  if (error instanceof Error && error.message) return error.message;
  if (typeof error === 'string' && error) return error;

  return fallback;
}
