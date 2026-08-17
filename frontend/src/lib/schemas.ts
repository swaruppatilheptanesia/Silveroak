// Centralized Zod schemas for form validation
import { z } from 'zod';
import { strongPasswordFieldSchema } from '@/lib/passwordPolicy';

// ============================================
// COMMON FIELD SCHEMAS
// ============================================

/**
 * Name field - trimmed, non-empty, max 100 chars
 */
export const nameSchema = z
  .string()
  .trim()
  .min(1, 'Name is required')
  .max(100, 'Name must be less than 100 characters');

/**
 * Email field - trimmed, valid email, max 255 chars
 */
export const emailSchema = z
  .string()
  .trim()
  .email('Invalid email address')
  .max(255, 'Email must be less than 255 characters');

/**
 * Phone field - Indian mobile number format
 */
export const phoneSchema = z
  .string()
  .trim()
  .regex(
    /^(\+91[\-\s]?)?[0]?(91)?[6-9]\d{9}$/,
    'Invalid phone number. Use Indian mobile format'
  );

/**
 * Optional phone field
 */
export const optionalPhoneSchema = z
  .string()
  .trim()
  .regex(
    /^(\+91[\-\s]?)?[0]?(91)?[6-9]\d{9}$/,
    'Invalid phone number. Use Indian mobile format'
  )
  .optional()
  .or(z.literal(''));

/**
 * URL field - valid URL format
 */
export const urlSchema = z
  .string()
  .trim()
  .url('Invalid URL format')
  .max(500, 'URL must be less than 500 characters');

/**
 * Optional URL field
 */
export const optionalUrlSchema = z
  .string()
  .trim()
  .url('Invalid URL format')
  .max(500, 'URL must be less than 500 characters')
  .optional()
  .or(z.literal(''));

/**
 * LinkedIn URL - must be a valid LinkedIn profile URL
 */
export const linkedinUrlSchema = z
  .string()
  .trim()
  .regex(
    /^https?:\/\/(www\.)?linkedin\.com\/(in|company)\/[\w-]+\/?$/,
    'Invalid LinkedIn URL'
  )
  .optional()
  .or(z.literal(''));

/**
 * Description/text area - trimmed, non-empty, max chars configurable
 */
export const descriptionSchema = (maxLength: number = 1000) =>
  z
    .string()
    .trim()
    .min(1, 'Description is required')
    .max(maxLength, `Description must be less than ${maxLength} characters`);

/**
 * Optional description
 */
export const optionalDescriptionSchema = (maxLength: number = 1000) =>
  z
    .string()
    .trim()
    .max(maxLength, `Description must be less than ${maxLength} characters`)
    .optional()
    .or(z.literal(''));

/**
 * CGPA field - 0 to 10 with 2 decimal places
 */
export const cgpaSchema = z
  .number()
  .min(0, 'CGPA must be at least 0')
  .max(10, 'CGPA cannot exceed 10');

/**
 * Percentage field - 0 to 100
 */
export const percentageSchema = z
  .number()
  .min(0, 'Percentage must be at least 0')
  .max(100, 'Percentage cannot exceed 100');

/**
 * Salary/CTC in LPA
 */
export const ctcSchema = z
  .number()
  .min(0, 'CTC must be positive')
  .max(500, 'CTC seems too high, please verify');

/**
 * Stipend amount (monthly)
 */
export const stipendSchema = z
  .number()
  .min(0, 'Stipend must be positive')
  .max(500000, 'Stipend seems too high, please verify');

/**
 * Year field
 */
export const yearSchema = z
  .number()
  .int('Year must be a whole number')
  .min(2000, 'Year must be after 2000')
  .max(2100, 'Year must be before 2100');

/**
 * Batch year as string
 */
export const batchYearSchema = z
  .string()
  .regex(/^20\d{2}$/, 'Invalid batch year format');

/**
 * Non-empty string array
 */
export const stringArraySchema = z
  .array(z.string().trim().min(1))
  .min(1, 'At least one item is required');

/**
 * Optional string array
 */
export const optionalStringArraySchema = z.array(z.string().trim()).optional();

// ============================================
// AUTH SCHEMAS
// ============================================

/**
 * Login form schema
 */
export const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

export type LoginFormData = z.infer<typeof loginFormSchema>;

// ============================================
// COMMON FORM SCHEMAS
// ============================================

/**
 * Company form schema
 */
