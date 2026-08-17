import {
  EXIT_REASON_LABELS,
  type ApiNoDuesBase,
  type ApiNoDuesDetail,
  type ApiNoDuesListItem,
  type ApiNoDuesMyItem,
  type ApiNoDuesReviewer,
  type ApiNoDuesStudentSummary,
  type NoDuesRequest,
  type NoDuesStatus,
} from '@/types/noDues';

function toNullableNumber(value: number | string | null | undefined) {
  if (value == null || value === '') {
    return null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function getNoDuesErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

export function getNoDuesStatusVariant(status: NoDuesStatus) {
  if (status === 'pending_review') return 'warning' as const;
  if (status === 'under_review') return 'info' as const;
  if (status === 'approved') return 'info' as const;
  if (status === 'issued') return 'success' as const;
  if (status === 'rejected') return 'destructive' as const;
  if (status === 'returned') return 'outline' as const;
  return 'secondary' as const;
}

export function getNoDuesStatusClassName(status: NoDuesStatus) {
  if (status === 'returned') {
    return 'border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950 dark:text-orange-300';
  }

  return '';
}

export function normalizeNoDuesRequest(
  record: ApiNoDuesMyItem | ApiNoDuesListItem | ApiNoDuesDetail | (ApiNoDuesBase & Record<string, unknown>)
): NoDuesRequest {
  const student = ('student' in record ? record.student : undefined) as ApiNoDuesStudentSummary | undefined;
  const reviewedByUser = ('reviewed_by_user' in record ? record.reviewed_by_user : undefined) as ApiNoDuesReviewer | null | undefined;

  return {
    id: record.id,
    student_id: record.student_id,
    student_name: student?.full_name ?? '',
    roll_number: student?.roll_number ?? student?.enrollment_number ?? '',
    department: student?.department ?? '',
    course_name: student?.course ?? null,
    batch_year: student?.batch ?? null,
    email: student?.email ?? null,
    mobile: student?.mobile ?? null,
    exit_reason: record.exit_reason,
    company_name: record.company_name,
    designation: record.designation,
    package_lpa: toNullableNumber(record.package_lpa),
    joining_date: record.joining_date,
    business_name: record.business_name,
    business_nature: record.business_nature,
    business_address: record.business_address,
    institution_name: record.institution_name,
    program_name: record.program_name,
    country: record.country,
    sou_passing_year: record.sou_passing_year,
    company_sector: record.company_sector,
    company_address: record.company_address,
    language_test: record.language_test,
    university_address: record.university_address,
    examination_name: record.examination_name,
    additional_details: record.additional_details,
    proof_url: record.proof_url,
    declaration_accepted: record.declaration_accepted,
    status: record.status,
    admin_remarks: record.admin_remarks,
    ndc_number: record.ndc_number,
    reviewed_by: reviewedByUser?.name ?? record.reviewed_by,
    reviewed_at: record.reviewed_at,
    issued_at: record.issued_at,
    certificate_url: record.certificate_url,
    created_at: record.created_at,
    updated_at: record.updated_at,
  };
}

export function getNoDuesSummary(
  request: Pick<
    NoDuesRequest,
    'exit_reason' | 'company_name' | 'business_name' | 'institution_name' | 'program_name' | 'designation' | 'examination_name' | 'country'
  >
) {
  if (request.exit_reason === 'employment') {
    const company = request.company_name || 'Company pending';
    return request.designation ? `${company} • ${request.designation}` : company;
  }

  if (request.exit_reason === 'family_business') {
    return request.business_name || 'Family business';
  }

  if (request.exit_reason === 'competitive_exam') {
    return request.examination_name || EXIT_REASON_LABELS[request.exit_reason];
  }

  // planning_studies / higher_studies — program • university (with country when present).
  if (request.program_name && request.institution_name) {
    const base = `${request.program_name} • ${request.institution_name}`;
    return request.country ? `${base} (${request.country})` : base;
  }

  return request.institution_name || EXIT_REASON_LABELS[request.exit_reason];
}

export function hasBlockingNoDuesRequest(requests: Array<Pick<NoDuesRequest, 'status'>>) {
  return requests.some((request) => (
    request.status === 'pending_review'
    || request.status === 'under_review'
    || request.status === 'returned'
    || request.status === 'approved'
    || request.status === 'issued'
  ));
}

export function canCreateNoDuesRequest(requests: Array<Pick<NoDuesRequest, 'status'>>) {
  if (requests.length === 0) return true;
  return !hasBlockingNoDuesRequest(requests);
}
