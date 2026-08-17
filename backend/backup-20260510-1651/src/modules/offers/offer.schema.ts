import { z } from 'zod';
import { paginationSchema, sortSchema } from '../../shared/schemas/common';

export const createOfferSchema = z.object({
  student_id: z.string().uuid(),
  posting_id: z.string().uuid(),
  company_id: z.string().uuid(),
  type: z.enum(['job', 'internship']),
  role: z.string().min(1).max(200),
  ctc: z.string().max(100).optional().nullable(),
  stipend: z.string().max(100).optional().nullable(),
  location: z.string().max(200).optional().nullable(),
  offer_date: z.coerce.date(),
});

export const rejectOfferSchema = z.object({
  rejection_reason: z.string().max(50),
  rejection_remarks: z.string().max(2000).optional().nullable(),
});

export const joiningStatusSchema = z.object({
  joining_status: z.enum(['joined', 'did_not_join']),
  joining_date: z.coerce.date().optional().nullable(),
  dnj_reason: z.string().max(2000).optional().nullable(),
});

export const complianceSchema = z.object({
  compliance_status: z.enum(['compliant', 'blocked', 'override_enabled']),
  applications_blocked: z.boolean().optional(),
});

export const queryOffersSchema = paginationSchema.merge(sortSchema).extend({
  status: z.enum(['pending_student_action', 'accepted', 'rejected_by_admin']).optional(),
  type: z.enum(['job', 'internship']).optional(),
  posting_type: z.enum(['job', 'internship', 'stipend_internship']).optional(),
  company_id: z.string().uuid().optional(),
  student_id: z.string().uuid().optional(),
  search: z.string().max(200).optional(),
});

export type CreateOfferInput = z.infer<typeof createOfferSchema>;
export type RejectOfferInput = z.infer<typeof rejectOfferSchema>;
export type JoiningStatusInput = z.infer<typeof joiningStatusSchema>;
export type ComplianceInput = z.infer<typeof complianceSchema>;
export type QueryOffersInput = z.infer<typeof queryOffersSchema>;