export const companyFormSchema = z.object({
  name: nameSchema,
  industry: z.string().trim().min(1, 'Industry is required'),
  website: optionalUrlSchema,
  description: optionalDescriptionSchema(2000),
  headquarters: z.string().trim().optional(),
  employeeCount: z.string().optional(),
  classification: z.enum(['dream', 'super_dream', 'regular', 'startup']).optional(),
});

/**
 * Recruiter form schema
 */
export const recruiterFormSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  phone: optionalPhoneSchema,
  designation: z.string().trim().min(1, 'Designation is required'),
  companyId: z.string().min(1, 'Company is required'),
  linkedinUrl: linkedinUrlSchema,
});

/**
 * Job posting form schema
 */
export const postingFormSchema = z.object({
  roleName: nameSchema,
  companyId: z.string().min(1, 'Company is required'),
  postingType: z.enum(['placement', 'internship', 'ppo']),
  description: descriptionSchema(5000),
  eligibleBranches: stringArraySchema,
  minCgpa: cgpaSchema.optional(),
  maxBacklogs: z.number().int().min(0).optional(),
  locations: stringArraySchema,
  workMode: z.enum(['onsite', 'remote', 'hybrid']),
  ctcMin: ctcSchema.optional(),
  ctcMax: ctcSchema.optional(),
  stipend: stipendSchema.optional(),
  applicationStart: z.date(),
  applicationEnd: z.date(),
});

/**
 * Student profile form schema
 */
export const studentProfileSchema = z.object({
  fullName: nameSchema,
  email: emailSchema,
  mobile: phoneSchema,
  linkedinUrl: linkedinUrlSchema,
  currentAddress: z.string().trim().min(1, 'Current address is required').max(500),
  permanentAddress: z.string().trim().min(1, 'Permanent address is required').max(500),
});

// ============================================
// STUDENT API SCHEMAS (match backend validation)
// ============================================

const phoneRegex = /^\+?[\d\s-]{7,20}$/;

/**
 * Update personal info schema
 */
export const updatePersonalFormSchema = z.object({
  full_name: z.string().max(200).optional(),
  mobile: z.string().regex(phoneRegex, 'Invalid phone number').optional().nullable().or(z.literal('')),
  date_of_birth: z.string().optional().nullable(),
  gender: z.string().max(20).optional().nullable(),
  linkedin_url: z.string().url('Invalid LinkedIn URL').optional().nullable().or(z.literal('')),
  alternate_phone: z.string().regex(phoneRegex, 'Invalid phone number').optional().nullable().or(z.literal('')),
  residential_address: z.string().max(500, 'Max 500 characters').optional().nullable(),
  permanent_address: z.string().max(500, 'Max 500 characters').optional().nullable(),
  profile_photo_url: z.string().url().optional().nullable().or(z.literal('')),
});

/**
 * Update academic profile schema
 */
export const updateAcademicFormSchema = z.object({
  cgpa: cgpaSchema.optional().nullable(),
  tenth_percentage: percentageSchema.optional().nullable(),
  twelfth_percentage: percentageSchema.optional().nullable(),
  diploma_percentage: percentageSchema.optional().nullable(),
  backlog_count: z.number().int().min(0).optional(),
  active_backlogs: z.number().int().min(0).optional(),
  semester: z.number().int().min(1).max(12).optional().nullable(),
  year_of_study: z.number().int().min(1).max(6).optional().nullable(),
  course_duration: z.number().int().min(1).max(6).optional().nullable(),
});

/**
 * Update skills profile schema
 */
export const updateSkillsFormSchema = z.object({
  technical_skills: z.array(z.string().max(100)).max(50).optional(),
  domain_interests: z.array(z.string().max(100)).max(20).optional(),
  preferred_locations: z.array(z.string().max(100)).max(20).optional(),
});

/**
 * Create project schema
 */
export const createProjectFormSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(2000).optional().nullable().or(z.literal('')),
  technologies: z.array(z.string().max(50)).max(20).optional(),
  github_url: z.string().url('Invalid URL').optional().nullable().or(z.literal('')),
  demo_url: z.string().url('Invalid URL').optional().nullable().or(z.literal('')),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  is_ongoing: z.boolean().optional(),
});

/**
 * Create certification schema
 */
export const createCertificationFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  issuer: z.string().min(1, 'Issuer is required').max(200),
  issue_date: z.string().optional().nullable(),
  credential_url: z.string().url('Invalid URL').optional().nullable().or(z.literal('')),
});

/**
 * Employment update schema
 */
export const updateEmploymentFormSchema = z.object({
  is_currently_working: z.boolean(),
  employment_type: z.string().max(50).optional().nullable(),
  company_name: z.string().max(200).optional().nullable().or(z.literal('')),
  designation: z.string().max(200).optional().nullable().or(z.literal('')),
  duration: z.string().max(100).optional().nullable().or(z.literal('')),
});

