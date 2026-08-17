import { z } from 'zod';
import { dateRangeSchema, paginationSchema, phoneSchema, searchSchema, sortSchema, strongPasswordSchema } from '../../shared/schemas/common';

// Internal-staff accounts must use an institute email. Both domains are official (CRM-fetched staff
// carry @socet.edu.in). Mirrored on the FE in UserManagementTab.tsx — keep the two in sync.
const INSTITUTE_EMAIL_DOMAINS = ['@silveroakuni.ac.in', '@socet.edu.in'];

const optionalPhoneSchema = z.preprocess(
  (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
  phoneSchema
);

const crmDepartmentTypeSchema = z.coerce.number().int().refine((value) => value === 1 || value === 2, {
  message: 'department_type must be 1 or 2',
});

const crmEmployeeCodeSchema = z.preprocess(
  (value) => (typeof value === 'number' ? String(value) : value),
  z.string().max(50).optional().nullable()
);

export const createUserSchema = z
  .object({
    email: z.string().email().max(255),
    password: strongPasswordSchema,
    name: z.string().min(1).max(200),
    role: z.enum(['student', 'tpo_admin', 'tpo_employee', 'faculty_coordinator', 'recruiter', 'management', 'super_admin']),
    phone: optionalPhoneSchema,
    department: z.string().max(100).optional().nullable(),
    designation: z.string().max(100).optional().nullable(),
    crm_employee_code: crmEmployeeCodeSchema,
    institutes: z.array(z.string().max(200)).default([]),
    courses: z.array(z.string().max(200)).default([]),
    branches: z.array(z.string().max(200)).default([]),
    company_id: z.string().uuid().optional().nullable(),
  })
  .superRefine((value, ctx) => {
    if (value.role === 'recruiter' && !value.company_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['company_id'],
        message: 'company_id is required when role is recruiter',
      });
    }

    // Internal SOU staff must use the institute email domain.
    const internalStaffRoles = new Set([
      'tpo_admin',
      'tpo_employee',
      'faculty_coordinator',
      'management',
    ]);
    const email = value.email.toLowerCase();
    if (
      internalStaffRoles.has(value.role)
      && !INSTITUTE_EMAIL_DOMAINS.some((domain) => email.endsWith(domain))
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['email'],
        message: 'TPO, Faculty and Management accounts must use a @silveroakuni.ac.in or @socet.edu.in email address',
      });
    }
  });

export const linkRecruiterToCompanySchema = z.object({
  company_id: z.string().uuid('company_id must be a UUID'),
});

export const updateUserSchema = z.object({
  name: z.string().max(200).optional(),
  role: z.enum(['student', 'tpo_admin', 'tpo_employee', 'faculty_coordinator', 'recruiter', 'management', 'super_admin']).optional(),
  phone: optionalPhoneSchema,
  department: z.string().max(100).optional().nullable(),
  designation: z.string().max(100).optional().nullable(),
  crm_employee_code: crmEmployeeCodeSchema,
  institutes: z.array(z.string().max(200)).optional(),
  courses: z.array(z.string().max(200)).optional(),
  branches: z.array(z.string().max(200)).optional(),
  is_active: z.boolean().optional(),
});

export const queryCrmDepartmentsSchema = z.object({
  department_type: crmDepartmentTypeSchema,
});

export const queryCrmEmployeesSchema = z.object({
  department_type: crmDepartmentTypeSchema,
  department_id: z.coerce.number().int().positive(),
});

export const crmEmployeeParamSchema = z.object({
  empId: z.coerce.number().int().positive(),
});

export const queryUsersSchema = paginationSchema.merge(sortSchema).extend({
  role: z.enum(['student', 'tpo_admin', 'tpo_employee', 'faculty_coordinator', 'recruiter', 'management', 'super_admin']).optional(),
  is_active: z.enum(['true', 'false']).optional(),
  search: z.string().optional(),
});

export const queryAuditLogsSchema = paginationSchema.merge(sortSchema).extend({
  module: z.string().max(50).optional(),
  action: z.string().max(50).optional(),
  user_id: z.string().uuid().optional(),
  // .catch(undefined): any non-role value (e.g. the FE 'all' sentinel or a stale/empty value) falls back to
  // "no role filter" instead of throwing a 400 — the role dropdown can never fail request validation.
  role: z.enum(['student', 'tpo_admin', 'tpo_employee', 'faculty_coordinator', 'recruiter', 'management', 'super_admin']).optional().catch(undefined),
});

const verificationStatusSchema = z.enum(['pending', 'verified', 'rejected']);

export const queryStudentsSchema = paginationSchema.merge(sortSchema).extend({
  department: z.string().max(100).optional(),
  batch: z.string().max(20).optional(),
  verification_status: verificationStatusSchema.optional(),
  search: z.string().max(200).optional(),
  min_cgpa: z.coerce.number().min(0).max(10).optional(),
  max_cgpa: z.coerce.number().min(0).max(10).optional(),
  posting_type_master_id: z.string().uuid().optional(),
  // Scope filters (FILTER COUNTER EXPORT sheet)
  institute: z.string().max(200).optional(),
  course: z.string().max(200).optional(),
  branch: z.string().max(200).optional(),
  semester: z.string().max(50).optional(),
  academic_year: z.string().max(50).optional(),
  company_id: z.string().uuid().optional(),
  date_from: z.string().max(40).optional(),
  date_to: z.string().max(40).optional(),
});

