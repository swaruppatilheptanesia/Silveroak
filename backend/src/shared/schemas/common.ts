import { z } from 'zod';

export const uuidSchema = z.string().uuid('Invalid UUID format');

export const emailSchema = z.string().email('Invalid email format').max(255);

export const phoneSchema = z
  .string()
  .regex(/^\+?[\d\s-]{7,20}$/, 'Invalid phone number format')
  .optional()
  .nullable();

export const urlSchema = z.string().url('Invalid URL format').optional().nullable();

// Password policy for any place a user SETS a password (signup / reset / change / admin-create).
// NOT used for login (existing weaker passwords must still sign in). Special char = any
// non-alphanumeric. ⚠ Mirrored on the FE in src/lib/passwordPolicy.ts — keep the two in sync.
export const strongPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password must be at most 100 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character');

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const dateRangeSchema = z.object({
  date_from: z.coerce.date().optional(),
  date_to: z.coerce.date().optional(),
});

export const searchSchema = z.object({
  search: z.string().max(200).optional(),
});

export const sortSchema = z.object({
  sort_by: z.string().max(50).optional(),
  sort_order: z.enum(['asc', 'desc']).default('asc'),
});

export const uuidParamSchema = z.object({
  id: uuidSchema,
});