/**
 * Policy acceptance schema — all must be true
 */
export const policyAcceptanceFormSchema = z.object({
  policy_read: z.literal(true, { errorMap: () => ({ message: 'Policy must be read' }) }),
  rules_accepted: z.literal(true, { errorMap: () => ({ message: 'Rules must be accepted' }) }),
  profile_sharing_consent: z.literal(true, { errorMap: () => ({ message: 'Profile sharing consent required' }) }),
  resume_sharing_consent: z.literal(true, { errorMap: () => ({ message: 'Resume sharing consent required' }) }),
  data_storage_consent: z.literal(true, { errorMap: () => ({ message: 'Data storage consent required' }) }),
  communication_consent: z.literal(true, { errorMap: () => ({ message: 'Communication consent required' }) }),
});

/**
 * Interest registration schema
 */
export const interestRegistrationFormSchema = z.object({
  interest_types: z.array(
    z.enum([
      'placement',
      'summer_internship',
      'winter_internship',
      'final_semester_internship',
      'nep_internship',
      'stipend_internship',
      'dissertation',
    ])
  ).min(1, 'At least one interest type is required'),
});

// ============================================
// EMPLOYER API SCHEMAS (match backend validation)
// ============================================

/**
 * Create company schema
 */
export const createCompanyApiSchema = z.object({
  name: z.string().min(1, 'Company name is required').max(300),
  industry: z.string().max(100).optional().nullable().or(z.literal('')),
  website: z.string().url('Invalid URL').optional().nullable().or(z.literal('')),
  address: z.string().max(500).optional().nullable().or(z.literal('')),
  description: z.string().max(2000).optional().nullable().or(z.literal('')),
});

/**
 * Update company schema
 */
export const updateCompanyApiSchema = createCompanyApiSchema.partial().extend({
  status: z.enum(['active', 'inactive']).optional(),
});

/**
 * Classify company schema
 */
export const classifyCompanyApiSchema = z.object({
  classification: z.enum(['preferred', 'normal', 'blacklisted']),
  internal_remarks: z.string().max(1000).optional().nullable().or(z.literal('')),
});

/**
 * Create recruiter schema
 */
export const createRecruiterApiSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  email: emailSchema,
  phone: z.string().regex(phoneRegex, 'Invalid phone number').optional().nullable().or(z.literal('')),
  designation: z.string().max(100).optional().nullable().or(z.literal('')),
});

/**
 * Update recruiter schema
 */
export const updateRecruiterApiSchema = z.object({
  name: z.string().max(200).optional(),
  phone: z.string().regex(phoneRegex, 'Invalid phone number').optional().nullable().or(z.literal('')),
  designation: z.string().max(100).optional().nullable().or(z.literal('')),
});

/**
 * Verify recruiter schema
 */
export const verifyRecruiterApiSchema = z.object({
  status: z.enum(['verified', 'rejected']),
});

/**
 * Create engagement schema
 */
export const createEngagementApiSchema = z.object({
  visitor_type: z.enum(['placement', 'internship', 'campus_visit', 'guest_lecture', 'workshop']),
  date: z.string().min(1, 'Date is required'),
  remarks: z.string().max(1000).optional().nullable().or(z.literal('')),
  students_hired: z.number().int().min(0).optional(),
  packages_offered: z.string().max(500).optional().nullable().or(z.literal('')),
  academic_year: z.string().max(20).optional().nullable().or(z.literal('')),
});

// ============================================
// TYPE EXPORTS
// ============================================
export type CompanyFormData = z.infer<typeof companyFormSchema>;
export type RecruiterFormData = z.infer<typeof recruiterFormSchema>;
export type PostingFormData = z.infer<typeof postingFormSchema>;
export type StudentProfileFormData = z.infer<typeof studentProfileSchema>;
export type UpdatePersonalFormData = z.infer<typeof updatePersonalFormSchema>;
export type UpdateAcademicFormData = z.infer<typeof updateAcademicFormSchema>;
export type UpdateSkillsFormData = z.infer<typeof updateSkillsFormSchema>;
export type CreateProjectFormData = z.infer<typeof createProjectFormSchema>;
export type CreateCertificationFormData = z.infer<typeof createCertificationFormSchema>;
export type UpdateEmploymentFormData = z.infer<typeof updateEmploymentFormSchema>;
export type PolicyAcceptanceFormData = z.infer<typeof policyAcceptanceFormSchema>;
export type InterestRegistrationFormData = z.infer<typeof interestRegistrationFormSchema>;
export type CreateCompanyApiData = z.infer<typeof createCompanyApiSchema>;
export type UpdateCompanyApiData = z.infer<typeof updateCompanyApiSchema>;
export type ClassifyCompanyApiData = z.infer<typeof classifyCompanyApiSchema>;
export type CreateRecruiterApiData = z.infer<typeof createRecruiterApiSchema>;
export type UpdateRecruiterApiData = z.infer<typeof updateRecruiterApiSchema>;
export type VerifyRecruiterApiData = z.infer<typeof verifyRecruiterApiSchema>;
export type CreateEngagementApiData = z.infer<typeof createEngagementApiSchema>;

