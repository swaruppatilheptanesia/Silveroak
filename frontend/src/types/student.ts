// Core type definitions for the T&P system

export interface StudentMaster {
  student_id: string;
  full_name: string;
  roll_number: string;
  email: string;
  mobile: string;
  institute_name: string;
  course_name: string;
  department: string;
  batch_year: string;
  date_of_birth: string;
  profile_photo_url?: string;
  linkedin_url?: string;
  gender: 'male' | 'female' | 'other';
  category: string;
  permanent_address: string;
  current_address: string;
  parent_contact?: string;
  education_medium: string;
  profile_completion_percentage: number;
  profile_blocked?: boolean;
  profile_block_reason?: string | null;
  policy_accepted: boolean;
  policy_accepted_at?: string;
  created_at: string;
  updated_at: string;
}

export interface AcademicProfile {
  student_id: string;
  cgpa: number;
  tenth_percentage: number;
  twelfth_percentage?: number;
  diploma_percentage?: number;
  backlog_count: number;
  backlog_history: string[];
  semester: number;
  year: number;
  certifications: Certification[];
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  issue_date: string;
  expiry_date?: string;
  credential_url?: string;
}

export interface SkillsProfile {
  student_id: string;
  skill_tags: string[];
  domain_interests: string[];
  preferred_locations: string[];
  work_preference: 'internship' | 'full-time' | 'both';
}

export interface Project {
  id: string;
  student_id: string;
  portfolio_id?: string | null;
  title: string;
  description: string | null;
  role?: string | null;
  technologies: string[];
  keywords?: string[];
  start_date: string;
  end_date?: string;
  project_url?: string;
  github_url?: string;
  live_url?: string | null;
  attachments?: unknown[];
  display_order?: number;
}

export interface Resume {
  resume_id: string;
  student_id: string;
  resume_name: string;
  file_url: string;
  ai_score?: number;
  is_default: boolean;
  uploaded_at: string;
  file_size: number;
}

export interface InterestRegistration {
  student_id: string;
  interest_type: string;
  academic_year: string;
  registered_at: string;
}

export type InterestType = 
  | 'placement'
  | 'summer_internship'
  | 'winter_internship'
  | 'final_semester_internship'
  | 'nep_internship'
  | 'stipend_internship'
  | 'dissertation';

export type PostingTypeInterestValue = 'job' | 'internship' | 'stipend_internship';
export type StudentInterestRegistrationValue = string;

export interface EligibilityRule {
  id: string;
  rule_name: string;
  min_cgpa?: number;
  max_backlogs?: number;
  required_branches: string[];
  required_certifications?: string[];
  min_tenth_percentage?: number;
  min_twelfth_percentage?: number;
}

export type EligibilityStatus = 'eligible' | 'not_eligible' | 'conditional';

export interface EligibilityCheck {
  rule_id: string;
  rule_name: string;
  status: EligibilityStatus;
  reason?: string;
}

export interface CareerReadinessItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  completed_at?: string;
}

// Current Employment Status
export type EmploymentType = 'employed' | 'business' | 'not_working';

export interface CurrentEmployment {
  student_id: string;
  is_currently_working: boolean;
  employment_type?: EmploymentType;
  company_name?: string;
  designation?: string;
  offer_letter_url?: string;
  business_proof_url?: string;
  visiting_card_url?: string;
  package_lpa?: number;
  work_profile_description?: string;
  joining_date?: string;
}

// ── API Response Types (match backend) ─────────────────

/** Backend response shape for GET /api/students/me */
export interface ApiStudentProfile {
  student: ApiStudentPersonal;
  academic: ApiAcademicProfile | null;
  skills: ApiSkillsProfile | null;
  employments: ApiEmployment[];
  /** Number of global policies the student has not yet accepted (registration gate). */
  pending_policy_count?: number;
}

export interface ApiStudentPersonal {
  id: string;
  user_id: string;
  enrollment_number: string;
  roll_number: string | null;
  email: string;
  full_name: string;
  mobile: string | null;
  date_of_birth: string | null;
  gender: string | null;
  department: string;
  batch: string;
  course: string | null;
  institute: string | null;
  category: string | null;
  aadhaar_number: string | null;
  temporary_enrolment_no: string | null;
  parent_name: string | null;
  parent_contact_no: string | null;
  blood_group: string | null;
  program_name: string | null;
  admission_year: number | null;
  current_semester: string | null;
  current_semester_spi: number | null;
  current_semester_cpi: number | null;
  current_semester_cgpa: number | null;
  exam_form_status: string | null;
  overall_attendance_percentage: number | null;
  board10: string | null;
  passing_year10: number | null;
  board12_or_diploma: string | null;
  passing_year12_or_diploma: number | null;
  linkedin_url: string | null;
  alternate_phone: string | null;
  profile_photo_url: string | null;
  residential_address: string | null;
  permanent_address: string | null;
  profile_blocked: boolean;
  profile_block_reason: string | null;
  profile_completion_percentage: number;
  policy_accepted: boolean;
  policy_accepted_at: string | null;
  tenant_id: string;
  created_at: string;
  updated_at: string;
}

