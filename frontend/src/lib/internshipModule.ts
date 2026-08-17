import { differenceInDays } from 'date-fns';
import { toDateInputValue } from '@/lib/studentModule';
import type {
  ApiInternshipDetail,
  ApiInternshipListItem,
  ApiMyInternship,
  CreateInternshipInput,
  InternshipRecord,
  InternshipType,
  StipendFrequency,
} from '@/types/internship';

export interface InternshipFormValues {
  company_name: string;
  role: string;
  internship_type: InternshipType;
  start_date: string;
  end_date: string;
  stipend_amount: string;
  stipend_frequency: StipendFrequency | '';
  is_receiving_stipend: boolean;
  certificate_url: string;
  offer_id: string;
}

type InternshipLike = InternshipRecord | ApiMyInternship | ApiInternshipListItem | ApiInternshipDetail;

function hasStudentObject(internship: InternshipLike): internship is ApiInternshipListItem | ApiInternshipDetail {
  return 'student' in internship;
}

function hasIssues(internship: InternshipLike): internship is ApiMyInternship | ApiInternshipDetail {
  return 'issues' in internship;
}

export function createEmptyInternshipFormValues(): InternshipFormValues {
  return {
    company_name: '',
    role: '',
    internship_type: 'paid',
    start_date: toDateInputValue(new Date().toISOString()),
    end_date: '',
    stipend_amount: '',
    stipend_frequency: 'monthly',
    is_receiving_stipend: true,
    certificate_url: '',
    offer_id: '',
  };
}

export function buildCreateInternshipPayload(values: InternshipFormValues): CreateInternshipInput {
  const stipendAmount = values.stipend_amount.trim();
  const includesStipend = values.internship_type !== 'unpaid';

  return {
    company_name: values.company_name.trim(),
    role: values.role.trim(),
    internship_type: values.internship_type,
    start_date: values.start_date,
    end_date: values.end_date || null,
    stipend_amount: includesStipend && stipendAmount ? Number(stipendAmount) : null,
    stipend_frequency: includesStipend && values.stipend_frequency ? values.stipend_frequency : null,
    is_receiving_stipend: includesStipend ? values.is_receiving_stipend : false,
    certificate_url: values.certificate_url,
    offer_id: values.offer_id || null,
  };
}

export function getInternshipStudentName(internship: InternshipLike) {
  if (hasStudentObject(internship)) return internship.student.full_name;
  return internship.student_name;
}

export function getInternshipEnrollmentNumber(internship: InternshipLike) {
  if (hasStudentObject(internship)) return internship.student.enrollment_number;
  return internship.enrollment_number;
}

export function getInternshipDepartment(internship: InternshipLike) {
  if (hasStudentObject(internship)) return internship.student.department;
  return internship.department;
}

export function getInternshipBatch(internship: InternshipLike) {
  if (hasStudentObject(internship)) return internship.student.batch ?? '—';
  return internship.batch;
}

export function getInternshipIssueCount(internship: InternshipLike) {
  if (hasIssues(internship)) return internship.issues.length;
  if ('issue_count' in internship) return internship.issue_count;
  return 0;
}

export function getInternshipOpenIssueCount(internship: InternshipLike) {
  if (hasIssues(internship)) {
    return internship.issues.filter((issue) => issue.status === 'open').length;
  }
  if ('open_issue_count' in internship) return internship.open_issue_count;
  return 0;
}

export function isInternshipCertificateUploaded(internship: InternshipLike) {
  if ('certificate_uploaded' in internship) return internship.certificate_uploaded;
  return internship.completion_certificate_uploaded;
}

export function getInternshipDaysRemaining(internship: Pick<InternshipLike, 'status' | 'end_date'>) {
  if (!internship.end_date || internship.status !== 'ongoing') return null;
  return differenceInDays(new Date(internship.end_date), new Date());
}

export function isInternshipCertificatePending(internship: InternshipLike) {
  return internship.status !== 'discontinued' && !isInternshipCertificateUploaded(internship);
}

export function getInternshipSearchFields(internship: InternshipLike) {
  return [
    getInternshipStudentName(internship),
    getInternshipEnrollmentNumber(internship),
    getInternshipDepartment(internship),
    getInternshipBatch(internship),
    internship.company_name,
    internship.role,
    internship.internship_type,
    internship.status,
  ];
}