// ============================================
// POSTING API SCHEMAS (match backend validation)
// ============================================

/**
 * Create posting schema
 */
export const createPostingApiSchema = z.object({
  company_id: z.string().min(1, 'Company is required'),
  title: z.string().min(1, 'Title is required').max(200),
  type: z.enum(['job', 'internship', 'stipend_internship']),
  academic_year: z.string().max(20).min(1, 'Academic year is required'),
  role_name: z.string().min(1, 'Role name is required').max(200),
  location: z.string().min(1, 'Location is required').max(200),
  work_mode: z.enum(['onsite', 'remote', 'hybrid']),
  ctc: z.string().max(100).optional().nullable().or(z.literal('')),
  stipend: z.string().max(100).optional().nullable().or(z.literal('')),
  duration: z.string().max(100).optional().nullable().or(z.literal('')),
  bond_details: z.string().max(2000).optional().nullable().or(z.literal('')),
  role_description: z.string().max(5000).optional().nullable().or(z.literal('')),
  eligible_branches: z.array(z.string()).default([]),
  eligible_batches: z.array(z.string()).default([]),
  min_cgpa: z.number().min(0).max(10).default(0),
  max_backlogs: z.number().int().min(0).default(0),
  skill_requirements: z.string().max(2000).optional().nullable().or(z.literal('')),
  has_written_test: z.boolean().default(false),
  written_test_details: z.string().max(2000).optional().nullable().or(z.literal('')),
  has_gd: z.boolean().default(false),
  gd_details: z.string().max(2000).optional().nullable().or(z.literal('')),
  technical_rounds: z.number().int().min(0).default(0),
  hr_rounds: z.number().int().min(0).default(0),
  additional_info: z.string().max(5000).optional().nullable().or(z.literal('')),
  application_start_date: z.string().optional().nullable(),
  application_end_date: z.string().optional().nullable(),
});

/**
 * Update posting schema (same as create minus company_id, all optional)
 */
export const updatePostingApiSchema = createPostingApiSchema.partial().omit({ company_id: true });

/**
 * Publish posting schema
 */
export const publishPostingApiSchema = z.object({
  application_start_date: z.string().optional(),
  application_end_date: z.string().optional(),
});

export type CreatePostingApiData = z.infer<typeof createPostingApiSchema>;
export type UpdatePostingApiData = z.infer<typeof updatePostingApiSchema>;
export type PublishPostingApiData = z.infer<typeof publishPostingApiSchema>;

// ============================================
// APPLICATION API SCHEMAS (match backend validation)
// ============================================

const applicationStageEnum = z.enum([
  'applied', 'mock_round', 'shortlisted', 'test_scheduled',
  'interview', 'hr_round', 'offer_released', 'rejected',
]);

/**
 * Apply to posting schema (student)
 */
export const applyToPostingSchema = z.object({
  posting_id: z.string().min(1, 'Posting is required'),
  resume_id: z.string().optional(),
});

/**
 * Move application stage schema (admin)
 */
export const moveStageApiSchema = z.object({
  stage: applicationStageEnum,
  remarks: z.string().max(1000).optional().nullable().or(z.literal('')),
});

/**
 * Bulk move stage schema (admin)
 */
export const bulkMoveStageApiSchema = z.object({
  application_ids: z.array(z.string()).min(1, 'Select at least one application').max(100, 'Maximum 100 per batch'),
  stage: applicationStageEnum,
  remarks: z.string().max(1000).optional().nullable().or(z.literal('')),
});

/**
 * Mock round result schema (admin)
 */
export const mockRoundResultApiSchema = z.object({
  result: z.enum(['passed', 'failed']),
});