export interface ApiAcademicProfile {
  id: string;
  cgpa: number | null;
  tenth_percentage: number | null;
  twelfth_percentage: number | null;
  diploma_percentage: number | null;
  backlog_count: number;
  active_backlogs: number;
  semester: number | null;
  year_of_study: number | null;
  course_duration: number | null;
}

export interface ApiSkillsProfile {
  id: string;
  technical_skills: string[];
  domain_interests: string[];
  preferred_locations: string[];
}

export interface ApiProject {
  id: string;
  title: string;
  description: string | null;
  role: string | null;
  technologies: string[];
  keywords: string[];
  github_url: string | null;
  demo_url: string | null;
  live_url: string | null;
  start_date: string | null;
  end_date: string | null;
  is_ongoing: boolean;
  attachments: unknown[];
  display_order: number;
  portfolio_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiCertification {
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

export interface ApiEmployment {
  id: string;
  employment_type: string | null;
  company_name: string | null;
  designation: string | null;
  package_lpa: number | null;
  status: 'active' | 'closed';
  closed_at: string | null;
  offer_letter_url: string | null;
  completion_proof_url: string | null;
  completion_proof_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiResume {
  id: string;
  name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  is_default: boolean;
  uploaded_at: string;
}

export type InterestRegistrationStatus = 'pending' | 'approved' | 'withdrawn';

export interface ApiInterest {
  id: string;
  student_id: string;
  interest_type: string;
  registered_at: string;
  /** TPO approval state. Pre-approval feature rows / grandfathered rows are 'approved'. */
  status: InterestRegistrationStatus;
  /** Timestamp of the last TPO approve/withdraw action (null for un-reviewed rows). */
  reviewed_at?: string | null;
  /** Snapshot of the acting admin's name at review time (null for legacy rows). */
  reviewed_by_name?: string | null;
  /** Optional reason the admin gave when withdrawing. */
  status_reason?: string | null;
}

// ── Input Types for mutations ──────────────────────────

export interface UpdatePersonalInput {
  alternate_phone?: string | null;
  linkedin_url?: string | null;
}

export interface UpdateAcademicInput {
  cgpa?: number | null;
  tenth_percentage?: number | null;
  twelfth_percentage?: number | null;
  diploma_percentage?: number | null;
  backlog_count?: number;
  active_backlogs?: number;
  semester?: number | null;
  year_of_study?: number | null;
  course_duration?: number | null;
}

export interface UpdateSkillsInput {
  technical_skills?: string[];
  domain_interests?: string[];
  preferred_locations?: string[];
}

export interface CreateProjectInput {
  title: string;
  description?: string | null;
  role?: string | null;
  technologies?: string[];
  keywords?: string[];
  github_url?: string | null;
  demo_url?: string | null;
  live_url?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_ongoing?: boolean;
  display_order?: number;
}

export interface CreateCertificationInput {
  name: string;
  issuer: string;
  issue_date?: string | null;
  credential_url?: string | null;
  document_url: string;
  document_name?: string | null;
  document_mime_type?: string | null;
  document_size?: number | null;
}

export interface StudentDocumentUpload {
  document_url: string;
  document_name: string;
  document_mime_type: string;
  document_size: number;
}

export interface CreateEmploymentInput {
  employment_type: string;
  company_name: string;
  designation: string;
  package_lpa?: number | null;
}

export interface PolicyAcceptanceInput {
  policy_id?: string;
  policy_read: true;
  rules_accepted: true;
  // Optional sharing consents. The simplified single-checkbox flow (registration gate +
  // profile Policies tab) omits them; the legacy /policy page still sends all four as true.
  profile_sharing_consent?: boolean;
  resume_sharing_consent?: boolean;
  data_storage_consent?: boolean;
  communication_consent?: boolean;
}

export interface InterestRegistrationInput {
  interest_types: string[];
}

// ── Placement preferences (opt-out) ──
export interface PlacementPostingTypePreference {
  posting_type_master_id: string;
  value: string;
  interested: boolean;
  reason: string | null;
  updated_at: string | null;
}

export interface PlacementPreferenceHistoryItem {
  id: string;
  scope: 'global' | 'posting_type';
  posting_type_master_id: string | null;
  posting_type_label: string | null;
  interested: boolean;
  reason: string | null;
  created_at: string;
}

export interface PlacementPreferences {
  global: {
    opted_out: boolean;
    reason: string | null;
    updated_at: string | null;
  };
  posting_types: PlacementPostingTypePreference[];
  history: PlacementPreferenceHistoryItem[];
}

export interface GlobalPlacementOptOutInput {
  opted_out: boolean;
  reason?: string | null;
}

export interface PostingTypePreferenceInput {
  posting_type_master_id: string;
  interested: boolean;
  reason?: string | null;
}
