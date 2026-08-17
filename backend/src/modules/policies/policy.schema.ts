import { z } from 'zod';
import { paginationSchema, sortSchema } from '../../shared/schemas/common';

const targetListSchema = z.array(z.string().trim().min(1).max(300)).max(1).default([]);

export const createPolicySchema = z.object({
  title: z.string().min(1).max(200),
  category: z.string().min(1).max(50),
  description: z.string().max(5000).optional().nullable(),
  content: z.string().min(1),
  version: z.string().max(20).default('1.0'),
  effective_date: z.coerce.date().optional().nullable(),
  target_institutes: targetListSchema,
  target_branches: targetListSchema,
  target_courses: targetListSchema,
  document_url: z.string().max(2000).optional().nullable(),
  document_name: z.string().max(255).optional().nullable(),
  document_mime_type: z.string().max(150).optional().nullable(),
  document_size: z.number().int().nonnegative().optional().nullable(),
  // Optional posting-type link. Empty string / null = "global" policy
  // (the kind students must accept at registration and in the profile tab).
  posting_type_master_id: z.string().uuid().optional().nullable().or(z.literal('')),
});

export const updatePolicySchema = createPolicySchema.partial();

export const queryPoliciesSchema = paginationSchema.merge(sortSchema).extend({
  category: z.string().max(50).optional(),
  // When true, restrict to global policies (posting_type_master_id IS NULL).
  global: z.coerce.boolean().optional(),
  // When set, restrict to policies linked to this posting type. Lets students read the
  // posting-type policy they must accept before Show Interest / Apply.
  posting_type_master_id: z.string().uuid().optional(),
});

export const queryBranchesByCourseSchema = z.object({
  CourseId: z.coerce.number().int().positive().optional(),
  course_id: z.coerce.number().int().positive().optional(),
}).transform((value, ctx) => {
  const courseId = value.CourseId ?? value.course_id;
  if (!courseId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['CourseId'],
      message: 'CourseId is required',
    });
    return z.NEVER;
  }

  return { CourseId: courseId };
});

export const queryCoursesByInstituteSchema = z.object({
  InstituteId: z.coerce.number().int().positive().optional(),
  institute_id: z.coerce.number().int().positive().optional(),
}).transform((value, ctx) => {
  const instituteId = value.InstituteId ?? value.institute_id;
  if (!instituteId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['InstituteId'],
      message: 'InstituteId is required',
    });
    return z.NEVER;
  }

  return { InstituteId: instituteId };
});

export type CreatePolicyInput = z.infer<typeof createPolicySchema>;
export type UpdatePolicyInput = z.infer<typeof updatePolicySchema>;
export type QueryPoliciesInput = z.infer<typeof queryPoliciesSchema>;
export type QueryBranchesByCourseInput = z.infer<typeof queryBranchesByCourseSchema>;
export type QueryCoursesByInstituteInput = z.infer<typeof queryCoursesByInstituteSchema>;
