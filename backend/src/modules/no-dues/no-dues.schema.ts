import { z } from 'zod';
import { paginationSchema, sortSchema } from '../../shared/schemas/common';

export const createNoDuesSchema = z.object({
  exit_reason: z.enum(['employment', 'family_business', 'planning_studies', 'higher_studies', 'competitive_exam']),
  company_name: z.string().max(300).optional().nullable(),
  designation: z.string().max(200).optional().nullable(),
  package_lpa: z.number().min(0).optional().nullable(),
  joining_date: z.coerce.date().optional().nullable(),
  business_name: z.string().max(300).optional().nullable(),
  business_nature: z.string().max(200).optional().nullable(),
  business_address: z.string().max(2000).optional().nullable(),
  institution_name: z.string().max(300).optional().nullable(),
  program_name: z.string().max(200).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  // Dynamic per-exit-reason fields — lenient here; the frontend union enforces per-reason requiredness.
  sou_passing_year: z.string().max(20).optional().nullable(),
  company_sector: z.string().max(200).optional().nullable(),
  company_address: z.string().max(2000).optional().nullable(),
  language_test: z.string().max(200).optional().nullable(),
  university_address: z.string().max(2000).optional().nullable(),
  examination_name: z.string().max(300).optional().nullable(),
  additional_details: z.string().max(2000).optional().nullable(),
  proof_url: z.string().max(2000).optional().nullable(),
  declaration_accepted: z.boolean().refine(v => v === true, { message: 'Declaration must be accepted' }),
});

export const reviewNoDuesSchema = z.object({
  status: z.enum(['pending_review', 'under_review', 'approved', 'returned', 'rejected']),
  admin_remarks: z.string().max(2000).optional().nullable(),
});

export const enableNoDuesEligibilitySchema = z.object({
  enrollment_number: z.string().trim().min(1).max(50),
});

export const updateNoDuesSchema = createNoDuesSchema;

export const queryNoDuesSchema = paginationSchema.merge(sortSchema).extend({
  status: z.enum(['pending_review', 'under_review', 'approved', 'returned', 'rejected', 'issued']).optional(),
  // FILTER COUNTER EXPORT — student-scope + passing year (batch) + date range
  institute: z.string().max(200).optional(),
  course: z.string().max(200).optional(),
  branch: z.string().max(200).optional(),
  passing_year: z.string().max(50).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

export type CreateNoDuesInput = z.infer<typeof createNoDuesSchema>;
export type ReviewNoDuesInput = z.infer<typeof reviewNoDuesSchema>;
export type EnableNoDuesEligibilityInput = z.infer<typeof enableNoDuesEligibilitySchema>;
export type UpdateNoDuesInput = z.infer<typeof updateNoDuesSchema>;
export type QueryNoDuesInput = z.infer<typeof queryNoDuesSchema>;
