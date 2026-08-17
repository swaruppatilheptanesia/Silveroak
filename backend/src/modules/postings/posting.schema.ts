import { z } from 'zod';
import { paginationSchema, searchSchema, sortSchema } from '../../shared/schemas/common';

export const createPostingSchema = z.object({
  company_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  posting_type_master_id: z.string().uuid(),
  academic_year: z.string().max(20),
  role_name: z.string().min(1).max(200),
  location: z.string().min(1).max(200),
  locations: z.array(z.string().max(200)).default([]),
  work_mode: z.enum(['onsite', 'remote', 'hybrid']),
  ctc: z.string().max(100).optional().nullable(),
  stipend: z.string().max(100).optional().nullable(),
  duration: z.string().max(100).optional().nullable(),
  bond_details: z.string().max(2000).optional().nullable(),
  role_description: z.string().max(5000).optional().nullable(),
  job_description_pdf_url: z.string().max(2000).optional().nullable(),
  job_description_pdf_urls: z.array(z.string().max(2000)).default([]),
  job_description_pdf_names: z.array(z.string().max(255)).default([]),
  target_institutes: z.array(z.string()).default([]),
  target_courses: z.array(z.string()).default([]),
  target_branches: z.array(z.string()).default([]),
  target_semesters: z.array(z.string()).default([]),
  eligible_branches: z.array(z.string()).default([]),
  eligible_batches: z.array(z.string()).default([]),
  min_cgpa: z.number().min(0).max(10).default(0),
  max_backlogs: z.number().int().min(0).default(0),
  skill_requirements: z.string().max(2000).optional().nullable(),
  has_written_test: z.boolean().default(false),
  written_test_details: z.string().max(2000).optional().nullable(),
  has_gd: z.boolean().default(false),
  gd_details: z.string().max(2000).optional().nullable(),
  technical_rounds: z.number().int().min(0).default(0),
  hr_rounds: z.number().int().min(0).default(0),
  additional_info: z.string().max(5000).optional().nullable(),
  application_override_enabled: z.boolean().default(false),
  application_start_date: z.coerce.date().optional().nullable(),
  application_end_date: z.coerce.date().optional().nullable(),
});

export const updatePostingSchema = createPostingSchema.partial().omit({ company_id: true });

export const queryPostingsSchema = paginationSchema.merge(searchSchema).merge(sortSchema).extend({
  status: z.enum(['draft', 'published', 'closed']).optional(),
  posting_type_master_id: z.string().uuid().optional(),
  company_id: z.string().uuid().optional(),
  // FILTER COUNTER EXPORT — target-scope (institute/course/branch arrays), academic year + date range
  institute: z.string().max(200).optional(),
  course: z.string().max(200).optional(),
  branch: z.string().max(200).optional(),
  academic_year: z.string().max(50).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

export const publishPostingSchema = z.object({
  application_start_date: z.coerce.date().optional(),
  application_end_date: z.coerce.date().optional(),
});

export const republishPostingSchema = z.object({
  application_start_date: z.coerce.date(),
  application_end_date: z.coerce.date(),
});

export type CreatePostingInput = z.infer<typeof createPostingSchema>;
export type UpdatePostingInput = z.infer<typeof updatePostingSchema>;
export type QueryPostingsInput = z.infer<typeof queryPostingsSchema>;
export type PublishPostingInput = z.infer<typeof publishPostingSchema>;
export type RepublishPostingInput = z.infer<typeof republishPostingSchema>;
