import { prisma } from '../../config/database';
import { NotFoundError, BusinessRuleError, ValidationError } from '../../shared/errors';
import { paginate, buildPrismaQuery } from '../../shared/utils/pagination';
import { normalizeSpreadsheetHeader, parseSpreadsheetRows } from '../../shared/utils/spreadsheet';
import type { CreateNoDuesInput, ReviewNoDuesInput, QueryNoDuesInput, UpdateNoDuesInput } from './no-dues.schema';
import { ExitReason, NdcStatus, Prisma } from '@prisma/client';
import { createNotification, notifyTpoAudience } from '../notifications/notification.service';
import { assertNoApprovedNoDues } from '../../shared/utils/no-dues-block';
import { buildStudentScopeRelation, buildDateRangeCondition } from '../../shared/utils/student-scope-filter';

const studentSelection = {
  id: true,
  full_name: true,
  enrollment_number: true,
  roll_number: true,
  department: true,
  batch: true,
  course: true,
  email: true,
  mobile: true,
};

const enrollmentHeaderAliases = new Set([
  'enrollmentnumber',
  'enrollmentno',
  'enrolmentnumber',
  'enrolmentno',
  'temporaryenrolmentno',
  'temporaryenrollmentno',
]);

export interface EligibilityUpdateResult {
  parsed_count: number;
  matched_count: number;
  enabled_count: number;
  unmatched_enrollment_numbers: string[];
}

function buildNoDuesFormData(data: CreateNoDuesInput | UpdateNoDuesInput) {
  return {
    exit_reason: data.exit_reason as ExitReason,
    company_name: data.company_name,
    designation: data.designation,
    package_lpa: data.package_lpa,
    joining_date: data.joining_date,
    business_name: data.business_name,
    business_nature: data.business_nature,
    business_address: data.business_address,
    institution_name: data.institution_name,
    program_name: data.program_name,
    country: data.country,
    sou_passing_year: data.sou_passing_year,
    company_sector: data.company_sector,
    company_address: data.company_address,
    language_test: data.language_test,
    university_address: data.university_address,
    examination_name: data.examination_name,
    additional_details: data.additional_details,
    proof_url: data.proof_url,
    declaration_accepted: data.declaration_accepted,
  };
}

function extractEnrollmentNumbers(rows: string[][]) {
  if (rows.length === 0) {
    throw new ValidationError('The uploaded file does not contain any rows');
  }

  const headers = rows[0].map(normalizeSpreadsheetHeader);
  const headerIndex = headers.findIndex((header) => enrollmentHeaderAliases.has(header));
  const enrollmentIndex = headerIndex >= 0 ? headerIndex : 0;
  const dataRows = headerIndex >= 0 ? rows.slice(1) : rows;
  const values = new Set<string>();

  for (const row of dataRows) {
    const value = String(row[enrollmentIndex] ?? '').trim();
    if (!value || enrollmentHeaderAliases.has(normalizeSpreadsheetHeader(value))) continue;
    values.add(value);
  }

  return Array.from(values);
}

function normalizeEnrollmentNumbers(enrollmentNumbers: string[]) {
  return Array.from(
    new Set(
      enrollmentNumbers
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );
}

async function updateNoDuesEligibility(
  tenantId: string,
  actor: Express.AuthUser,
  enrollmentNumbers: string[],
  action: 'import_no_dues_eligibility' | 'enable_no_dues_eligibility',
  sourceLabel: string,
): Promise<EligibilityUpdateResult> {
  const normalizedEnrollmentNumbers = normalizeEnrollmentNumbers(enrollmentNumbers);

  if (normalizedEnrollmentNumbers.length === 0) {
    throw new ValidationError('No enrollment numbers were provided');
  }

  const students = await prisma.student.findMany({
    where: {
      tenant_id: tenantId,
      enrollment_number: { in: normalizedEnrollmentNumbers },
    },
    select: {
      id: true,
      enrollment_number: true,
    },
  });

  const matchedEnrollmentNumbers = new Set(students.map((student) => student.enrollment_number));
  const unmatched_enrollment_numbers = normalizedEnrollmentNumbers.filter((enrollment) => !matchedEnrollmentNumbers.has(enrollment));
  const studentIds = students.map((student) => student.id);

  if (studentIds.length > 0) {
    await prisma.student.updateMany({
      where: { id: { in: studentIds }, tenant_id: tenantId },
      data: { no_dues_enabled: true },
    });
  }

  await prisma.auditLog.create({
    data: {
      tenant_id: tenantId,
      user_id: actor.id,
      user_name: actor.name,
      action,
      module: 'no_dues',
      details: `Enabled No Dues for ${studentIds.length} student(s)${sourceLabel ? ` from ${sourceLabel}` : ''}`,
    },
  });

  return {
    parsed_count: normalizedEnrollmentNumbers.length,
    matched_count: students.length,
    enabled_count: studentIds.length,
    unmatched_enrollment_numbers,
  };
}

export async function getMyNoDues(userId: string) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');
  return prisma.noDuesRequest.findMany({
    where: { student_id: student.id },
    orderBy: { created_at: 'desc' },
  });
}

