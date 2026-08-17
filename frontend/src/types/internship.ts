// Module 8: Stipend & Internship Administration Types

export type InternshipType = 'paid' | 'unpaid' | 'stipend_based';

export type InternshipStatus = 'ongoing' | 'completed' | 'discontinued';

export type StipendFrequency = 'monthly' | 'lump_sum';

export type IssueStatus = 'open' | 'resolved';

export interface InternshipRecord {
  id: string;
  student_id: string;
  student_name: string;
  enrollment_number: string;
  department: string;
  batch: string;
  offer_id: string;
  company_id: string;
  company_name: string;
  role: string;
  internship_type: InternshipType;
  start_date: string;
  end_date: string;
  status: InternshipStatus;
  // Stipend — minimal tracking
  stipend_amount?: number; // monthly in ₹
  stipend_frequency?: StipendFrequency;
  receiving_stipend: boolean;
  stipend_remarks?: string;
  // Completion
  completion_certificate_uploaded: boolean;
  certificate_due_date?: string; // 25 days before end_date alert
  // Metadata
  created_at: string;
  created_by: string;
  updated_at: string;
}

export interface InternshipIssue {
  id: string;
  internship_id: string;
  description: string;
  status: IssueStatus;
  resolution_remarks?: string;
  logged_by: string;
  logged_at: string;
  resolved_at?: string;
}

export const INTERNSHIP_TYPE_CONFIG: Record<InternshipType, { label: string; color: string }> = {
  paid: { label: 'Paid', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  unpaid: { label: 'Unpaid', color: 'bg-muted text-muted-foreground border-border' },
  stipend_based: { label: 'Stipend-Based', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
};

export const INTERNSHIP_STATUS_CONFIG: Record<InternshipStatus, { label: string; color: string }> = {
  ongoing: { label: 'Ongoing', color: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
  completed: { label: 'Completed', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
  discontinued: { label: 'Discontinued', color: 'bg-red-500/10 text-red-600 border-red-500/20' },
};

export const ISSUE_STATUS_CONFIG: Record<IssueStatus, { label: string; color: string }> = {
  open: { label: 'Open', color: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
  resolved: { label: 'Resolved', color: 'bg-green-500/10 text-green-600 border-green-500/20' },
};

// Minimum stipend as per guidelines (₹/month)
export const MINIMUM_STIPEND_AMOUNT = 5000;

// ── API Response Types (match backend) ─────────────────

export interface ApiInternshipReporter {
  id: string;
  name: string;
}

export interface ApiInternshipIssue {
  id: string;
  title: string;
  description: string | null;
  status: IssueStatus;
  created_at: string;
  resolved_at: string | null;
  reported_by_user?: ApiInternshipReporter | null;
}

export interface ApiInternshipStudentSummary {
  id: string;
  full_name: string;
  enrollment_number: string;
  department: string;
  batch?: string;
  email?: string;
  mobile?: string | null;
}

export interface ApiInternshipBase {
  id: string;
  company_id: string | null;
  company_name: string;
  role: string;
  department: string | null;
  posting_type: 'job' | 'internship' | 'stipend_internship' | null;
  internship_type: InternshipType;
  status: InternshipStatus;
  start_date: string;
  end_date: string | null;
  stipend_amount: number | null;
  stipend_frequency: string | null;
  is_receiving_stipend: boolean;
  certificate_uploaded: boolean;
  certificate_url: string | null;
  offer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiMyInternship extends ApiInternshipBase {
  issues: ApiInternshipIssue[];
}

export interface ApiInternshipListItem extends ApiInternshipBase {
  student: ApiInternshipStudentSummary;
  issue_count: number;
  open_issue_count: number;
}

export interface ApiInternshipDetail extends ApiInternshipBase {
  student: ApiInternshipStudentSummary;
  issues: ApiInternshipIssue[];
}

export interface PaginatedInternships {
  data: ApiInternshipListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ── Query Parameters ───────────────────────────────────

export interface InternshipQueryParams {
  status?: InternshipStatus;
  student_id?: string;
  search?: string;
  department?: string;
  batch?: string;
  posting_type?: 'job' | 'internship' | 'stipend_internship';
  internship_type?: InternshipType;
  company_id?: string;
  has_open_issues?: boolean;
  certificate_pending?: boolean;
  is_receiving_stipend?: boolean;
  page?: number;
  limit?: number;
  sort_by?: 'student' | 'company' | 'status' | 'start_date' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

// ── Input Types ────────────────────────────────────────

export interface CreateInternshipInput {
  company_name: string;
  role: string;
  internship_type: InternshipType;
  start_date: string;
  certificate_url: string;
  company_id?: string | null;
  department?: string | null;
  end_date?: string | null;
  stipend_amount?: number | null;
  stipend_frequency?: string | null;
  is_receiving_stipend?: boolean;
  offer_id?: string | null;
}

export interface InternshipDocumentUpload {
  certificate_url: string;
  document_name: string;
  document_mime_type: string;
  document_size: number;
}

export interface UpdateInternshipInput extends Partial<CreateInternshipInput> {
  status?: InternshipStatus;
  certificate_url?: string | null;
  certificate_uploaded?: boolean;
}

export interface CreateIssueInput {
  title: string;
  description?: string | null;
}
