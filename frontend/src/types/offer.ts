// Module 7: Offer, Joining & Compliance Types

export type OfferStatus =
  | 'pending_student_action'
  | 'accepted'
  | 'rejected_by_admin'
  | 'rejected_by_student';

export type OfferLifecycleState = OfferStatus | 'joined' | 'did_not_join';

export type JoiningStatus = 'pending' | 'joined' | 'did_not_join';

export type ComplianceStatus = 'compliant' | 'blocked' | 'override_enabled';

export interface Offer {
  id: string;
  student_id: string;
  student_name: string;
  enrollment_number: string;
  department: string;
  batch: string;
  company_id: string;
  company_name: string;
  posting_id: string;
  posting_title: string;
  role: string;
  type: 'job' | 'internship';
  ctc?: string;
  stipend?: string;
  location: string;
  offer_date: string;
  status: OfferStatus;
  accepted_at?: string;
  rejected_at?: string;
  rejection_reason?: 'simultaneous_results' | 'genuine_reason_approved';
  rejection_remarks?: string;
  rejected_by?: string;
  joining_status: JoiningStatus;
  joining_date?: string;
  joining_verified_by?: string;
  joining_verified_at?: string;
  dnj_reason?: string;
  is_locked: boolean;
  compliance_status: ComplianceStatus;
  applications_blocked: boolean;
  admin_override_enabled: boolean;
  admin_override_by?: string;
  admin_override_at?: string;
  created_at: string;
  created_by: string;
  updated_at: string;
}

export interface OfferAuditEntry {
  id: string;
  offer_id: string;
  action: string;
  from_status?: OfferLifecycleState;
  to_status?: OfferLifecycleState;
  performed_by: string;
  performed_at: string;
  remarks?: string;
}

export const OFFER_STATUS_CONFIG: Record<OfferLifecycleState, {
  label: string;
  color: string;
  description: string;
}> = {
  pending_student_action: {
    label: 'Pending Acceptance',
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    description: 'Awaiting student acceptance',
  },
  accepted: {
    label: 'Accepted',
    color: 'bg-green-500/10 text-green-600 border-green-500/20',
    description: 'Offer accepted by the student',
  },
  rejected_by_admin: {
    label: 'Rejected (Admin)',
    color: 'bg-red-500/10 text-red-600 border-red-500/20',
    description: 'Rejected by TPO Admin',
  },
  rejected_by_student: {
    label: 'Rejected (Student)',
    color: 'bg-red-500/10 text-red-600 border-red-500/20',
    description: 'Student declined the offer',
  },
  joined: {
    label: 'Joined',
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    description: 'Student has joined',
  },
  did_not_join: {
    label: 'Did Not Join',
    color: 'bg-red-500/10 text-red-600 border-red-500/20',
    description: 'Student did not join',
  },
};

export const JOINING_STATUS_CONFIG: Record<JoiningStatus, {
  label: string;
  color: string;
}> = {
  pending: {
    label: 'Pending',
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  },
  joined: {
    label: 'Joined',
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  },
  did_not_join: {
    label: 'Did Not Join (DNJ)',
    color: 'bg-red-500/10 text-red-600 border-red-500/20',
  },
};

export const COMPLIANCE_STATUS_CONFIG: Record<ComplianceStatus, {
  label: string;
  color: string;
  description: string;
}> = {
  compliant: {
    label: 'Compliant',
    color: 'bg-green-500/10 text-green-600 border-green-500/20',
    description: 'Student is in good standing for further opportunities.',
  },
  blocked: {
    label: 'Blocked',
    color: 'bg-red-500/10 text-red-600 border-red-500/20',
    description: 'Applications are blocked due to placement policy.',
  },
  override_enabled: {
    label: 'Override Enabled',
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    description: 'An admin override is active for this student.',
  },
};

export const REJECTION_REASONS: Record<string, string> = {
  simultaneous_results: 'Simultaneous results from two companies',
  genuine_reason_approved: 'Genuine reason with TPO approval',
};

