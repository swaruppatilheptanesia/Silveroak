import { z } from 'zod';

/**
 * Password policy for any place a user SETS a password (sign-up / reset / change / admin-create).
 * NOT for login — existing weaker passwords must still sign in.
 *
 * Rules: at least 8 characters, one uppercase letter (A–Z), one special character (any
 * non-alphanumeric). ⚠ Mirrored on the backend in shared/schemas/common.ts (strongPasswordSchema)
 * — keep the two in sync; the server is authoritative.
 */

export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_POLICY_HINT =
  'At least 8 characters, one uppercase letter, and one special character.';

/**
 * Returns the first violated rule's message, or null when the password satisfies the policy.
 * Order matches the backend (length → uppercase → special) so FE and BE messages agree.
 */
export function getPasswordPolicyError(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return 'Password must be at least 8 characters.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter.';
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return 'Password must contain at least one special character.';
  }
  return null;
}

/** Zod field schema for forms that validate via zod (mirror of the backend strongPasswordSchema). */
export const strongPasswordFieldSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, 'Password must be at least 8 characters')
  .max(100, 'Password must be at most 100 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');