export type ApplyToPostingData = z.infer<typeof applyToPostingSchema>;
export type MoveStageApiData = z.infer<typeof moveStageApiSchema>;
export type BulkMoveStageApiData = z.infer<typeof bulkMoveStageApiSchema>;
export type MockRoundResultApiData = z.infer<typeof mockRoundResultApiSchema>;

// ============================================
// OFFER API SCHEMAS (match backend validation)
// ============================================

/**
 * Create offer schema (admin)
 */
export const createOfferApiSchema = z.object({
  student_id: z.string().min(1, 'Student is required'),
  posting_id: z.string().min(1, 'Posting is required'),
  company_id: z.string().min(1, 'Company is required'),
  type: z.enum(['job', 'internship']),
  role: z.string().min(1, 'Role is required').max(200),
  ctc: z.string().max(100).optional().nullable().or(z.literal('')),
  stipend: z.string().max(100).optional().nullable().or(z.literal('')),
  location: z.string().max(200).optional().nullable().or(z.literal('')),
  offer_date: z.string().min(1, 'Offer date is required'),
});

/**
 * Reject offer schema (admin)
 */
export const rejectOfferApiSchema = z.object({
  rejection_reason: z.string().min(1, 'Reason is required').max(50),
  rejection_remarks: z.string().max(2000).optional().nullable().or(z.literal('')),
});

/**
 * Joining status schema (admin)
 */
export const joiningStatusApiSchema = z.object({
  joining_status: z.enum(['joined', 'did_not_join']),
  joining_date: z.string().optional().nullable(),
  dnj_reason: z.string().max(2000).optional().nullable().or(z.literal('')),
});

/**
 * Compliance schema (admin)
 */
export const complianceApiSchema = z.object({
  compliance_status: z.enum(['compliant', 'blocked', 'override_enabled']),
  applications_blocked: z.boolean().optional(),
});

export type CreateOfferApiData = z.infer<typeof createOfferApiSchema>;
export type RejectOfferApiData = z.infer<typeof rejectOfferApiSchema>;
export type JoiningStatusApiData = z.infer<typeof joiningStatusApiSchema>;
export type ComplianceApiData = z.infer<typeof complianceApiSchema>;

// ============================================
// EVENT API SCHEMAS (match backend validation)
// ============================================

const eventTypeEnum = z.enum(['campus_drive', 'ppt', 'test_assessment', 'internship_drive', 'workshop']);
const eventStatusEnum = z.enum(['draft', 'published', 'ongoing', 'completed', 'cancelled']);

export const createEventApiSchema = z.object({
  company_id: z.string().min(1, 'Company is required'),
  posting_id: z.string().optional().nullable(),
  title: z.string().min(1, 'Title is required').max(300),
  type: eventTypeEnum,
  date: z.string().min(1, 'Date is required'),
  start_time: z.string().max(10).min(1, 'Start time is required'),
  end_time: z.string().max(10).min(1, 'End time is required'),
  venue: z.string().min(1, 'Venue is required').max(300),
  reporting_time: z.string().max(10).optional().nullable().or(z.literal('')),
  dress_code: z.string().max(200).optional().nullable().or(z.literal('')),
  instructions: z.string().max(5000).optional().nullable().or(z.literal('')),
  documents_required: z.array(z.string()).default([]),
  faculty_coordinators: z.array(z.string()).default([]),
  faculty_coordinator_ids: z.array(z.string()).default([]),
});

export const updateEventApiSchema = createEventApiSchema.partial();

export const updateEventStatusApiSchema = z.object({
  status: eventStatusEnum,
});

export const createPanelApiSchema = z.object({
  panel_name: z.string().min(1, 'Panel name is required').max(100),
  room: z.string().min(1, 'Room is required').max(100),
  start_time: z.string().max(10).optional().nullable().or(z.literal('')),
  end_time: z.string().max(10).optional().nullable().or(z.literal('')),
  recruiters: z.array(z.string()).default([]),
});

export const assignStudentsApiSchema = z.object({
  student_ids: z.array(z.string()).min(1, 'Select at least one student').max(200),
  panel_id: z.string().optional().nullable(),
});

export const markAttendanceApiSchema = z.object({
  student_id: z.string().min(1),
  attendance: z.enum(['present', 'absent', 'late']),
});

export type CreateEventApiData = z.infer<typeof createEventApiSchema>;
export type UpdateEventApiData = z.infer<typeof updateEventApiSchema>;
export type UpdateEventStatusApiData = z.infer<typeof updateEventStatusApiSchema>;
export type CreatePanelApiData = z.infer<typeof createPanelApiSchema>;
export type AssignStudentsApiData = z.infer<typeof assignStudentsApiSchema>;
export type MarkAttendanceApiData = z.infer<typeof markAttendanceApiSchema>;

