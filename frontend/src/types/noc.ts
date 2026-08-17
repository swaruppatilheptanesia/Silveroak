// NOC Module Type Definitions

import type { NocTemplatePreviewValues } from '@/types/nocTemplate';

export type NOCType = 'internship' | 'training' | 'project';

export type NOCProgram = string;

export type PlacementSource = 'university_drive' | 'self_sourced';

export type NOCStatus = 
  | 'draft' 
  | 'pending_faculty' 
  | 'pending_tpo' 
  | 'pending_company_verification' 
  | 'approved' 
  | 'issued' 
  | 'rejected';

export type CompanyVerificationStatus = 'verified' | 'pending' | 'rejected';

export type CompletionCertStatus = 'pending' | 'approved' | 'rejected';
export type CompanySource = 'admin' | 'student' | 'recruiter' | 'import';

export interface NOCRequest {
  id: string;
  student_id: string;
  student_name: string;
  enrollment_number: string;
  department: string;
  semester: number;
  batch: string;
  email: string;
  mobile: string;
  parent_mobile?: string;
  
  // NOC Type & Program
  noc_type: NOCType;
  internship_type?: 'internship' | 'placement' | null;
  program: NOCProgram;
  placement_source: PlacementSource;
  
  // If from university drive
  drive_id?: string;
  drive_name?: string;
  offer_id?: string;
  
  // Company Details
  company_id?: string;
  company_name: string;
  company_address: string;
  company_city: string;
  company_state: string;
  company_pincode: string;
  company_pan?: string | null;
  company_gst?: string | null;
  company_verification_status: CompanyVerificationStatus;
  company?: ApiNocCompanySummary | null;
  supporting_document_url?: string | null;
  supporting_document_name?: string | null;

  // Company Contact Person
  contact_person_name: string;
  contact_person_phone: string;
  contact_person_email: string;
  contact_person_designation: string;
  
  // How company was referred
  company_reference_by: 'self' | 'faculty' | 'alumni' | 'placement_cell' | 'other';
  company_reference_details?: string;
  reference_by?: string | null;
  reference_details?: string | null;
  
  // Internship/Training/Project Details
  role_title: string;
  technology_domain: string;
  job_description?: string;
  stipend_amount?: number;
  stipend_currency: string;
  start_date: string;
  end_date: string;
  duration_weeks: number;
  
  // Documents
  offer_letter_url?: string;
  
  // Status & Workflow
  status: NOCStatus;
  rejection_reason?: string;
  
  // Faculty Approval
  faculty_approver_id?: string;
  faculty_approver_name?: string;
  faculty_approved_at?: string;
  faculty_remarks?: string;
  faculty_decision?: 'approved' | 'rejected';
  
  // TPO Approval
  tpo_approver_id?: string;
  tpo_approver_name?: string;
  tpo_approved_at?: string;
  tpo_remarks?: string;
  tpo_decision?: 'approved' | 'rejected';
  