export async function getMyNoDuesEligibility(userId: string) {
  const student = await prisma.student.findUnique({
    where: { user_id: userId },
    select: {
      id: true,
      no_dues_enabled: true,
      enrollment_number: true,
    },
  });
  if (!student) throw new NotFoundError('Student profile');
  return {
    enabled: student.no_dues_enabled,
    enrollment_number: student.enrollment_number,
  };
}

// Whitelist of sortable columns → Prisma orderBy. Never inject sort_by raw into Prisma.
function getNoDuesOrderBy(sortBy?: string, sortOrder: 'asc' | 'desc' = 'asc'): Prisma.NoDuesRequestOrderByWithRelationInput {
  switch (sortBy) {
    case 'student': return { student: { full_name: sortOrder } };
    case 'status': return { status: sortOrder };
    case 'created_at': return { created_at: sortOrder };
    default: return { created_at: sortOrder };
  }
}

export async function getNoDuesRequests(tenantId: string, filters: QueryNoDuesInput) {
  const { page, limit, status, sort_by, sort_order, institute, course, branch, passing_year, date_from, date_to } = filters;
  const where: Record<string, unknown> = { tenant_id: tenantId };
  if (status) where.status = status;
  const scope = buildStudentScopeRelation({ institute, course, branch, passing_year });
  if (scope) where.student = scope.student;
  const dateRange = buildDateRangeCondition(date_from, date_to);
  if (dateRange) where.created_at = dateRange;

  const [requests, total] = await Promise.all([
    prisma.noDuesRequest.findMany({
      where, ...buildPrismaQuery(page, limit),
      orderBy: getNoDuesOrderBy(sort_by, sort_order),
      include: { student: { select: studentSelection } },
    }),
    prisma.noDuesRequest.count({ where }),
  ]);
  return { data: requests, pagination: paginate(page, limit, total) };
}

export async function getNoDuesById(id: string, tenantId: string) {
  const request = await prisma.noDuesRequest.findUnique({
    where: { id },
    include: {
      student: { select: studentSelection },
      reviewed_by_user: { select: { id: true, name: true } },
    },
  });
  if (!request) throw new NotFoundError('No Dues Request');
  if (request.tenant_id !== tenantId) throw new NotFoundError('No Dues Request');
  return request;
}

export async function createNoDues(userId: string, tenantId: string, data: CreateNoDuesInput) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');
  if (!student.no_dues_enabled) {
    throw new BusinessRuleError('No Dues is not enabled for this enrollment number', 'NO_DUES_NOT_ENABLED');
  }
  await assertNoApprovedNoDues(student.id, tenantId);

  const created = await prisma.noDuesRequest.create({
    data: {
      tenant_id: tenantId,
      student_id: student.id,
      ...buildNoDuesFormData(data),
    },
  });

  void notifyTpoAudience({
    tenantId,
    type: 'no_dues',
    title: `${student.full_name} submitted a No Dues request`,
    description: `Enrollment: ${student.enrollment_number}`,
    priority: 'medium',
    actionUrl: '/admin/no-dues',
    payload: { request_id: created.id, student_id: student.id },
  });

  return created;
}

export async function resubmitNoDues(id: string, userId: string, tenantId: string, data: UpdateNoDuesInput) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');
  if (!student.no_dues_enabled) {
    throw new BusinessRuleError('No Dues is not enabled for this enrollment number', 'NO_DUES_NOT_ENABLED');
  }

  const existing = await prisma.noDuesRequest.findFirst({
    where: { id, tenant_id: tenantId, student_id: student.id },
  });
  if (!existing) throw new NotFoundError('No Dues Request');
  await assertNoApprovedNoDues(student.id, tenantId);
  if (existing.status !== 'returned') {
    throw new BusinessRuleError('Only returned requests can be resubmitted', 'NDC_NOT_RETURNED');
  }

  return prisma.noDuesRequest.update({
    where: { id },
    data: {
      ...buildNoDuesFormData(data),
      status: 'pending_review' as NdcStatus,
      admin_remarks: null,
      reviewed_by: null,
      reviewed_at: null,
    },
  });
}