// ── API Response Types (match backend) ─────────────────

export interface ApiMyOffer {
  id: string;
  type: 'job' | 'internship';
  role: string;
  ctc: string | null;
  stipend: string | null;
  location: string | null;
  status: OfferStatus;
  offer_date: string;
  accepted_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  rejection_remarks: string | null;
  rejected_by: string | null;
  joining_status: JoiningStatus;
  joining_date: string | null;
  dnj_reason: string | null;
  is_locked: boolean;
  compliance_status: ComplianceStatus;
  applications_blocked: boolean;
  admin_override_enabled: boolean;
  company: { name: string };
  posting: { title: string; type: 'job' | 'internship' | 'stipend_internship' };
}

export interface ApiOfferListItem {
  id: string;
  type: 'job' | 'internship';
  role: string;
  ctc: string | null;
  stipend: string | null;
  location: string | null;
  status: OfferStatus;
  offer_date: string;
  accepted_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  rejection_remarks: string | null;
  rejected_by: string | null;
  joining_status: JoiningStatus;
  joining_date: string | null;
  dnj_reason: string | null;
  is_locked: boolean;
  compliance_status: ComplianceStatus;
  applications_blocked: boolean;
  admin_override_enabled: boolean;
  student: { id: string; full_name: string; enrollment_number: string; department: string; batch: string; institute?: string | null; course?: string | null; current_semester?: string | null };
  company: { id: string; name: string };
  posting: { id: string; title: string; type: 'job' | 'internship' | 'stipend_internship' };
}

export interface ApiOfferAuditEntry {
  id: string;
  action: string;
  performed_by: string;
  details: string | null;
  performed_at: string;
}

export interface ApiOfferDetail {
  id: string;
  type: 'job' | 'internship';
  role: string;
  ctc: string | null;
  stipend: string | null;
  location: string | null;
  status: OfferStatus;
  offer_date: string;
  is_locked: boolean;
  accepted_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  rejection_remarks: string | null;
  rejected_by: string | null;
  joining_status: JoiningStatus;
  joining_date: string | null;
  dnj_reason: string | null;
  compliance_status: ComplianceStatus;
  applications_blocked: boolean;
  admin_override_enabled: boolean;
  student: { id: string; full_name: string; enrollment_number: string; department: string; batch: string };
  company: { id: string; name: string };
  posting: { id: string; title: string; type: 'job' | 'internship' | 'stipend_internship' };
  audit_trail: ApiOfferAuditEntry[];
}

export interface PaginatedOffers {
  data: ApiOfferListItem[];
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

export interface OfferQueryParams {
  status?: OfferStatus;
  type?: 'job' | 'internship';
  posting_type?: 'job' | 'internship' | 'stipend_internship';
  posting_type_master_id?: string;
  company_id?: string;
  student_id?: string;
  search?: string;
  page?: number;
  limit?: number;
  // Whitelisted sortable columns (mirrors getOfferOrderBy on the backend).
  sort_by?: 'student' | 'company' | 'role' | 'status' | 'joining' | 'offer_date' | 'created_at';
  sort_order?: 'asc' | 'desc';
  // FILTER COUNTER EXPORT — student-scope + date-range filters
  institute?: string;
  course?: string;
  branch?: string;
  semester?: string;
  academic_year?: string;
  date_from?: string;
  date_to?: string;
}

// ── Input Types ────────────────────────────────────────

export interface CreateOfferInput {
  student_id: string;
  posting_id: string;
  company_id: string;
  type: 'job' | 'internship';
  role: string;
  ctc?: string | null;
  stipend?: string | null;
  location?: string | null;
  offer_date: string;
}

export interface RejectOfferInput {
  rejection_reason: string;
  rejection_remarks?: string | null;
}

export interface JoiningStatusInput {
  joining_status: 'joined' | 'did_not_join';
  joining_date?: string | null;
  dnj_reason?: string | null;
}

export interface ComplianceInput {
  compliance_status: 'compliant' | 'blocked' | 'override_enabled';
  applications_blocked?: boolean;
}
