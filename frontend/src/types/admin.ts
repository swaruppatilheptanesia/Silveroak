// Module 15: Admin Panel Types
import type { AcademicProfile } from '@/types/student';
import type { ApiPostingType } from '@/types/posting';

export type UserRole =
  | 'student'
  | 'tpo_admin'
  | 'tpo_employee'
  | 'faculty_coordinator'
  | 'recruiter'
  | 'management'
  | 'super_admin';

// ── API Response Types ─────────────────────────────────

export interface ApiRecruiterProfileSummary {
  id: string;
  company_id: string;
  verification_status: 'pending' | 'verified' | 'rejected';
  company: { id: string; name: string };
}

export interface ApiUserListItem {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone: string | null;
  department: string | null;
  designation: string | null;
  crm_employee_code: string | null;
  institutes: string[];
  courses: string[];
  branches: string[];
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  recruiter_profile: ApiRecruiterProfileSummary | null;
}

export interface ApiUserDetail extends ApiUserListItem {
  updated_at: string;
}

export interface PaginatedUsers {
  data: ApiUserListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiAuditLog {
  id: string;
  module: string;
  action: string;
  details: string | null;
  ip_address: string | null;
  user: {
    name: string;
    email: string;
  } | null;
  created_at: string;
}

export interface PaginatedAuditLogs {
  data: ApiAuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiPermission {
  id: string;
  role: UserRole;
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
  can_approve: boolean;
}

// ── Query Parameters ───────────────────────────────────

export interface UserQueryParams {
  role?: UserRole;
  is_active?: 'true' | 'false';
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: 'name' | 'email' | 'role' | 'department' | 'is_active' | 'last_login_at';
  sort_order?: 'asc' | 'desc';
}

export interface AuditLogQueryParams {
  module?: string;
  action?: string;
  user_id?: string;
  role?: UserRole;
  page?: number;
  limit?: number;
  sort_by?: 'created_at' | 'user' | 'action' | 'module';
  sort_order?: 'asc' | 'desc';
}

// ── Input Types ────────────────────────────────────────

export interface CreateUserInput {
  email: string;
  password: string;
  name: string;
  role: UserRole;
  phone?: string | null;
  department?: string | null;
  designation?: string | null;
  crm_employee_code?: string | null;
  institutes?: string[];
  courses?: string[];
  branches?: string[];
  company_id?: string | null;
}

export interface LinkRecruiterToCompanyInput {
  company_id: string;
}

export interface UpdateUserInput {
  name?: string;
  role?: UserRole;
  phone?: string | null;
  department?: string | null;
  designation?: string | null;
  crm_employee_code?: string | null;
  institutes?: string[];
  courses?: string[];
  branches?: string[];
  is_active?: boolean;
}

export interface UpdateStudentProfileBlockInput {
  profile_blocked: boolean;
  reason?: string | null;
}

export interface ApiCrmDepartmentOption {
  id: number;
  departmentName: string;
}

export interface ApiCrmEmployeeOption {
  employeeCode: number;
  employeeName: string;
}

export interface ApiCrmEmployeeDetail {
  employeeCode: number;
  employeeName: string;
  department: string | null;
  personalEmail: string | null;
  officialEmail: string | null;
  mobileNo: string | null;
  designation: string | null;
}

export interface UpdatePermissionInput {
  can_view?: boolean;
  can_create?: boolean;
  can_edit?: boolean;
  can_delete?: boolean;
  can_export?: boolean;
  can_approve?: boolean;
}

// ── TPO Admin Student Management Types ────────────────

export type AdminStudentVerificationStatus = 'pending' | 'verified' | 'rejected';

export type InterestRegistrationStatus = 'pending' | 'approved' | 'withdrawn';

export interface ApiAdminStudentInterest {
  id: string;
  interest_type: string;
  registered_at: string;
  label: string;
  status: InterestRegistrationStatus;
  /** Last TPO approve/withdraw timestamp (null for un-reviewed rows). */
  reviewed_at?: string | null;
  /** Snapshot of the acting admin's name at review time (null for legacy rows). */
  reviewed_by_name?: string | null;
  /** Optional reason the admin gave when withdrawing. */
  status_reason?: string | null;
}

export interface ApiAdminStudentProject {
  id: string;
  title: string;
  description: string | null;
  technologies: string[];
  github_url: string | null;
  demo_url: string | null;
  start_date: string | null;
  end_date: string | null;
  is_ongoing: boolean;
  created_at: string;
}

export interface ApiAdminStudentCertification {
  id: string;
  name: string;
  issuer: string;
  issue_date: string | null;
  credential_url: string | null;
  document_url: string | null;
  document_name: string | null;
  document_mime_type: string | null;
  document_size: number | null;
  created_at: string;
}

export interface ApiAdminStudentResume {
  id: string;
  name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  is_default: boolean;
  ai_score: number | null;
  uploaded_at: string;
}

export interface ApiAdminStudentApplication {
  id: string;
  current_stage: string;
  applied_at: string;
  updated_at: string;
  posting: {
    id: string;
    title: string;
    role_name: string;
    type: string;
    status: string;
    ctc: string | null;
    stipend: string | null;
    company_name: string;
  };
  resume: {
    id: string;
    name: string;
    file_url: string;
  } | null;
}

export interface ApiAdminStudentOffer {
  id: string;
  type: string;
  role: string;
  ctc: string | null;
  stipend: string | null;
  location: string | null;
  offer_date: string;
  status: string;
  accepted_at: string | null;
  joining_status: string;
  joining_date: string | null;
  company_name: string;
  posting_title: string;
}

export interface ApiAdminStudentInternship {
  id: string;
  company_name: string;
  role: string;
  internship_type: string;
  status: string;
  start_date: string;
  end_date: string | null;
  stipend_amount: number | null;
  stipend_frequency: string | null;
  is_receiving_stipend: boolean;
  certificate_uploaded: boolean;
  certificate_url: string | null;
  issue_count: number;
  open_issue_count: number;
  created_at: string;
}

export interface ApiAdminStudentNocRequest {
  id: string;
  noc_type: string;
  program: string;
  placement_source: string;
  company_name: string;
  role_title: string;
  stipend_amount: number | null;
  start_date: string;
  end_date: string | null;
  offer_letter_url: string | null;
  status: string;
  noc_number: string | null;
  certificate_url: string | null;
  created_at: string;
}

export interface ApiAdminStudentPolicyAcceptance {
  id: string;
  policy_id: string | null;
  policy_title: string | null;
  policy_version: string | null;
  policy_updated_at: string | null;
  accepted_at: string;
}

export interface ApiAdminStudentPortfolio {
  id: string;
  status: string;
  project_count: number;
  internship_count: number;
  updated_at: string;
  projects: Array<{
    id: string;
    title: string;
    description: string | null;
    role: string | null;
    technologies: string[];
    keywords: string[];
    github_url: string | null;
    live_url: string | null;
    start_date: string | null;
    end_date: string | null;
    is_ongoing: boolean;
  }>;
  showcases: Array<{
    id: string;
    company_name: string;
    role: string;
    duration_months: number | null;
    start_date: string | null;
    end_date: string | null;
    key_outcomes: string[];
    proof_url: string | null;
    is_verified: boolean;
    linked_internship_id: string | null;
  }>;
}

export interface ApiAdminStudentNoDuesRequest {
  id: string;
  exit_reason: string;
  company_name: string | null;
  designation: string | null;
  package_lpa: number | null;
  status: string;
  ndc_number: string | null;
  proof_url: string | null;
  certificate_url: string | null;
  created_at: string;
}

export interface ApiAdminStudent {
  student_id: string;
  user_id: string;
  enrollment_number: string;
  roll_number: string;
  full_name: string;
  email: string;
  mobile: string | null;
  alternate_phone: string | null;
  institute_name: string | null;
  course_name: string | null;
  department: string;
  batch_year: string;
  date_of_birth: string | null;
  profile_photo_url: string | null;
  profile_blocked: boolean;
  profile_block_reason: string | null;
  linkedin_url: string | null;
  gender: string | null;
  category: string | null;
  aadhaar_number: string | null;
  parent_name: string | null;
  parent_contact_no: string | null;
  blood_group: string | null;
  program_name: string | null;
  admission_year: number | null;
  current_semester: string | null;
  overall_attendance_percentage: number | null;
  permanent_address: string | null;
  current_address: string | null;
  residential_address: string | null;
  profile_completion_percentage: number;
  policy_accepted: boolean;
  policy_accepted_at: string | null;
  no_dues_enabled: boolean;
  verificationStatus: AdminStudentVerificationStatus;
  verification_remarks: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  academicProfile: AcademicProfile;
  interests: ApiAdminStudentInterest[];
  skills: {
    technical_skills: string[];
    domain_interests: string[];
    preferred_locations: string[];
  } | null;
  employments: {
    id: string;
    is_currently_working: boolean;
    employment_type: string | null;
    company_name: string | null;
    designation: string | null;
    package_lpa: number | null;
    status: 'active' | 'closed';
    closed_at: string | null;
    offer_letter_url: string | null;
    completion_proof_url: string | null;
    completion_proof_name: string | null;
    updated_at: string;
  }[];
  projects: ApiAdminStudentProject[];
  certifications: ApiAdminStudentCertification[];
  resumes: ApiAdminStudentResume[];
  applications: ApiAdminStudentApplication[];
  offers: ApiAdminStudentOffer[];
  internships: ApiAdminStudentInternship[];
  noc_requests: ApiAdminStudentNocRequest[];
  policy_acceptances: ApiAdminStudentPolicyAcceptance[];
  portfolio: ApiAdminStudentPortfolio | null;
  no_dues_requests: ApiAdminStudentNoDuesRequest[];
  placement: {
    opted_out: boolean;
    reason: string | null;
    opted_out_at: string | null;
  };
  posting_type_opt_outs: {
    posting_type_master_id: string;
    label: string;
    reason: string | null;
    updated_at: string;
  }[];
  placement_pref_history: {
    id: string;
    scope: 'global' | 'posting_type';
    posting_type_master_id: string | null;
    posting_type_label: string | null;
    interested: boolean;
    reason: string | null;
    created_at: string;
  }[];
}

export interface ReopenPlacementInput {
  scope: 'global' | 'posting_type';
  posting_type_master_id?: string;
}

export interface PaginatedAdminStudents {
  data: ApiAdminStudent[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface AdminStudentQueryParams {
  search?: string;
  department?: string;
  batch?: string;
  verification_status?: AdminStudentVerificationStatus;
  min_cgpa?: number;
  max_cgpa?: number;
  posting_type_master_id?: string;
  institute?: string;
  course?: string;
  branch?: string;
  semester?: string;
  academic_year?: string;
  company_id?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
  sort_by?: 'full_name' | 'department' | 'profile_completion_percentage' | 'verification_status' | 'batch' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

export interface VerifyStudentInput {
  status: Extract<AdminStudentVerificationStatus, 'verified' | 'rejected'>;
  remarks?: string | null;
}

export interface BulkVerifyStudentsInput {
  student_ids: string[];
  remarks?: string | null;
}

export interface BulkVerifyStudentsResult {
  updated_count: number;
  message: string;
}

export interface ApiAdminEligibilityRule {
  id: string;
  rule_name: string;
  company_name: string | null;
  min_cgpa: number | null;
  max_backlogs: number;
  required_branches: string[];
  eligible_batches: string[];
  min_tenth_percentage: number | null;
  min_twelfth_percentage: number | null;
  additional_criteria: string | null;
  is_active: boolean;
  eligible_students_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAdminEligibilityRuleInput {
  rule_name: string;
  company_name?: string | null;
  min_cgpa?: number;
  max_backlogs?: number;
  required_branches?: string[];
  eligible_batches?: string[];
  min_tenth_percentage?: number | null;
  min_twelfth_percentage?: number | null;
  additional_criteria?: string | null;
  is_active?: boolean;
}

export type UpdateAdminEligibilityRuleInput = Partial<CreateAdminEligibilityRuleInput>;

export interface ApiAdminPortfolioRecord {
  id: string;
  student_id: string;
  student_name: string;
  enrollment_number: string;
  department: string;
  batch: string;
  status: 'draft' | 'published';
  project_count: number;
  internship_count: number;
  last_updated: string;
  created_at: string;
}

export interface AdminPortfolioQueryParams {
  search?: string;
  department?: string;
  status?: 'draft' | 'published';
  institute?: string;
  course?: string;
  branch?: string;
  semester?: string;
}

export interface ApiAdminPortfolioStats {
  total: number;
  published: number;
  draft: number;
  withProjects: number;
  avgProjects: number;
}

export interface ApiAdminPortfoliosResponse {
  data: ApiAdminPortfolioRecord[];
  stats: ApiAdminPortfolioStats;
}

export type AdminSelectionType = 'placement' | 'internship';
export type AdminSelectionOutcome = 'joined' | 'not_joined' | 'pending';

export interface ApiAdminSelectionRecord {
  id: string;
  student_name: string;
  enrollment_number: string;
  department: string;
  batch: string;
  institute?: string | null;
  course?: string | null;
  semester?: string | null;
  gender?: string | null;
  email?: string | null;
  mobile?: string | null;
  cgpa?: number | null;
  tenth_percentage?: number | null;
  twelfth_percentage?: number | null;
  backlog_count?: number | null;
  company_name: string;
  role: string;
  type: AdminSelectionType;
  posting_type: ApiPostingType | null;
  selection_date: string;
  outcome: AdminSelectionOutcome;
  joining_date: string | null;
  finalized_by: string | null;
  is_locked: boolean;
  /** 'issued' when the student has an issued NOC, else 'pending'. */
  noc_status: 'issued' | 'pending';
}

export interface SelectionDatabaseQueryParams {
  search?: string;
  type?: AdminSelectionType;
  posting_type?: ApiPostingType;
  department?: string;
  batch?: string;
  company?: string;
  outcome?: AdminSelectionOutcome;
  date_from?: string;
  date_to?: string;
  institute?: string;
  course?: string;
  branch?: string;
  semester?: string;
  academic_year?: string;
}

export interface ApiAdminSelectionDatabaseResponse {
  data: ApiAdminSelectionRecord[];
  counts: {
    placements: number;
    internships: number;
  };
  stats: {
    total: number;
    joined: number;
    not_joined: number;
    pending: number;
    locked: number;
  };
}

export interface ApiInterestSummaryItem {
  interest_type: string;
  label: string;
  count: number;
  academic_year: string;
}

export interface InterestRegistrationsQueryParams {
  interest_type?: string;
  posting_type?: string;
  department?: string;
  search?: string;
  status?: InterestRegistrationStatus;
  // FILTER COUNTER EXPORT — student-scope + registration date range
  institute?: string;
  course?: string;
  branch?: string;
  semester?: string;
  academic_year?: string;
  date_from?: string;
  date_to?: string;
}

export interface ApiInterestRegistrationsResponse {
  data: ApiAdminStudent[];
  total: number;
}

/** A single recent interest-registration record for the TPO dashboard (newest-first list). */
export interface ApiRecentInterestRegistration {
  id: string;
  student_name: string;
  enrollment_number: string;
  department: string;
  /** Posting-type value string (humanize on render). */
  interest_type: string;
  status: InterestRegistrationStatus;
  registered_at: string;
}