  // Issued NOC
  noc_number?: string;
  issued_at?: string;
  certificate_url?: string;
  certificate_snapshot?: ApiNocCertificateSnapshot | null;
  rejected_at?: string;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface NOCApprovalAction {
  request_id: string;
  action: 'approve' | 'reject';
  remarks?: string;
  approver_id: string;
  approver_name: string;
  approved_at: string;
}

export interface NOCCertificate {
  noc_number: string;
  student_name: string;
  enrollment_number: string;
  department: string;
  semester: number;
  company_name: string;
  role_title: string;
  program: NOCProgram;
  start_date: string;
  end_date: string;
  issued_at: string;
  issued_by: string;
}

// Labels and display helpers
export const NOC_TYPE_LABELS: Record<NOCType, string> = {
  internship: 'Internship',
  training: 'Training',
  project: 'Project Work',
};

export const NOC_PROGRAM_LABELS: Record<string, string> = {
  summer_internship: 'Summer Internship',
  winter_internship: 'Winter Internship',
  final_semester_internship: 'Final Semester Internship',
  nep_internship: 'NEP Internship',
  stipend_internship: 'Stipend-Based Internship',
  dissertation: 'Dissertation / Project',
  industrial_training: 'Industrial Training',
};

export const NOC_STATUS_CONFIG: Record<NOCStatus, { label: string; color: string; description: string }> = {
  draft: {
    label: 'Draft',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    description: 'Request saved as draft',
  },
  pending_faculty: {
    label: 'Pending Faculty Approval',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
    description: 'Awaiting faculty/coordinator approval',
  },
  pending_company_verification: {
    label: 'Pending Company Verification',
    color: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    description: 'Company verification in progress',
  },
  pending_tpo: {
    label: 'Pending TPO Approval',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    description: 'Awaiting final TPO approval',
  },
  approved: {
    label: 'Approved',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
    description: 'Request approved, NOC being generated',
  },
  issued: {
    label: 'Issued',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    description: 'NOC certificate issued',
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    description: 'Request was rejected',
  },
};

export const PLACEMENT_SOURCE_LABELS: Record<PlacementSource, string> = {
  university_drive: 'University Placement Drive',
  self_sourced: 'Self-Sourced / Off-Campus',
};

export const COMPANY_REFERENCE_LABELS: Record<string, string> = {
  self: 'Self / Direct Application',
  faculty: 'Faculty Reference',
  alumni: 'Alumni Reference',
  placement_cell: 'Placement Cell',
  other: 'Other',
};

// ── API Response Types (match backend) ─────────────────

export interface ApiNocStudentSummary {
  id: string;
  full_name: string;
  enrollment_number: string;
  department: string;
  batch?: string | null;
  current_semester?: string | null;
  course?: string | null;
  institute?: string | null;
  email?: string | null;
  mobile?: string | null;
  alternate_phone?: string | null;
}

export interface ApiNocApproverSummary {
  id: string;
  name: string;
}

export interface ApiNocCertificateSnapshot {
  template_id: string | null;
  template_name: string;
  posting_type_value: string;
  subject: string;
  body_html: string;
  values: NocTemplatePreviewValues;
  generated_at: string;
}

export interface ApiNocRecord {
  id: string;
  student_id: string;
  noc_type: NOCType;
  internship_type?: 'internship' | 'placement' | null;
  program: NOCProgram;
  placement_source: PlacementSource;
  drive_id: string | null;
  company_name: string;
  company_address: string | null;
  company_city: string | null;
  company_state: string | null;
  company_pincode: string | null;
  company_pan: string | null;
  company_gst: string | null;
  company_id: string | null;
  company_verification_status: CompanyVerificationStatus;
  supporting_document_url: string | null;
  supporting_document_name: string | null;
  contact_person_name: string | null;
  contact_person_designation: string | null;
  contact_person_phone: string | null;
  contact_person_email: string | null;
  reference_by: string | null;
  reference_details: string | null;
  role_title: string;
  technology_domain: string | null;
  job_description: string | null;
  stipend_amount: number | string | null;
  duration_weeks: number | null;
  offer_letter_url: string | null;
  status: NOCStatus;
  faculty_approved_by: string | null;
  faculty_approved_at: string | null;
  faculty_remarks: string | null;
  tpo_approved_by: string | null;
  tpo_approved_at: string | null;
  tpo_remarks: string | null;
  noc_number: string | null;
  start_date: string;
  end_date: string | null;
  issued_at: string | null;
  certificate_url: string | null;
  certificate_snapshot: ApiNocCertificateSnapshot | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  // Internship completion certificate (separate lifecycle from the NOC issuance above).
  completion_certificate_url: string | null;
  completion_certificate_name: string | null;
  completion_status: CompletionCertStatus | null;
  completion_submitted_at: string | null;
  completion_reviewed_at: string | null;
  completion_reviewed_by_name: string | null;
  completion_remarks: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiNocCompanySummary {
  id: string;
  name: string;
  source: CompanySource;
  verification_status: CompanyVerificationStatus;
}

export interface ApiNocListItem extends ApiNocRecord {
  student: ApiNocStudentSummary;
}

export interface ApiNocMyItem extends ApiNocRecord {
  company?: ApiNocCompanySummary | null;
  faculty_approved_by_user?: ApiNocApproverSummary | null;
  tpo_approved_by_user?: ApiNocApproverSummary | null;
}

export interface ApiNocDetail extends ApiNocRecord {
  student: ApiNocStudentSummary;
  company?: ApiNocCompanySummary | null;
  faculty_approved_by_user?: ApiNocApproverSummary | null;
  tpo_approved_by_user?: ApiNocApproverSummary | null;
}

export interface PaginatedNocs {
  data: ApiNocListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ── Query Parameters ───────────────────────────────────

export interface NocQueryParams {
  status?: NOCStatus;
  noc_type?: NOCType;
  completion_status?: CompletionCertStatus;
  page?: number;
  limit?: number;
  sort_by?: 'student' | 'noc_type' | 'company' | 'program' | 'status' | 'start_date' | 'created_at';
  sort_order?: 'asc' | 'desc';
  // FILTER COUNTER EXPORT — posting-type (program value) + student-scope + date range
  posting_type?: string;
  institute?: string;
  course?: string;
  branch?: string;
  academic_year?: string;
  date_from?: string;
  date_to?: string;
}

// ── Input Types ────────────────────────────────────────

export interface CreateNocInput {
  noc_type: NOCType;
  internship_type?: 'internship' | 'placement' | null;
  program: NOCProgram;
  placement_source: PlacementSource;
  drive_id?: string | null;
  company_name: string;
  company_address?: string | null;
  company_city?: string | null;
  company_state?: string | null;
  company_pincode?: string | null;
  company_pan?: string | null;
  company_gst?: string | null;
  supporting_document_url?: string | null;
  supporting_document_name?: string | null;
  contact_person_name?: string | null;
  contact_person_designation?: string | null;
  contact_person_phone?: string | null;
  contact_person_email?: string | null;
  reference_by?: string | null;
  reference_details?: string | null;
  role_title: string;
  technology_domain?: string | null;
  job_description?: string | null;
  stipend_amount?: number | null;
  start_date: string;
  end_date: string | null;
  duration_weeks?: number | null;
  offer_letter_url: string;
}

export interface NocSupportingDocumentUpload {
  supporting_document_url: string;
  supporting_document_name: string;
  document_mime_type: string;
  document_size: number;
}

export interface NocFieldSuggestions {
  companies: { id: string; name: string }[];
  cities: string[];
  designations: string[];
}

export interface NocOfferLetterUpload {
  offer_letter_url: string;
  document_name: string;
  document_mime_type: string;
  document_size: number;
}

export interface ApproveNocInput {
  remarks?: string | null;
}

export interface RejectNocInput {
  rejection_reason: string;
}
