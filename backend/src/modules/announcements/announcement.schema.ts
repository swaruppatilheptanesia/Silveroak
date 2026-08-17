import { z } from 'zod';
import { paginationSchema, sortSchema } from '../../shared/schemas/common';

export const createAnnouncementSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  target_audience_type: z.enum(['all', 'batch', 'department', 'semester', 'eligible_for_posting']).default('all'),
  // Multi-select: Institute → Course → Branch → Semester are AND-ed scope levels; an empty level
  // means "all" for that level. (Previously capped at .max(1) — a single pick per level.)
  target_institutes: z.array(z.string().max(200)).default([]),
  target_courses: z.array(z.string().max(200)).default([]),
  target_branches: z.array(z.string().max(200)).default([]),
  target_batches: z.array(z.string()).default([]),
  target_departments: z.array(z.string()).default([]),
  target_semesters: z.array(z.string()).default([]),
  target_posting_id: z.string().uuid().optional().nullable(),
  requires_consent: z.boolean().default(false),
  attachment_url: z.string().max(2000).optional().nullable(),
  attachment_name: z.string().max(255).optional().nullable(),
  attachment_mime_type: z.string().max(120).optional().nullable(),
  attachment_size: z.number().int().min(0).optional().nullable(),
  linked_circular_id: z.string().uuid().optional().nullable(),
});

export const updateAnnouncementSchema = createAnnouncementSchema.partial();

/** Accepts either `?institutes=a,b` or a repeated `?institutes=a&institutes=b`. */
const commaSeparatedList = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    if (value === undefined) return [] as string[];
    const parts = Array.isArray(value) ? value : value.split(',');
    return parts.map((part) => part.trim()).filter((part) => part.length > 0);
  });

export const queryAudienceSemestersSchema = z.object({
  institutes: commaSeparatedList,
  courses: commaSeparatedList,
  branches: commaSeparatedList,
});

export const queryAnnouncementsSchema = paginationSchema.merge(sortSchema).extend({
  status: z.enum(['draft', 'published', 'archived']).optional(),
  priority: z.enum(['high', 'medium', 'low']).optional(),
  // FILTER COUNTER EXPORT — target-scope (institute/course/branch arrays) + date range (created_at)
  institute: z.string().max(200).optional(),
  course: z.string().max(200).optional(),
  branch: z.string().max(200).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type UpdateAnnouncementInput = z.infer<typeof updateAnnouncementSchema>;
export type QueryAnnouncementsInput = z.infer<typeof queryAnnouncementsSchema>;
export type QueryAudienceSemestersInput = z.infer<typeof queryAudienceSemestersSchema>;
