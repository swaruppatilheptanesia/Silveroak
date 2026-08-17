import { prisma } from '../../config/database';
import { NotFoundError, BusinessRuleError } from '../../shared/errors';
import { paginate, buildPrismaQuery } from '../../shared/utils/pagination';
import { logger } from '../../config/logger';
import { matchesStudentTargeting, type StudentTargetContext } from '../../shared/utils/student-targeting';
import type {
  ApplyInput,
  MoveStageInput,
  BulkMoveStageInput,
  MockRoundResultInput,
  QueryApplicationsInput,
} from './application.schema';
import { ApplicationStage, MockRoundResult } from '@prisma/client';

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

  return application;
}

export async function getApplicationsByPosting(tenantId: string, filters: QueryApplicationsInput) {
  const { page, limit, posting_id, posting_type, stage, sort_by, sort_order } = filters;
  const where: Record<string, unknown> = { tenant_id: tenantId };

  if (posting_id) where.posting_id = posting_id;
  if (posting_type) where.posting = { is: { type: posting_type } };
  if (stage) where.current_stage = stage;

  const [applications, total] = await Promise.all([
    prisma.application.findMany({
      where,
      ...buildPrismaQuery(page, limit),
      orderBy: { [sort_by || 'applied_at']: sort_order || 'desc' },
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
        posting: { select: { id: true, title: true, type: true, company: { select: { name: true } } } },
      },
    }),
    prisma.application.count({ where }),
  ]);

  return { data: applications, pagination: paginate(page, limit, total) };
}

export async function getMyApplications(userId: string) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');

  return prisma.application.findMany({
    where: { student_id: student.id },
    include: {
      posting: {
        select: {
          id: true, title: true, type: true, status: true,
          company: { select: { name: true } },
        },
      },
    },
    orderBy: { applied_at: 'desc' },
  });
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

  return prisma.application.update({
    where: { id: applicationId },
    data: { mock_round_result: data.result as MockRoundResult },
  });
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
  return { message: 'Application withdrawn' };
}