// ============================================
// NOC API SCHEMAS (match backend validation)
// ============================================

const nocTypeEnum = z.enum(['internship', 'training', 'project']);
const nocProgramEnum = z.enum([
  'summer_internship', 'winter_internship', 'final_semester_internship',
  'nep_internship', 'stipend_internship', 'dissertation', 'industrial_training',
]);
const placementSourceEnum = z.enum(['university_drive', 'self_sourced']);

/**
 * Create NOC request schema (student)
 */
export const createNocApiSchema = z.object({
  noc_type: nocTypeEnum,
  program: nocProgramEnum,
  placement_source: placementSourceEnum,
  drive_id: z.string().uuid('Invalid drive ID').optional().nullable(),
  company_name: z.string().min(1, 'Company name is required').max(300),
  company_address: z.string().max(2000).optional().nullable().or(z.literal('')),
  company_city: z.string().max(100).optional().nullable().or(z.literal('')),
  company_state: z.string().max(100).optional().nullable().or(z.literal('')),
  company_pincode: z.string().max(10).optional().nullable().or(z.literal('')),
  contact_person_name: z.string().max(200).optional().nullable().or(z.literal('')),
  contact_person_designation: z.string().max(100).optional().nullable().or(z.literal('')),
  contact_person_phone: z.string().max(20).optional().nullable().or(z.literal('')),
  contact_person_email: z.string().email('Invalid email').max(255).optional().nullable().or(z.literal('')),
  reference_by: z.string().max(50).optional().nullable().or(z.literal('')),
  reference_details: z.string().max(2000).optional().nullable().or(z.literal('')),
  role_title: z.string().min(1, 'Role title is required').max(200),
  technology_domain: z.string().max(200).optional().nullable().or(z.literal('')),
  job_description: z.string().max(5000).optional().nullable().or(z.literal('')),
  stipend_amount: z.number().min(0, 'Stipend must be positive').optional().nullable(),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().min(1, 'End date is required'),
  duration_weeks: z.number().int().min(1, 'Duration must be at least 1 week').optional().nullable(),
  offer_letter_url: z.string().max(2000).optional().nullable().or(z.literal('')),
});

/**
 * Faculty/TPO approve NOC schema
 */
export const approveNocApiSchema = z.object({
  remarks: z.string().max(2000).optional().nullable().or(z.literal('')),
});

/**
 * Reject NOC schema
 */
export const rejectNocApiSchema = z.object({
  rejection_reason: z.string().min(1, 'Rejection reason is required').max(2000),
});

export type CreateNocApiData = z.infer<typeof createNocApiSchema>;
export type ApproveNocApiData = z.infer<typeof approveNocApiSchema>;
export type RejectNocApiData = z.infer<typeof rejectNocApiSchema>;

// ============================================
// INTERNSHIP API SCHEMAS (match backend validation)
// ============================================

const internshipTypeEnum = z.enum(['paid', 'unpaid', 'stipend_based']);
const internshipStatusEnum = z.enum(['ongoing', 'completed', 'discontinued']);

/**
 * Create internship schema (student)
 */
export const createInternshipApiSchema = z.object({
  company_name: z.string().min(1, 'Company name is required').max(300),
  role: z.string().min(1, 'Role is required').max(200),
  internship_type: internshipTypeEnum,
  start_date: z.string().min(1, 'Start date is required'),
  company_id: z.string().uuid('Invalid company ID').optional().nullable(),
  department: z.string().max(100).optional().nullable().or(z.literal('')),
  end_date: z.string().optional().nullable(),
  stipend_amount: z.number().min(0, 'Stipend must be positive').optional().nullable(),
  stipend_frequency: z.string().max(20).optional().nullable().or(z.literal('')),
  is_receiving_stipend: z.boolean().default(false),
  offer_id: z.string().uuid('Invalid offer ID').optional().nullable(),
});

/**
 * Update internship schema (admin)
 */
export const updateInternshipApiSchema = createInternshipApiSchema.partial().extend({
  status: internshipStatusEnum.optional(),
  certificate_url: z.string().max(2000).optional().nullable().or(z.literal('')),
  certificate_uploaded: z.boolean().optional(),
});

/**
 * Create issue schema (student/admin)
 */
export const createIssueApiSchema = z.object({
  title: z.string().min(1, 'Title is required').max(300),
  description: z.string().max(5000).optional().nullable().or(z.literal('')),
});

