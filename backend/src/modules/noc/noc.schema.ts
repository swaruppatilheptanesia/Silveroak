import { z } from 'zod';
import { paginationSchema, sortSchema } from '../../shared/schemas/common';

// Format guards for the two optional contact/address fields — the form validates these too, but the
// endpoint must not trust it. Both keep '' acceptable so a non-form caller can send an empty value
// instead of null. The mobile transform strips separators, so what is stored is the bare digits
// ("+91 98765-43210" -> "+919876543210" -> matched, stored without spaces/dashes).
/** Mirror of normalizeIndianMobile in the frontend's src/lib/nocModule.ts — keep the two in step. */
function toMobileDigits(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);
  return digits;
}

// NOTE: refine runs BEFORE transform on purpose. Normalising first would reduce "hello" to "" and
// then wave it through as an empty (optional) value.
const indianMobileSchema = z
  .string()
  .max(20)
  .refine(
    (value) => value.trim() === '' || /^[6-9]\d{9}$/.test(toMobileDigits(value)),
    'Enter a valid 10-digit Indian mobile number',
  )
  .transform((value) => (value.trim() === '' ? '' : toMobileDigits(value)));

const indianPincodeSchema = z
  .string()
  .max(10)
  .transform((value) => value.trim())
  .refine((value) => value === '' || /^[1-9]\d{5}$/.test(value), 'Enter a valid 6-digit pincode');

export const createNocSchema = z.object({
  noc_type: z.enum(['internship', 'training', 'project']),
  internship_type: z.enum(['internship', 'placement']).optional().nullable(),
  program: z.string().trim().min(1).max(150),
  placement_source: z.enum(['university_drive', 'self_sourced']),
  drive_id: z.string().uuid().optional().nullable(),
  company_name: z.string().min(1).max(300),
  company_address: z.string().max(2000).optional().nullable(),
  company_city: z.string().max(100).optional().nullable(),
  company_state: z.string().max(100).optional().nullable(),
  company_pincode: indianPincodeSchema.optional().nullable(),
  company_pan: z.string().max(20).optional().nullable(),
  company_gst: z.string().max(30).optional().nullable(),
  supporting_document_url: z.string().max(2000).optional().nullable(),
  supporting_document_name: z.string().max(255).optional().nullable(),
  contact_person_name: z.string().max(200).optional().nullable(),
  contact_person_designation: z.string().max(100).optional().nullable(),
  contact_person_phone: indianMobileSchema.optional().nullable(),
  contact_person_email: z.string().email().max(255).optional().nullable(),
  reference_by: z.string().max(50).optional().nullable(),
  reference_details: z.string().max(2000).optional().nullable(),
  role_title: z.string().min(1).max(200),
  technology_domain: z.string().max(200).optional().nullable(),
  job_description: z.string().max(5000).optional().nullable(),
  stipend_amount: z.number().min(0).optional().nullable(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date().optional().nullable(),
  duration_weeks: z.number().int().min(1).optional().nullable(),
  offer_letter_url: z.string().min(1, 'Offer letter is required').max(2000),
}).superRefine((data, ctx) => {
  // Self-sourced NOCs create a new company; the contact person becomes its recruiter, so
  // name + email are required (so a recruiter can always be created and linked on approval).
  if (data.placement_source === 'self_sourced') {
    if (!data.contact_person_name || !data.contact_person_name.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contact_person_name'],
        message: 'Contact person name is required for self-sourced placements.',
      });
    }
    if (!data.contact_person_email || !data.contact_person_email.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contact_person_email'],
        message: 'Contact person email is required for self-sourced placements.',
      });
    }
  }
});

export const approveNocSchema = z.object({
  remarks: z.string().max(2000).optional().nullable(),
});

export const rejectNocSchema = z.object({
  rejection_reason: z.string().min(1).max(2000),
});

// Completion-certificate rejection requires a mandatory remark (student can re-upload).
export const rejectCompletionCertificateSchema = z.object({
  remarks: z.string().trim().min(1, 'A rejection remark is required.').max(2000),
});

export const queryNocSchema = paginationSchema.merge(sortSchema).extend({
  status: z.enum(['pending_faculty', 'pending_tpo', 'pending_company_verification', 'approved', 'issued', 'rejected']).optional(),
  noc_type: z.enum(['internship', 'training', 'project']).optional(),
  completion_status: z.enum(['pending', 'approved', 'rejected']).optional(),
  // FILTER COUNTER EXPORT — student-scope + posting-type (program value) + date range
  posting_type: z.string().max(150).optional(),
  institute: z.string().max(200).optional(),
  course: z.string().max(200).optional(),
  branch: z.string().max(200).optional(),
  academic_year: z.string().max(50).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

export type CreateNocInput = z.infer<typeof createNocSchema>;
export type ApproveNocInput = z.infer<typeof approveNocSchema>;
export type RejectNocInput = z.infer<typeof rejectNocSchema>;
export type RejectCompletionCertificateInput = z.infer<typeof rejectCompletionCertificateSchema>;
export type QueryNocInput = z.infer<typeof queryNocSchema>;
