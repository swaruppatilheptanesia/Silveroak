import { prisma } from '../../config/database';
import { NotFoundError, BusinessRuleError } from '../../shared/errors';
import { paginate, buildPrismaQuery } from '../../shared/utils/pagination';
import { logger } from '../../config/logger';
import { matchesStudentTargeting, type StudentTargetContext } from '../../shared/utils/student-targeting';
import { assertNoExistingOffer } from '../../shared/utils/offer-block';
import { assertPlacementInterest } from '../../shared/utils/placement-interest';
import { assertNoSelfPlacedNoc } from '../../shared/utils/self-placed-noc-block';
import { assertPostingTypePolicyAccepted } from '../../shared/utils/posting-type-policy';
import { assertInterestRegistered } from '../../shared/utils/posting-type-interest';
import { assertPostingTypeAcceptingApplications } from '../../shared/utils/posting-type-accepting';
import { buildStudentScopeConditions, buildDateRangeCondition } from '../../shared/utils/student-scope-filter';
import { createNotification, notifyTpoAudience } from '../notifications/notification.service';
import type {
  ApplyInput,
  MoveStageInput,
  BulkMoveStageInput,
  MockRoundResultInput,
  QueryApplicationsInput,
} from './application.schema';
import { ApplicationStage, MockRoundResult, Prisma } from '@prisma/client';

function normalizeComparable(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function matchesAllowedDepartment(studentDepartment: string, allowedBranches: string[]): boolean {
  const normalizedStudentDepartment = normalizeComparable(studentDepartment);

  return allowedBranches.some((branch) => {
    const normalizedBranch = normalizeComparable(branch);
    return normalizedStudentDepartment === normalizedBranch
      || normalizedStudentDepartment.includes(normalizedBranch)
      || normalizedBranch.includes(normalizedStudentDepartment);
  });
}

function extractBatchTokens(batch: string): string[] {
  const trimmed = batch.trim();
  const tokens = new Set<string>([trimmed, normalizeComparable(trimmed)]);
  const lastSegment = trimmed.split(/[-/]/).map((part) => part.trim()).filter(Boolean).at(-1);

  if (lastSegment) {
    tokens.add(lastSegment);
    tokens.add(normalizeComparable(lastSegment));
  }

  return Array.from(tokens);
}

function matchesAllowedBatch(studentBatch: string, allowedBatches: string[]): boolean {
  const studentTokens = new Set(extractBatchTokens(studentBatch));

  return allowedBatches.some((batch) => {
    const allowedTokens = extractBatchTokens(batch);
    return allowedTokens.some((token) => studentTokens.has(token));
  });
}

function getStudentTargetContext(student: {
  institute: string | null;
  course: string | null;
  department: string;
  academicProfile: { semester: number | null } | null;
}): StudentTargetContext {
  return {
    institute: student.institute ?? null,
    course: student.course ?? null,
    branch: student.department ?? null,
    semester: student.academicProfile?.semester ?? null,
  };
}

export async function apply(userId: string, tenantId: string, data: ApplyInput) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');

  await assertNoExistingOffer(student.id);

  const posting = await prisma.posting.findFirst({
    where: { id: data.posting_id, tenant_id: tenantId },
  });
  if (!posting) throw new NotFoundError('Posting');

  const academic = await prisma.academicProfile.findUnique({ where: { student_id: student.id } });
  const studentTargetContext = getStudentTargetContext({
    institute: student.institute,
    course: student.course,
    department: student.department,
    academicProfile: academic ? { semester: academic.semester } : null,
  });

  if (!matchesStudentTargeting(posting as any, studentTargetContext)) {
    throw new BusinessRuleError(
      'This posting is not visible to your student profile',
      'POSTING_NOT_VISIBLE'
    );
  }

  if (posting.status !== 'published') {
    throw new BusinessRuleError('Can only apply to published postings', 'POSTING_NOT_PUBLISHED');
  }

  if (!student.policy_accepted) {
    throw new BusinessRuleError(
      'Placement policy must be accepted before applying',
      'POLICY_NOT_ACCEPTED'
    );
  }

  // Application Receiving must be ON for this posting type (blocks even already-enrolled students).
  await assertPostingTypeAcceptingApplications(posting.posting_type_master_id);

  // The student must have enrolled (registered interest) in this posting type first.
  await assertInterestRegistered(student.id, posting.posting_type_master_id);

  // Placement opt-out (global or for this posting type) blocks applying.
  await assertPlacementInterest(student.id, posting.posting_type_master_id);

  // A non-rejected self-sourced NOC for this posting type blocks applying to the same type.
  await assertNoSelfPlacedNoc(student.id, posting.posting_type_master_id);

  // The policy linked to this posting type (if any) must be accepted first.
  await assertPostingTypePolicyAccepted(student.id, posting.posting_type_master_id);

  // Check if already applied
  const existing = await prisma.application.findUnique({
    where: { student_id_posting_id: { student_id: student.id, posting_id: data.posting_id } },
  });
  if (existing) {
    throw new BusinessRuleError('Already applied to this posting', 'ALREADY_APPLIED');
  }

  if (posting.eligible_branches.length > 0 && !matchesAllowedDepartment(student.department, posting.eligible_branches)) {
    throw new BusinessRuleError(
      'Student department is not eligible for this posting',
      'BRANCH_NOT_ELIGIBLE'
    );
  }

  if (posting.eligible_batches.length > 0 && !matchesAllowedBatch(student.batch, posting.eligible_batches)) {
    throw new BusinessRuleError(
      'Student batch is not eligible for this posting',
      'BATCH_NOT_ELIGIBLE'
    );
  }

  if (posting.min_cgpa) {
    if (academic?.cgpa == null || Number(academic.cgpa) < Number(posting.min_cgpa)) {
      throw new BusinessRuleError(
        `Minimum CGPA requirement is ${posting.min_cgpa}`,
        'CGPA_NOT_MET'
      );
    }
  }

  if ((academic?.backlog_count ?? 0) > posting.max_backlogs) {
    throw new BusinessRuleError(
      `Maximum allowed backlogs is ${posting.max_backlogs}`,
      'BACKLOGS_NOT_MET'
    );
  }

  if (data.resume_id) {
    const resume = await prisma.resume.findFirst({
      where: { id: data.resume_id, student_id: student.id },
    });
    if (!resume) throw new NotFoundError('Resume');
  }

  const application = await prisma.application.create({
    data: {
      tenant_id: tenantId,
      student_id: student.id,
      posting_id: data.posting_id,
      resume_id: data.resume_id,
    },
  });

  // Record initial stage history
  await prisma.applicationStageHistory.create({
    data: {
      application_id: application.id,
      to_stage: 'applied',
      changed_by: userId,
    },
  });

  void notifyTpoAudience({
    tenantId,
    type: 'application',
    title: `${student.full_name} applied`,
    description: `Applied to: ${posting.title}`,
    priority: 'medium',
    actionUrl: `/admin/applications/${application.posting_id}`,
    payload: { application_id: application.id, student_id: student.id, posting_id: posting.id },
  });

  return application;
}

