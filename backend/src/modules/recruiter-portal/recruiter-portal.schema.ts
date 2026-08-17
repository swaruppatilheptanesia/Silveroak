import { z } from 'zod';

export const updateRecruiterProfileSchema = z.object({
  phone: z.string().regex(/^\+?[\d\s-]{7,20}$/).optional().nullable(),
  designation: z.string().max(100).optional().nullable(),
});

export type UpdateRecruiterProfileInput = z.infer<typeof updateRecruiterProfileSchema>;
