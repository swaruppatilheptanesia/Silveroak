import { z } from 'zod';
import { paginationSchema, searchSchema, sortSchema } from '../../shared/schemas/common';

// Company
export const createCompanySchema = z.object({
  name: z.string().min(1).max(300),
  industry: z.string().max(100).optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  website: z.string().url('Invalid URL').optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
});

export const updateCompanySchema = createCompanySchema.partial().extend({
  status: z.enum(['active', 'inactive']).optional(),
});

export const classifyCompanySchema = z.object({
  classification: z.enum(['preferred', 'normal', 'blacklisted']),
  internal_remarks: z.string().max(1000).optional().nullable(),
});

export const queryCompaniesSchema = paginationSchema.merge(searchSchema).merge(sortSchema).extend({
  status: z.enum(['active', 'inactive']).optional(),
  classification: z.enum(['preferred', 'normal', 'blacklisted']).optional(),
  // FILTER COUNTER EXPORT — sector/industry + date range (created_at)
  industry: z.string().max(100).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

export const queryRecruitersSchema = paginationSchema.merge(searchSchema).merge(sortSchema).extend({
  verification_status: z.enum(['pending', 'verified', 'rejected']).optional(),
  company_id: z.string().uuid().optional(),
});

// Recruiter
export const createRecruiterSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email().max(255),
  phone: z.string().regex(/^\+?[\d\s-]{7,20}$/).optional().nullable(),
  designation: z.string().max(100).optional().nullable(),
});

export const updateRecruiterSchema = z.object({
  name: z.string().max(200).optional(),
  phone: z.string().regex(/^\+?[\d\s-]{7,20}$/).optional().nullable(),
  designation: z.string().max(100).optional().nullable(),
});

export const verifyRecruiterSchema = z.object({
  status: z.enum(['verified', 'rejected']),
});

// Engagement
export const createEngagementSchema = z.object({
  visitor_type: z.enum(['placement', 'internship', 'campus_visit', 'guest_lecture', 'workshop']),
  date: z.coerce.date(),
  remarks: z.string().max(1000).optional().nullable(),
  students_hired: z.number().int().min(0).optional(),
  packages_offered: z.string().max(500).optional().nullable(),
  academic_year: z.string().max(20).optional().nullable(),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type ClassifyCompanyInput = z.infer<typeof classifyCompanySchema>;
export type QueryCompaniesInput = z.infer<typeof queryCompaniesSchema>;
export type QueryRecruitersInput = z.infer<typeof queryRecruitersSchema>;
export type CreateRecruiterInput = z.infer<typeof createRecruiterSchema>;
export type UpdateRecruiterInput = z.infer<typeof updateRecruiterSchema>;
export type VerifyRecruiterInput = z.infer<typeof verifyRecruiterSchema>;
export type CreateEngagementInput = z.infer<typeof createEngagementSchema>;
