import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../../config/env';
import { UserRole } from '@prisma/client';

export interface TokenPayload {
  user_id: string;
  tenant_id: string;
  role: UserRole;
  email: string;
  department?: string | null;
}

export function generateAccessToken(payload: TokenPayload): string {
  // expiresIn expects StringValue from 'ms' - cast is safe since env values follow the format (e.g. "15m")
  return jwt.sign({ ...payload }, env.jwtSecret, {
    expiresIn: env.jwtExpiry,
  } as jwt.SignOptions);
}

export function generateRefreshToken(payload: { user_id: string }): string {
  const expiryDays = env.refreshTokenExpiryDays || 7;
  return jwt.sign({ ...payload, jti: crypto.randomUUID() }, env.jwtSecret, {
    expiresIn: `${expiryDays}d`,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, env.jwtSecret) as TokenPayload;
}

export function getRefreshTokenExpiry(): Date {
  const days = env.refreshTokenExpiryDays || 7;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}