// Whitelist of sortable columns → Prisma orderBy. Never inject sort_by raw into Prisma.
function getApplicationOrderBy(sortBy?: string, sortOrder: 'asc' | 'desc' = 'asc'): Prisma.ApplicationOrderByWithRelationInput {
  switch (sortBy) {
    case 'student': return { student: { full_name: sortOrder } };
    case 'posting': return { posting: { title: sortOrder } };
    case 'stage': return { current_stage: sortOrder };
    case 'applied_at': return { applied_at: sortOrder };
    default: return { applied_at: sortOrder };
  }
}

export async function getApplicationsByPosting(tenantId: string, filters: QueryApplicationsInput) {
  const {
    page, limit, posting_id, posting_type_master_id, stage, sort_by, sort_order,
    institute, course, branch, semester, academic_year, date_from, date_to,
  } = filters;
  const where: Record<string, unknown> = { tenant_id: tenantId };

  if (posting_id) where.posting_id = posting_id;
  if (posting_type_master_id) where.posting = { is: { posting_type_master_id } };
  if (stage) where.current_stage = stage;

  const studentScope = buildStudentScopeConditions({ institute, course, branch, semester, academic_year });
  if (studentScope.length > 0) where.student = { is: { AND: studentScope } };

  const dateRange = buildDateRangeCondition(date_from, date_to);
  if (dateRange) where.applied_at = dateRange;

  const [applications, total] = await Promise.all([
    prisma.application.findMany({
      where,
      ...buildPrismaQuery(page, limit),
      orderBy: getApplicationOrderBy(sort_by, sort_order),
      include: {
        student: {
          select: {
            id: true,
            full_name: true,
            enrollment_number: true,
            roll_number: true,
            email: true,
            mobile: true,
            department: true,
            batch: true,
            course: true,
            institute: true,
            current_semester: true,
            academic_profile: {
              select: {
                cgpa: true,
                tenth_percentage: true,
                twelfth_percentage: true,
                semester: true,
              },
            },
          },
        },
        posting: { select: { id: true, title: true, posting_type_master: { select: { value: true } }, company: { select: { name: true } } } },
        resume: { select: { file_url: true } },
      },
    }),
    prisma.application.count({ where }),
  ]);

  return {
    data: applications.map((application) => ({
      ...application,
      resume_url: application.resume?.file_url ?? null,
      posting: { ...application.posting, type: application.posting.posting_type_master?.value ?? '' },
    })),
    pagination: paginate(page, limit, total),
  };
}

