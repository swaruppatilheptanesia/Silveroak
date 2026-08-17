import { z } from 'zod';

const phoneSchema = z.string().regex(/^\+?[\d\s-]{7,20}$/, 'Invalid phone number');

// Personal profile update
export const updatePersonalSchema = z.object({
  alternate_phone: phoneSchema.optional().nullable(),
  linkedin_url: z.string().trim().url('Enter a valid LinkedIn URL').max(2000).optional().nullable(),
}).strict();

// Academic profile update
export const updateAcademicSchema = z.object({
  cgpa: z.number().min(0).max(10).optional().nullable(),
  tenth_percentage: z.number().min(0).max(100).optional().nullable(),
  twelfth_percentage: z.number().min(0).max(100).optional().nullable(),
  diploma_percentage: z.number().min(0).max(100).optional().nullable(),
  backlog_count: z.number().int().min(0).optional(),
  active_backlogs: z.number().int().min(0).optional(),
  semester: z.number().int().min(1).max(12).optional().nullable(),
  year_of_study: z.number().int().min(1).max(6).optional().nullable(),
  course_duration: z.number().int().min(1).max(6).optional().nullable(),
});

// Skills profile update
export const updateSkillsSchema = z.object({
  technical_skills: z.array(z.string().max(100)).max(5).optional(),
  domain_interests: z.array(z.string().max(100)).max(20).optional(),
  preferred_locations: z.array(z.string().max(100)).max(20).optional(),
});

// Project schemas
const projectBaseSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  role: z.string().max(200).optional().nullable(),
  technologies: z.array(z.string().max(50)).min(1).max(20),
  keywords: z.array(z.string().max(50)).max(20).optional(),
  github_url: z.string().url().optional().nullable(),
  demo_url: z.string().url().optional().nullable(),
  live_url: z.string().url().optional().nullable(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date().optional().nullable(),
  is_ongoing: z.boolean(),
  display_order: z.number().int().min(0).optional(),
});

// Shared date validation: no future dates, and start must not be after end.
// Guards for optional/undefined fields so it works for both create and (partial) update.
function refineProjectDates(
  value: { start_date?: Date | null; end_date?: Date | null },
  ctx: z.RefinementCtx,
) {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  if (value.start_date && value.start_date > endOfToday) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Start date cannot be in the future',
      path: ['start_date'],
    });
  }
  if (value.end_date) {
    if (value.end_date > endOfToday) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'End date cannot be in the future',
        path: ['end_date'],
      });
    }
    if (value.start_date && value.start_date > value.end_date) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Start date cannot be after the end date',
        path: ['end_date'],
      });
    }
  }
}

export const createProjectSchema = projectBaseSchema.superRefine((value, ctx) => {
  if (!value.is_ongoing && !value.end_date) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'End date is required for completed projects',
      path: ['end_date'],
    });
  }
  refineProjectDates(value, ctx);
});

export const updateProjectSchema = projectBaseSchema.partial().superRefine(refineProjectDates);

// Certification schema
export const createCertificationSchema = z.object({
  name: z.string().min(1).max(200),
  issuer: z.string().min(1).max(200),
  issue_date: z.coerce.date().optional().nullable(),
  credential_url: z.string().url().optional().nullable(),
  document_url: z.string().min(1).max(2000),
  document_name: z.string().max(255).optional().nullable(),
  document_mime_type: z.string().max(150).optional().nullable(),
  document_size: z.number().int().nonnegative().optional().nullable(),
}).superRefine((value, ctx) => {
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  if (value.issue_date && value.issue_date > endOfToday) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Issue date cannot be in the future',
      path: ['issue_date'],
    });
  }
});

// Employment — create a new entry (multiple allowed). Duration removed.
export const createEmploymentSchema = z.object({
  employment_type: z.string().min(1, 'Employment type is required').max(50),
  company_name: z.string().min(1, 'Company name is required').max(200),
  designation: z.string().min(1, 'Designation is required').max(200),
  package_lpa: z.coerce.number().min(0).optional().nullable(),
});

// Policy acceptance schema.
// Core acceptance ("I have read and accept this policy") = policy_read + rules_accepted, both
// required true. The 4 sharing consents are OPTIONAL (default false in DB) — the simplified
// single-checkbox flow (registration gate + profile Policies tab) omits them; the legacy
// /policy page still posts all 6 as true, which remains valid. No code enforces the individual
// consent columns — only the policy_accepted boolean gates anything.
export const policyAcceptanceSchema = z.object({
  policy_id: z.string().uuid().optional(),
  policy_read: z.literal(true, { errorMap: () => ({ message: 'Policy must be read' }) }),
  rules_accepted: z.literal(true, { errorMap: () => ({ message: 'Rules must be accepted' }) }),
  profile_sharing_consent: z.boolean().optional(),
  resume_sharing_consent: z.boolean().optional(),
  data_storage_consent: z.boolean().optional(),
  communication_consent: z.boolean().optional(),
});

// Interest registration schema
export const interestRegistrationSchema = z.object({
  interest_types: z
    .array(z.string().trim().min(1, 'Interest type is required'))
    .min(1, 'At least one interest type is required'),
});

// Placement preferences (opt-out). Reason is required only when opting OUT.
export const globalPlacementOptOutSchema = z
  .object({
    opted_out: z.boolean(),
    reason: z.string().trim().max(500).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.opted_out && !value.reason?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['reason'], message: 'A reason is required to opt out' });
    }
  });

export const postingTypePreferenceSchema = z
  .object({
    posting_type_master_id: z.string().uuid(),
    interested: z.boolean(),
    reason: z.string().trim().max(500).optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (!value.interested && !value.reason?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['reason'], message: 'A reason is required to opt out' });
    }
  });

export type UpdatePersonalInput = z.infer<typeof updatePersonalSchema>;
export type UpdateAcademicInput = z.infer<typeof updateAcademicSchema>;
export type UpdateSkillsInput = z.infer<typeof updateSkillsSchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type CreateCertificationInput = z.infer<typeof createCertificationSchema>;
export type CreateEmploymentInput = z.infer<typeof createEmploymentSchema>;
export type PolicyAcceptanceInput = z.infer<typeof policyAcceptanceSchema>;
export type InterestRegistrationInput = z.infer<typeof interestRegistrationSchema>;
export type GlobalPlacementOptOutInput = z.infer<typeof globalPlacementOptOutSchema>;
export type PostingTypePreferenceInput = z.infer<typeof postingTypePreferenceSchema>;
