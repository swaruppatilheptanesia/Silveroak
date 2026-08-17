import { NOC_PROGRAM_LABELS } from '@/types/noc';
import type {
  ApiNocDetail,
  ApiNocListItem,
  ApiNocMyItem,
  CompletionCertStatus,
  NOCRequest,
  NOCStatus,
} from '@/types/noc';

export type NocUiRecord = NOCRequest | ApiNocMyItem | ApiNocDetail | ApiNocListItem;

// Soft format validators for the optional PAN / GST fields on the NOC create form.
// Both fields are optional — only validate when the user actually typed something.
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GST_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

export function isValidPan(value: string): boolean {
  return PAN_REGEX.test(value.trim().toUpperCase());
}

export function isValidGst(value: string): boolean {
  return GST_REGEX.test(value.trim().toUpperCase());
}

// Same contract as PAN/GST above — the Phone and Pincode fields are optional, so callers must only
// validate once the user has actually typed something.
const INDIAN_MOBILE_REGEX = /^[6-9]\d{9}$/;
const INDIAN_PINCODE_REGEX = /^[1-9]\d{5}$/; // 6 digits, never a leading zero

/**
 * "+91 98765-43210" / "098765 43210" / "9876543210" → "9876543210".
 * Strips every separator, then drops a country (91) or trunk (0) prefix. Used for validation AND at
 * submit time, so what gets stored is the bare 10 digits however the student typed it.
 */
export function normalizeIndianMobile(value: string): string {
  const digits = value.replace(/\D/g, '');

  if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) return digits.slice(1);

  return digits;
}

export function isValidIndianMobile(value: string): boolean {
  return INDIAN_MOBILE_REGEX.test(normalizeIndianMobile(value));
}

export function isValidIndianPincode(value: string): boolean {
  return INDIAN_PINCODE_REGEX.test(value.trim());
}

// Where the NOC currently sits / with whom — phrased as owner/location so it complements
// (rather than duplicates) the Status badge's state wording. Lets the TPO admin see a
// faculty-stage NOC as "with the Faculty Coordinator" instead of it feeling invisible.
export function getNocStageLabel(status: NOCStatus): string {
  switch (status) {
    case 'pending_faculty':
      return 'Faculty Coordinator';
    case 'pending_tpo':
    case 'pending_company_verification':
      return 'TPO Cell';
    case 'approved':
      return 'TPO Cell — ready to issue';
    case 'issued':
      return 'Completed';
    case 'rejected':
      return 'Closed';
    case 'draft':
      return 'Draft';
    default:
      return '—';
  }
}

function hasStudent(record: NocUiRecord): record is ApiNocDetail | ApiNocListItem {
  return 'student' in record && Boolean(record.student);
}

function hasLegacyStudentFields(record: NocUiRecord): record is NOCRequest {
  return 'student_name' in record;
}

function formatProgramFallback(value: string) {
  const normalized = value.trim().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
  if (!normalized) {
    return '—';
  }

  return normalized
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function getNocStudentName(record: NocUiRecord) {
  if (hasStudent(record)) return record.student.full_name;
  if (hasLegacyStudentFields(record)) return record.student_name;
  return 'Student';
}

export function getNocEnrollmentNumber(record: NocUiRecord) {
  if (hasStudent(record)) return record.student.enrollment_number;
  if (hasLegacyStudentFields(record)) return record.enrollment_number;
  return '—';
}

export function getNocDepartment(record: NocUiRecord) {
  if (hasStudent(record)) return record.student.department;
  if (hasLegacyStudentFields(record)) return record.department;
  return '—';
}

export function getNocBatch(record: NocUiRecord) {
  if (hasStudent(record)) return record.student.batch ?? '—';
  if (hasLegacyStudentFields(record)) return record.batch;
  return '—';
}

export function getNocEmail(record: NocUiRecord) {
  if (hasStudent(record)) return record.student.email ?? '—';
  if (hasLegacyStudentFields(record)) return record.email;
  return '—';
}

export function getNocMobile(record: NocUiRecord) {
  if (hasStudent(record)) return record.student.mobile ?? record.student.alternate_phone ?? '—';
  if (hasLegacyStudentFields(record)) return record.mobile;
  return '—';
}

export function getNocReferenceBy(record: NocUiRecord) {
  if ('reference_by' in record) return record.reference_by;
  if ('company_reference_by' in record) return record.company_reference_by;
  return null;
}

export function getNocReferenceDetails(record: NocUiRecord) {
  if ('reference_details' in record) return record.reference_details;
  if ('company_reference_details' in record) return record.company_reference_details;
  return null;
}

export function getNocFacultyApproverName(record: NocUiRecord) {
  if ('faculty_approved_by_user' in record && record.faculty_approved_by_user?.name) {
    return record.faculty_approved_by_user.name;
  }
  if ('faculty_approver_name' in record) return record.faculty_approver_name;
  return null;
}

export function getNocTpoApproverName(record: NocUiRecord) {
  if ('tpo_approved_by_user' in record && record.tpo_approved_by_user?.name) {
    return record.tpo_approved_by_user.name;
  }
  if ('tpo_approver_name' in record) return record.tpo_approver_name;
  return null;
}

export function getNocProgramLabel(program: string) {
  return NOC_PROGRAM_LABELS[program] ?? formatProgramFallback(program);
}

export function getNocStipendAmount(record: NocUiRecord) {
  const raw = record.stipend_amount;
  if (raw === null || raw === undefined || raw === '') return null;

  const parsed = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getNocCompanyLocation(record: NocUiRecord) {
  return [record.company_city, record.company_state].filter(Boolean).join(', ') || 'Location not provided';
}

export function getNocSearchFields(record: NocUiRecord) {
  return [
    record.company_name,
    record.role_title,
    getNocProgramLabel(record.program),
    record.noc_type,
    record.status,
    getNocStudentName(record),
    getNocEnrollmentNumber(record),
    getNocDepartment(record),
    record.noc_number ?? '',
  ];
}

export function isActiveNocStatus(status: NOCStatus) {
  return ['pending_faculty', 'pending_tpo', 'pending_company_verification', 'approved'].includes(status);
}

export function isCompletedNocStatus(status: NOCStatus) {
  return ['issued', 'rejected'].includes(status);
}

// ── Internship completion certificate ────────────────────────────────────────

export const COMPLETION_STATUS_CONFIG: Record<
  CompletionCertStatus,
  { label: string; color: string }
> = {
  pending: {
    label: 'Pending Review',
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  },
  approved: {
    label: 'Approved',
    color: 'bg-green-500/10 text-green-600 border-green-500/20',
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-500/10 text-red-600 border-red-500/20',
  },
};

export function getCompletionStatusLabel(status: CompletionCertStatus | null | undefined) {
  return status ? COMPLETION_STATUS_CONFIG[status].label : 'Not Submitted';
}

/**
 * True when an issued NOC's internship duration has ended and the student has not yet
 * submitted a completion certificate — i.e. an upload is due. `end_date` null (ongoing)
 * is not yet due.
 */
export function isCompletionDue(record: {
  status: NOCStatus;
  end_date: string | null;
  completion_status: CompletionCertStatus | null;
}): boolean {
  if (record.status !== 'issued') return false;
  if (record.completion_status) return false;
  if (!record.end_date) return false;
  const end = new Date(record.end_date);
  return !Number.isNaN(end.getTime()) && end.getTime() <= Date.now();
}