export type CreateInternshipApiData = z.infer<typeof createInternshipApiSchema>;
export type UpdateInternshipApiData = z.infer<typeof updateInternshipApiSchema>;
export type CreateIssueApiData = z.infer<typeof createIssueApiSchema>;

// ============================================
// ANNOUNCEMENT API SCHEMAS (match backend validation)
// ============================================

const announcementPriorityEnum = z.enum(['high', 'medium', 'low']);
const targetAudienceTypeEnum = z.enum(['all', 'batch', 'department', 'eligible_for_posting']);

/**
 * Create announcement schema (admin)
 */
export const createAnnouncementApiSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().min(1, 'Content is required'),
  priority: announcementPriorityEnum.default('medium'),
  target_audience_type: targetAudienceTypeEnum.default('all'),
  target_batches: z.array(z.string()).default([]),
  target_departments: z.array(z.string()).default([]),
  target_posting_id: z.string().uuid('Invalid posting ID').optional().nullable(),
  requires_consent: z.boolean().default(false),
  linked_circular_id: z.string().uuid('Invalid circular ID').optional().nullable(),
});

/**
 * Update announcement schema (admin)
 */
export const updateAnnouncementApiSchema = createAnnouncementApiSchema.partial();

export type CreateAnnouncementApiData = z.infer<typeof createAnnouncementApiSchema>;
export type UpdateAnnouncementApiData = z.infer<typeof updateAnnouncementApiSchema>;

// ============================================
// CIRCULAR API SCHEMAS (match backend validation)
// ============================================

const circularTemplateTypeEnum = z.enum(['placement', 'internship', 'campus_drive', 'general']);
const circularTemplateStatusEnum = z.enum(['draft', 'active', 'archived']);

/**
 * Create template schema
 */
export const createTemplateApiSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  type: circularTemplateTypeEnum,
  sections: z.any().default([]),
});

/**
 * Update template schema
 */
export const updateTemplateApiSchema = createTemplateApiSchema.partial().extend({
  status: circularTemplateStatusEnum.optional(),
  version: z.string().max(20).optional().or(z.literal('')),
});

/**
 * Generate circular schema
 */
export const generateCircularApiSchema = z.object({
  template_id: z.string().uuid('Invalid template ID'),
  company_id: z.string().uuid('Invalid company ID'),
  company_name: z.string().min(1, 'Company name is required').max(300),
  role_name: z.string().min(1, 'Role name is required').max(200),
  type: z.string().max(30).optional().or(z.literal('')),
  field_values: z.record(z.any()).default({}),
});

export type CreateTemplateApiData = z.infer<typeof createTemplateApiSchema>;
export type UpdateTemplateApiData = z.infer<typeof updateTemplateApiSchema>;
export type GenerateCircularApiData = z.infer<typeof generateCircularApiSchema>;

// ============================================
// NO-DUES API SCHEMAS (match backend validation)
// ============================================

const exitReasonEnum = z.enum(['employment', 'family_business', 'planning_studies', 'higher_studies', 'competitive_exam']);

/**
 * Create no-dues request schema (student)
 */
export const createNoDuesApiSchema = z.object({
  exit_reason: exitReasonEnum,
  declaration_accepted: z.literal(true, { errorMap: () => ({ message: 'Declaration must be accepted' }) }),
  company_name: z.string().max(300).optional().nullable().or(z.literal('')),
  designation: z.string().max(200).optional().nullable().or(z.literal('')),
  package_lpa: z.number().min(0, 'Package must be positive').optional().nullable(),
  joining_date: z.string().optional().nullable(),
  business_name: z.string().max(300).optional().nullable().or(z.literal('')),
  business_nature: z.string().max(200).optional().nullable().or(z.literal('')),
  business_address: z.string().max(2000).optional().nullable().or(z.literal('')),
  institution_name: z.string().max(300).optional().nullable().or(z.literal('')),
  program_name: z.string().max(200).optional().nullable().or(z.literal('')),
  country: z.string().max(100).optional().nullable().or(z.literal('')),
  sou_passing_year: z.string().max(20).optional().nullable().or(z.literal('')),
  company_sector: z.string().max(200).optional().nullable().or(z.literal('')),
  company_address: z.string().max(2000).optional().nullable().or(z.literal('')),
  language_test: z.string().max(200).optional().nullable().or(z.literal('')),
  university_address: z.string().max(2000).optional().nullable().or(z.literal('')),
  examination_name: z.string().max(300).optional().nullable().or(z.literal('')),
  additional_details: z.string().max(2000).optional().nullable().or(z.literal('')),
});

