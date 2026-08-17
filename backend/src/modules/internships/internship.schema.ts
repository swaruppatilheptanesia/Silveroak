import { z } from 'zod';
import { paginationSchema, searchSchema, sortSchema } from '../../shared/schemas/common';

export const createInternshipSchema = z.object({
  company_id: z.string().uuid().optional().nullable(),
  company_name: z.string().min(1).max(300),
  role: z.string().min(1).max(200),
  department: z.string().max(100).optional().nullable(),
  internship_type: z.enum(['paid', 'unpaid', 'stipend_based']),
  start_date: z.coerce.date(),
  end_date: z.coerce.date().optional().nullable(),
  stipend_amount: z.number().min(0).optional().nullable(),
  stipend_frequency: z.string().max(20).optional().nullable(),
  is_receiving_stipend: z.boolean().default(false),
  certificate_url: z.string().min(1).max(2000),
  offer_id: z.string().uuid().optional().nullable(),
});

export const updateInternshipSchema = createInternshipSchema.partial().extend({
  status: z.enum(['ongoing', 'completed', 'discontinued']).optional(),
  certificate_url: z.string().max(2000).optional().nullable(),
  certificate_uploaded: z.boolean().optional(),
});

export const createIssueSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().max(5000).optional().nullable(),
});

export const resolveIssueSchema = z.object({
  status: z.enum(['resolved']),
});

export const queryInternshipsSchema = paginationSchema.merge(sortSchema).merge(searchSchema).extend({
  status: z.enum(['ongoing', 'completed', 'discontinued']).optional(),
  student_id: z.string().uuid().optional(),
  department: z.string().max(100).optional(),
  batch: z.string().max(20).optional(),
  posting_type_master_id: z.string().uuid().optional(),
  internship_type: z.enum(['paid', 'unpaid', 'stipend_based']).optional(),
  company_id: z.string().uuid().optional(),
  has_open_issues: z.coerce.boolean().optional(),
  certificate_pending: z.coerce.boolean().optional(),
  is_receiving_stipend: z.coerce.boolean().optional(),
});

export type CreateInternshipInput = z.infer<typeof createInternshipSchema>;
export type UpdateInternshipInput = z.infer<typeof updateInternshipSchema>;
export type CreateIssueInput = z.infer<typeof createIssueSchema>;
export type QueryInternshipsInput = z.infer<typeof queryInternshipsSchema>;
