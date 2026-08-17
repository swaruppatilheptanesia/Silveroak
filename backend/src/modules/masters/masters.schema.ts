import { MasterCategory } from '@prisma/client';
import { z } from 'zod';

const masterCategorySchema = z.nativeEnum(MasterCategory);

const masterValueSchema = z
  .string()
  .trim()
  .min(1, 'Value is required')
  .max(150, 'Value must be 150 characters or fewer');

export const queryMastersSchema = z.object({
  category: masterCategorySchema.optional(),
  // When "true", bypass the student posting-type targeting filter (used by the NOC wizard's
  // Self-Sourced program list — a placed student may need a posting type not targeted to them).
  // Only the literal "true" enables it (avoids z.coerce.boolean() treating "false" as true).
  all_targets: z
    .string()
    .optional()
    .transform((value) => value === 'true'),
});

export const queryAdminMastersSchema = z.object({
  category: masterCategorySchema.optional(),
  include_inactive: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => value === 'true'),
});

export const createMasterSchema = z.object({
  category: masterCategorySchema,
  value: masterValueSchema,
  target_institutes: z.array(z.string()).default([]),
  target_courses: z.array(z.string()).default([]),
  target_branches: z.array(z.string()).default([]),
  target_semesters: z.array(z.string()).default([]),
  target_academic_years: z.array(z.string()).default([]),
  is_active: z.boolean().optional(),
  accepting_applications: z.boolean().optional(),
});

export const updateMasterSchema = z
  .object({
    value: masterValueSchema.optional(),
    target_institutes: z.array(z.string()).optional(),
    target_courses: z.array(z.string()).optional(),
    target_branches: z.array(z.string()).optional(),
    target_semesters: z.array(z.string()).optional(),
    target_academic_years: z.array(z.string()).optional(),
    is_active: z.boolean().optional(),
    accepting_applications: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.value !== undefined
      || value.target_institutes !== undefined
      || value.target_courses !== undefined
      || value.target_branches !== undefined
      || value.target_semesters !== undefined
      || value.target_academic_years !== undefined
      || value.is_active !== undefined
      || value.accepting_applications !== undefined,
    {
      message: 'At least one field must be updated',
    }
  );

export type QueryMastersInput = z.infer<typeof queryMastersSchema>;
export type QueryAdminMastersInput = z.infer<typeof queryAdminMastersSchema>;
export type CreateMasterInput = z.infer<typeof createMasterSchema>;
export type UpdateMasterInput = z.infer<typeof updateMasterSchema>;