/**
 * Review no-dues request schema (admin)
 */
export const reviewNoDuesApiSchema = z.object({
  status: z.enum(['under_review', 'approved', 'returned', 'rejected']),
  admin_remarks: z.string().max(2000).optional().nullable().or(z.literal('')),
});

export type CreateNoDuesApiData = z.infer<typeof createNoDuesApiSchema>;
export type ReviewNoDuesApiData = z.infer<typeof reviewNoDuesApiSchema>;

// ============================================
// POLICY API SCHEMAS (match backend validation)
// ============================================

/**
 * Create policy schema (tpo_admin)
 */
export const createPolicyApiSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  category: z.string().min(1, 'Category is required').max(50),
  content: z.string().min(1, 'Content is required'),
  description: z.string().max(5000).optional().nullable().or(z.literal('')),
  version: z.string().max(20).default('1.0'),
  effective_date: z.string().optional().nullable(),
});

/**
 * Update policy schema (tpo_admin)
 */
export const updatePolicyApiSchema = createPolicyApiSchema.partial();

export type CreatePolicyApiData = z.infer<typeof createPolicyApiSchema>;
export type UpdatePolicyApiData = z.infer<typeof updatePolicyApiSchema>;

// ============================================
// PORTFOLIO API SCHEMAS (match backend validation)
// ============================================

const portfolioStatusEnum = z.enum(['draft', 'published', 'archived']);

/**
 * Update portfolio status schema
 */
export const updatePortfolioStatusApiSchema = z.object({
  status: portfolioStatusEnum,
});

/**
 * Create portfolio project schema
 */
export const createPortfolioProjectApiSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(5000).optional().nullable().or(z.literal('')),
  role: z.string().max(200).optional().nullable().or(z.literal('')),
  technologies: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  github_url: z.string().url('Invalid URL').optional().nullable().or(z.literal('')),
  live_url: z.string().url('Invalid URL').optional().nullable().or(z.literal('')),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  is_ongoing: z.boolean().default(false),
  display_order: z.number().int().min(0).default(0),
});

/**
 * Update portfolio project schema
 */
export const updatePortfolioProjectApiSchema = createPortfolioProjectApiSchema.partial();

/**
 * Create internship showcase schema
 */
export const createShowcaseApiSchema = z.object({
  company_name: z.string().min(1, 'Company name is required').max(300),
  role: z.string().min(1, 'Role is required').max(200),
  duration_months: z.number().int().min(0).optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  key_outcomes: z.array(z.string()).default([]),
  proof_url: z.string().url('Invalid URL').optional().nullable().or(z.literal('')),
  linked_internship_id: z.string().uuid('Invalid internship ID').optional().nullable(),
});

export type UpdatePortfolioStatusApiData = z.infer<typeof updatePortfolioStatusApiSchema>;
export type CreatePortfolioProjectApiData = z.infer<typeof createPortfolioProjectApiSchema>;
export type UpdatePortfolioProjectApiData = z.infer<typeof updatePortfolioProjectApiSchema>;
export type CreateShowcaseApiData = z.infer<typeof createShowcaseApiSchema>;

// ============================================
// ADMIN API SCHEMAS (match backend validation)
// ============================================

const userRoleEnum = z.enum([
  'student', 'tpo_admin', 'tpo_employee', 'faculty_coordinator',
  'recruiter', 'management', 'super_admin',
]);

/**
 * Create user schema (admin)
 */
export const createUserApiSchema = z.object({
  email: emailSchema,
  password: strongPasswordFieldSchema,
  name: z.string().min(1, 'Name is required').max(200),
  role: userRoleEnum,
  department: z.string().max(100).optional().nullable().or(z.literal('')),
});

/**
 * Update user schema (admin)
 */
export const updateUserApiSchema = z.object({
  name: z.string().max(200).optional(),
  role: userRoleEnum.optional(),
  department: z.string().max(100).optional().nullable().or(z.literal('')),
  is_active: z.boolean().optional(),
});

/**
 * Update permission schema (admin)
 */
export const updatePermissionApiSchema = z.object({
  can_view: z.boolean().optional(),
  can_create: z.boolean().optional(),
  can_edit: z.boolean().optional(),
  can_delete: z.boolean().optional(),
  can_export: z.boolean().optional(),
  can_approve: z.boolean().optional(),
});

export type CreateUserApiData = z.infer<typeof createUserApiSchema>;
export type UpdateUserApiData = z.infer<typeof updateUserApiSchema>;
export type UpdatePermissionApiData = z.infer<typeof updatePermissionApiSchema>;
