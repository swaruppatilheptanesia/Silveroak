export type NoDuesExitReason =
  | 'employment'
  | 'family_business'
  | 'planning_studies'
  | 'higher_studies'
  | 'competitive_exam';

export type NoDuesStatus =
  | 'draft'
  | 'pending_review'
  | 'under_review'
  | 'returned'
  | 'approved'
  | 'issued'
  | 'rejected';

export interface NoDuesRequest {
  id: string;
  student_id: string;
  student_name: string;
  roll_number: string;
  department: string;
  course_name?: string | null;
  batch_year?: string | null;
  email?: string | null;
  mobile?: string | null;
  exit_reason: NoDuesExitReason;
  company_name?: string | null;
  designation?: string | null;
  offer_letter_url?: string | null;
  package_lpa?: number | null;
  joining_date?: string | null;
  business_name?: string | null;
  business_nature?: string | null;
  business_address?: string | null;
  institution_name?: string | null;
  program_name?: string | null;
  admission_letter_url?: string | null;
  proof_url?: string | null;
  country?: string | null;
  sou_passing_year?: string | null;
  company_sector?: string | null;
  company_address?: string | null;
  language_test?: string | null;
  university_address?: string | null;
  examination_name?: string | null;
  additional_details?: string | null;
  declaration_accepted: boolean;
  remarks?: string | null;
  status: NoDuesStatus;
  admin_remarks?: string | null;
  ndc_number?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  issued_at?: string | null;
  certificate_url?: string | null;
  created_at: string;
  updated_at: string;
}

export const EXIT_REASON_LABELS: Record<NoDuesExitReason, string> = {
  employment: 'Job / Employment',
  family_business: 'Business / Entrepreneurship',
  planning_studies: 'Planning for Further Studies',
  higher_studies: 'Admission Taken for Further Study',
  competitive_exam: 'Competitive Exam Preparation',
};

export const NDC_STATUS_LABELS: Record<NoDuesStatus, string> = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  under_review: 'Under Review',
  returned: 'Returned for Clarification',
  approved: 'Approved',
  issued: 'Certificate Issued',
  rejected: 'Rejected',
};

export interface ApiNoDuesStudentSummary {
  id: string;
  full_name: string;
  enrollment_number: string;
  roll_number: string | null;
  department: string;
  batch: string;
  course: string | null;
  email: string;
  mobile: string | null;
}

export interface ApiNoDuesReviewer {
  id: string;
  name: string;
}

export interface ApiNoDuesBase {
  id: string;
  student_id: string;
  exit_reason: NoDuesExitReason;
  company_name: string | null;
  designation: string | null;
  package_lpa: number | string | null;
  joining_date: string | null;
  business_name: string | null;
  business_nature: string | null;
  business_address: string | null;
  institution_name: string | null;
  program_name: string | null;
  country: string | null;
  sou_passing_year: string | null;
  company_sector: string | null;
  company_address: string | null;
  language_test: string | null;
  university_address: string | null;
  examination_name: string | null;
  additional_details: string | null;
  proof_url: string | null;
  declaration_accepted: boolean;
  status: NoDuesStatus;
  admin_remarks: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  ndc_number: string | null;
  issued_at: string | null;
  certificate_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiNoDuesMyItem extends ApiNoDuesBase {}

export interface ApiNoDuesListItem extends ApiNoDuesBase {
  student: ApiNoDuesStudentSummary;
}

export interface ApiNoDuesDetail extends ApiNoDuesBase {
  student?: ApiNoDuesStudentSummary;
  reviewed_by_user?: ApiNoDuesReviewer | null;
}

export interface PaginatedNoDues {
  data: ApiNoDuesListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface NoDuesQueryParams {
  status?: Exclude<NoDuesStatus, 'draft'>;
  page?: number;
  limit?: number;
  sort_by?: 'student' | 'status' | 'created_at';
  sort_order?: 'asc' | 'desc';
  // FILTER COUNTER EXPORT — student-scope + passing year (batch)
  institute?: string;
  course?: string;
  branch?: string;
  passing_year?: string;
}

export interface CreateNoDuesInput {
  exit_reason: NoDuesExitReason;
  declaration_accepted: true;
  company_name?: string | null;
  designation?: string | null;
  package_lpa?: number | null;
  joining_date?: string | null;
  business_name?: string | null;
  business_nature?: string | null;
  business_address?: string | null;
  institution_name?: string | null;
  program_name?: string | null;
  country?: string | null;
  sou_passing_year?: string | null;
  company_sector?: string | null;
  company_address?: string | null;
  language_test?: string | null;
  university_address?: string | null;
  examination_name?: string | null;
  additional_details?: string | null;
  proof_url?: string | null;
}

export interface ReviewNoDuesInput {
  status: 'pending_review' | 'under_review' | 'approved' | 'returned' | 'rejected';
  admin_remarks?: string | null;
}

export interface NoDuesEligibility {
  enabled: boolean;
  enrollment_number: string;
}

export interface ImportNoDuesEligibilityResult {
  file_name: string;
  parsed_count: number;
  matched_count: number;
  enabled_count: number;
  unmatched_enrollment_numbers: string[];
}

export interface EnableNoDuesEligibilityResult {
  enrollment_number: string;
  parsed_count: number;
  matched_count: number;
  enabled_count: number;
  unmatched_enrollment_numbers: string[];
}

export interface NoDuesProofUpload {
  proof_url: string;
  proof_name: string;
  proof_mime_type: string;
  proof_size: number;
}