export const verifyStudentSchema = z.object({
  status: z.enum(['verified', 'rejected']),
  remarks: z.string().max(2000).optional().nullable(),
}).superRefine((value, ctx) => {
  if (value.status === 'rejected' && !value.remarks?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Remarks are required when rejecting a student',
      path: ['remarks'],
    });
  }
});

export const updateStudentProfileBlockSchema = z.object({
  profile_blocked: z.boolean(),
  reason: z.string().max(2000).optional().nullable(),
}).superRefine((value, ctx) => {
  if (value.profile_blocked && !value.reason?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Reason is required when blocking a student profile',
      path: ['reason'],
    });
  }
});

// Reopen a student's placement (TPO-admin only). scope 'global' clears the overall opt-out;
// scope 'posting_type' re-enables one posting type. No reason captured.
export const reopenPlacementSchema = z.object({
  scope: z.enum(['global', 'posting_type']),
  posting_type_master_id: z.string().uuid().optional(),
}).superRefine((value, ctx) => {
  if (value.scope === 'posting_type' && !value.posting_type_master_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'posting_type_master_id is required when scope is posting_type',
      path: ['posting_type_master_id'],
    });
  }
});

export const bulkVerifyStudentsSchema = z.object({
  student_ids: z.array(z.string().uuid()).min(1).max(500),
  remarks: z.string().max(2000).optional().nullable(),
});

export const createEligibilityRuleSchema = z.object({
  rule_name: z.string().min(1).max(200),
  company_name: z.string().max(300).optional().nullable(),
  min_cgpa: z.coerce.number().min(0).max(10).default(0),
  max_backlogs: z.coerce.number().int().min(0).default(0),
  required_branches: z.array(z.string().max(100)).default([]),
  eligible_batches: z.array(z.string().max(20)).default([]),
  min_tenth_percentage: z.coerce.number().min(0).max(100).optional().nullable(),
  min_twelfth_percentage: z.coerce.number().min(0).max(100).optional().nullable(),
  additional_criteria: z.string().max(5000).optional().nullable(),
  is_active: z.boolean().default(true),
});

export const updateEligibilityRuleSchema = createEligibilityRuleSchema.partial();

export const querySelectionDatabaseSchema = dateRangeSchema.merge(searchSchema).extend({
  type: z.enum(['placement', 'internship']).optional(),
  posting_type: z.enum(['job', 'internship', 'stipend_internship']).optional(),
  department: z.string().max(100).optional(),
  batch: z.string().max(20).optional(),
  company: z.string().max(300).optional(),
  outcome: z.enum(['joined', 'not_joined', 'pending']).optional(),
  institute: z.string().max(200).optional(),
  course: z.string().max(200).optional(),
  branch: z.string().max(200).optional(),
  semester: z.string().max(50).optional(),
  academic_year: z.string().max(50).optional(),
});

export const queryPortfoliosSchema = searchSchema.extend({
  department: z.string().max(100).optional(),
  status: z.enum(['draft', 'published']).optional(),
  institute: z.string().max(200).optional(),
  course: z.string().max(200).optional(),
  branch: z.string().max(200).optional(),
  semester: z.string().max(50).optional(),
});

export const queryInterestRegistrationsSchema = searchSchema.extend({
  interest_type: z.string().max(150).optional(),
  posting_type: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  status: z.enum(['pending', 'approved', 'withdrawn']).optional(),
  // FILTER COUNTER EXPORT — student-scope + registration date range
  institute: z.string().max(200).optional(),
  course: z.string().max(200).optional(),
  branch: z.string().max(200).optional(),
  semester: z.string().max(50).optional(),
  academic_year: z.string().max(50).optional(),
  date_from: z.string().optional(),
  date_to: z.string().optional(),
});

export const withdrawInterestRegistrationSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const updatePermissionSchema = z.object({
  can_view: z.boolean().optional(),
  can_create: z.boolean().optional(),
  can_edit: z.boolean().optional(),
  can_delete: z.boolean().optional(),
  can_export: z.boolean().optional(),
  can_approve: z.boolean().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type LinkRecruiterToCompanyInput = z.infer<typeof linkRecruiterToCompanySchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type QueryCrmDepartmentsInput = z.infer<typeof queryCrmDepartmentsSchema>;
export type QueryCrmEmployeesInput = z.infer<typeof queryCrmEmployeesSchema>;
export type CrmEmployeeParamInput = z.infer<typeof crmEmployeeParamSchema>;
export type QueryUsersInput = z.infer<typeof queryUsersSchema>;
export type QueryAuditLogsInput = z.infer<typeof queryAuditLogsSchema>;
export type QueryStudentsInput = z.infer<typeof queryStudentsSchema>;
export type VerifyStudentInput = z.infer<typeof verifyStudentSchema>;
export type UpdateStudentProfileBlockInput = z.infer<typeof updateStudentProfileBlockSchema>;
export type ReopenPlacementInput = z.infer<typeof reopenPlacementSchema>;
export type BulkVerifyStudentsInput = z.infer<typeof bulkVerifyStudentsSchema>;
export type CreateEligibilityRuleInput = z.infer<typeof createEligibilityRuleSchema>;
export type UpdateEligibilityRuleInput = z.infer<typeof updateEligibilityRuleSchema>;
export type QuerySelectionDatabaseInput = z.infer<typeof querySelectionDatabaseSchema>;
export type QueryPortfoliosInput = z.infer<typeof queryPortfoliosSchema>;
export type QueryInterestRegistrationsInput = z.infer<typeof queryInterestRegistrationsSchema>;
export type WithdrawInterestRegistrationInput = z.infer<typeof withdrawInterestRegistrationSchema>;
export type UpdatePermissionInput = z.infer<typeof updatePermissionSchema>;
