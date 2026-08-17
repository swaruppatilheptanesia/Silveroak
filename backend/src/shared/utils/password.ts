import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

const SALT_ROUNDS = 10;

// Base62 alphabet excluding ambiguous characters (0/O, 1/I/l).
const TEMP_PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const TEMP_PASSWORD_UPPERCASE = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
// Readable special characters — the pool the password policy requires (special = non-alphanumeric).
const TEMP_PASSWORD_SPECIALS = '@#$%&*';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Cryptographically random temp password. Avoids visually ambiguous
 * characters so the admin can read it off the screen without errors, and
 * satisfies the password policy: at least one uppercase letter and one
 * special character (so a generated credential is itself policy-compliant).
 */
export function generateTemporaryPassword(length = 16): string {
  const len = Math.max(length, 8);
  // One extra random byte each for choosing the guaranteed uppercase + special positions.
  const bytes = randomBytes(len + 4);
  const chars: string[] = [];
  for (let i = 0; i < len; i += 1) {
    chars[i] = TEMP_PASSWORD_ALPHABET[bytes[i] % TEMP_PASSWORD_ALPHABET.length];
  }

  // Force one uppercase and one special at two distinct positions.
  const upperPos = bytes[len] % len;
  let specialPos = bytes[len + 1] % len;
  if (specialPos === upperPos) specialPos = (specialPos + 1) % len;

  chars[upperPos] = TEMP_PASSWORD_UPPERCASE[bytes[len + 2] % TEMP_PASSWORD_UPPERCASE.length];
  chars[specialPos] = TEMP_PASSWORD_SPECIALS[bytes[len + 3] % TEMP_PASSWORD_SPECIALS.length];

  return chars.join('');
}