export async function getMyApplications(userId: string) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');

  const apps = await prisma.application.findMany({
    where: { student_id: student.id },
    include: {
      posting: {
        select: {
          id: true, title: true, status: true,
          posting_type_master: { select: { value: true } },
          company: { select: { name: true } },
        },
      },
    },
    orderBy: { applied_at: 'desc' },
  });
  return apps.map((app) => ({
    ...app,
    posting: { ...app.posting, type: app.posting.posting_type_master?.value ?? '' },
  }));
}

export async function getApplicationById(applicationId: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      student: { select: { id: true, full_name: true, enrollment_number: true, department: true, batch: true } },
      posting: { select: { id: true, title: true, company: { select: { name: true } } } },
      stage_history: { orderBy: { changed_at: 'desc' } },
    },
  });

  if (!application) throw new NotFoundError('Application');
  return application;
}

export async function moveStage(applicationId: string, data: MoveStageInput, userId: string) {
  const application = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!application) throw new NotFoundError('Application');

  if (application.current_stage === 'rejected') {
    throw new BusinessRuleError('Cannot move a rejected application', 'APPLICATION_REJECTED');
  }

  const fromStage = application.current_stage;

  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: { current_stage: data.stage as ApplicationStage },
  });

  await prisma.applicationStageHistory.create({
    data: {
      application_id: applicationId,
      from_stage: fromStage,
      to_stage: data.stage,
      changed_by: userId,
      remarks: data.remarks,
    },
  });

  prisma.auditLog.create({
    data: {
      tenant_id: application.tenant_id,
      user_id: userId,
      action: 'move_stage',
      module: 'applications',
      target_type: 'applications',
      target_id: applicationId,
      details: `Moved from ${fromStage} to ${data.stage}`,
    },
  }).catch(err => logger.error({ err }, 'Audit log failed'));

  try {
    const studentRow = await prisma.student.findUnique({
      where: { id: application.student_id },
      select: { user_id: true, full_name: true },
    });
    if (studentRow?.user_id) {
      void createNotification({
        userId: studentRow.user_id,
        tenantId: application.tenant_id,
        type: 'application',
        title: 'Your application moved to a new stage',
        description: `From ${fromStage} to ${data.stage}${data.remarks ? `. ${data.remarks}` : ''}`,
        priority: data.stage === 'rejected' ? 'high' : 'medium',
        actionUrl: '/applications',
        payload: { application_id: applicationId, from_stage: fromStage, to_stage: data.stage },
      });
    }
  } catch (err) {
    // swallow
  }

  return updated;
}

export async function bulkMoveStage(data: BulkMoveStageInput, userId: string) {
  const results = [];
  for (const appId of data.application_ids) {
    try {
      const result = await moveStage(appId, { stage: data.stage, remarks: data.remarks }, userId);
      results.push({ id: appId, status: 'moved', stage: result.current_stage });
    } catch (err: any) {
      results.push({ id: appId, status: 'error', message: err.message });
    }
  }
  return results;
}

export async function setMockRoundResult(applicationId: string, data: MockRoundResultInput, userId: string) {
  const application = await prisma.application.findUnique({ where: { id: applicationId } });
  if (!application) throw new NotFoundError('Application');

  if (application.current_stage !== 'mock_round') {
    throw new BusinessRuleError(
      'Application must be in mock_round stage',
      'INVALID_STAGE_FOR_MOCK'
    );
  }

  const updatedApp = await prisma.application.update({
    where: { id: applicationId },
    data: { mock_round_result: data.result as MockRoundResult },
  });

  try {
    const studentRow = await prisma.student.findUnique({
      where: { id: application.student_id },
      select: { user_id: true },
    });
    if (studentRow?.user_id) {
      void createNotification({
        userId: studentRow.user_id,
        tenantId: application.tenant_id,
        type: 'application',
        title: 'Mock round result recorded',
        description: `Result: ${data.result}`,
        priority: 'medium',
        actionUrl: '/applications',
        payload: { application_id: applicationId, mock_round_result: data.result },
      });
    }
  } catch (err) {
    // swallow
  }

  return updatedApp;
}

export async function withdrawApplication(userId: string, applicationId: string) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');

  const application = await prisma.application.findFirst({
    where: { id: applicationId, student_id: student.id },
  });
  if (!application) throw new NotFoundError('Application');

  if (['offer_released', 'rejected'].includes(application.current_stage)) {
    throw new BusinessRuleError(
      'Cannot withdraw at this stage',
      'CANNOT_WITHDRAW'
    );
  }

  await prisma.application.delete({ where: { id: applicationId } });

  try {
    const posting = await prisma.posting.findUnique({
      where: { id: application.posting_id },
      select: { title: true },
    });
    void notifyTpoAudience({
      tenantId: application.tenant_id,
      type: 'application',
      title: `${student.full_name} withdrew an application`,
      description: posting?.title ? `From: ${posting.title}` : undefined,
      priority: 'low',
      actionUrl: `/admin/applications/${application.posting_id}`,
      payload: { posting_id: application.posting_id, student_id: student.id },
    });
  } catch (err) {
    // swallow
  }

  return { message: 'Application withdrawn' };
}