export async function updateNoDues(id: string, tenantId: string, data: UpdateNoDuesInput, userId: string) {
  const existing = await prisma.noDuesRequest.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('No Dues Request');
  if (existing.tenant_id !== tenantId) throw new NotFoundError('No Dues Request');
  if (existing.status === 'issued') {
    throw new BusinessRuleError('Issued No Dues requests cannot be edited', 'NDC_ALREADY_ISSUED');
  }
  await assertNoApprovedNoDues(existing.student_id, tenantId);

  const shouldResubmit = existing.status === 'returned';

  return prisma.noDuesRequest.update({
    where: { id },
    data: {
      ...buildNoDuesFormData(data),
      ...(shouldResubmit
        ? {
          status: 'pending_review' as NdcStatus,
          admin_remarks: null,
          reviewed_by: null,
          reviewed_at: null,
        }
        : {
          reviewed_by: userId,
          reviewed_at: new Date(),
        }),
    },
    include: {
      student: { select: studentSelection },
      reviewed_by_user: { select: { id: true, name: true } },
    },
  });
}

export async function reviewNoDues(id: string, tenantId: string, data: ReviewNoDuesInput, userId: string) {
  const existing = await prisma.noDuesRequest.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('No Dues Request');
  if (existing.tenant_id !== tenantId) throw new NotFoundError('No Dues Request');
  await assertNoApprovedNoDues(existing.student_id, tenantId);

  const updated = await prisma.noDuesRequest.update({
    where: { id },
    data: {
      status: data.status as NdcStatus,
      admin_remarks: data.admin_remarks,
      reviewed_by: userId,
      reviewed_at: new Date(),
    },
    include: {
      student: { select: studentSelection },
      reviewed_by_user: { select: { id: true, name: true } },
    },
  });

  try {
    const studentRow = await prisma.student.findUnique({
      where: { id: existing.student_id },
      select: { user_id: true },
    });
    if (studentRow?.user_id) {
      void createNotification({
        userId: studentRow.user_id,
        tenantId,
        type: 'no_dues',
        title: `Your No Dues request was ${data.status.replace('_', ' ')}`,
        description: data.admin_remarks ?? undefined,
        priority: 'medium',
        actionUrl: '/no-dues',
        payload: { request_id: id, status: data.status },
      });
    }
  } catch (err) {
    // swallow
  }

  return updated;
}

export async function importNoDuesEligibility(
  tenantId: string,
  actor: Express.AuthUser,
  file: Express.Multer.File | undefined
) {
  if (!file) {
    throw new ValidationError('Upload a CSV or XLSX file');
  }

  const rows = await parseSpreadsheetRows(file.path, file.originalname);
  const enrollmentNumbers = extractEnrollmentNumbers(rows);
  const result = await updateNoDuesEligibility(
    tenantId,
    actor,
    enrollmentNumbers,
    'import_no_dues_eligibility',
    file.originalname,
  );

  return {
    file_name: file.originalname,
    ...result,
  };
}

export async function enableNoDuesEligibility(
  tenantId: string,
  actor: Express.AuthUser,
  enrollmentNumber: string,
) {
  const result = await updateNoDuesEligibility(
    tenantId,
    actor,
    [enrollmentNumber],
    'enable_no_dues_eligibility',
    `enrollment number ${enrollmentNumber.trim()}`,
  );

  return {
    enrollment_number: enrollmentNumber.trim(),
    ...result,
  };
}

export async function issueNoDues(id: string, tenantId: string, userId: string) {
  const existing = await prisma.noDuesRequest.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('No Dues Request');
  if (existing.tenant_id !== tenantId) throw new NotFoundError('No Dues Request');

  if (existing.status !== 'approved') {
    throw new BusinessRuleError('Only approved requests can be issued', 'NDC_NOT_APPROVED');
  }

  const count = await prisma.noDuesRequest.count({
    where: {
      tenant_id: tenantId,
      ndc_number: { not: null },
    },
  });
  const ndcNumber = `NDC-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}`;

  const issued = await prisma.noDuesRequest.update({
    where: { id },
    data: {
      status: 'issued' as NdcStatus,
      ndc_number: ndcNumber,
      issued_at: new Date(),
    },
    include: {
      student: { select: studentSelection },
      reviewed_by_user: { select: { id: true, name: true } },
    },
  });

  try {
    const studentRow = await prisma.student.findUnique({
      where: { id: existing.student_id },
      select: { user_id: true },
    });
    if (studentRow?.user_id) {
      void createNotification({
        userId: studentRow.user_id,
        tenantId,
        type: 'no_dues',
        title: 'Your No Dues Certificate has been issued',
        description: `Reference: ${ndcNumber}`,
        priority: 'high',
        actionUrl: '/no-dues',
        payload: { request_id: id, ndc_number: ndcNumber },
      });
    }
  } catch (err) {
    // swallow
  }

  return issued;
}
