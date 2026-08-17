import { z } from 'zod';

export const upsertNocTemplateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  subject: z.string().trim().min(1).max(500),
  body_html: z.string().trim().min(1).max(20000),
  branch_scope: z.string().trim().max(200).optional().nullable(),
});

export const postingTypeParamSchema = z.object({
  postingTypeMasterId: z.string().uuid('Invalid UUID format'),
});

export type UpsertNocTemplateInput = z.infer<typeof upsertNocTemplateSchema>;
