import { prisma } from '../../config/database';
import { NotFoundError, BusinessRuleError } from '../../shared/errors';
import { paginate, buildPrismaQuery } from '../../shared/utils/pagination';
import { logger } from '../../config/logger';
import { matchesStudentTargeting, type StudentTargetContext } from '../../shared/utils/student-targeting';
import type {
  CreatePostingInput,
  UpdatePostingInput,
  QueryPostingsInput,
  PublishPostingInput,
} from './posting.schema';
import { Prisma, PostingType, WorkMode, PostingStatus, UserRole } from '@prisma/client';

async function getStudentTargetContext(userId: string): Promise<StudentTargetContext> {
  const student = await prisma.student.findUnique({
    where: { user_id: userId },
    select: {
      institute: true,
      course: true,
      department: true,
      academic_profile: {
        select: {
          semester: true,
        },
      },
    },
  });

  if (!student) {
    throw new NotFoundError('Student profile');
  }

  return {
    institute: student.institute ?? null,
    course: student.course ?? null,
    branch: student.department ?? null,
    semester: student.academic_profile?.semester ?? null,
  };
}

export async function getPostings(
  tenantId: string,
  filters: QueryPostingsInput,
  role?: UserRole,
  userId?: string
) {
  const { page, limit, search, status, type, company_id, sort_by, sort_order } = filters;
  const where: Record<string, unknown> = { tenant_id: tenantId };

  if (role === 'student') {
    where.status = 'published';
  } else if (status) {
    where.status = status;
  }
  if (type) where.type = type;
  if (company_id) where.company_id = company_id;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { role_name: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (role === 'student') {
    if (!userId) {
      throw new NotFoundError('Student profile');
    }

    const [postings, studentTargetContext] = await Promise.all([
      prisma.posting.findMany({
        where,
        orderBy: { [sort_by || 'created_at']: sort_order || 'desc' },
        include: { company: { select: { id: true, name: true, industry: true } } },
      }),
      getStudentTargetContext(userId),
    ]);

    const filtered = postings.filter((posting) => matchesStudentTargeting(posting as any, studentTargetContext));

    return {
      data: filtered.slice((page - 1) * limit, page * limit),
      pagination: paginate(page, limit, filtered.length),
    };
  }

  const [postings, total] = await Promise.all([
    prisma.posting.findMany({
      where,
      ...buildPrismaQuery(page, limit),
      orderBy: { [sort_by || 'created_at']: sort_order || 'desc' },
      include: { company: { select: { id: true, name: true, industry: true } } },
    }),
    prisma.posting.count({ where }),
  ]);

  return { data: postings, pagination: paginate(page, limit, total) };
}

export async function getPostingById(postingId: string, tenantId?: string, role?: UserRole, userId?: string) {
  const posting = await prisma.posting.findFirst({
    where: {
      id: postingId,
      ...(tenantId ? { tenant_id: tenantId } : {}),
    },
    include: {
      company: { select: { id: true, name: true, industry: true } },
      offers: {
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          type: true,
          role: true,
          ctc: true,
          stipend: true,
          location: true,
          offer_date: true,
          status: true,
          created_at: true,
          student: {
            select: {
              id: true,
              full_name: true,
              enrollment_number: true,
              department: true,
              batch: true,
              profile_photo_url: true,
            },
          },
        },
      },
      _count: { select: { applications: true, offers: true } },
    },
  });

  if (!posting) throw new NotFoundError('Posting');
  if (role === 'student') {
    if (posting.status !== 'published') {
      throw new NotFoundError('Posting');
    }

    if (!userId) {
      throw new NotFoundError('Student profile');
    }

    const studentTargetContext = await getStudentTargetContext(userId);
    if (!matchesStudentTargeting(posting as any, studentTargetContext)) {
      throw new NotFoundError('Posting');
    }
  }
  return posting;
}

export async function createPosting(tenantId: string, data: CreatePostingInput, userId?: string) {
  // Verify company exists
  const company = await prisma.company.findUnique({ where: { id: data.company_id } });
  if (!company) throw new NotFoundError('Company');

  const posting = await prisma.posting.create({
    data: {
      tenant_id: tenantId,
      company_id: data.company_id,
      title: data.title,
      type: data.type as PostingType,
      academic_year: data.academic_year,
      role_name: data.role_name,
      location: data.location,
      work_mode: data.work_mode as WorkMode,
      ctc: data.ctc,
      stipend: data.stipend,
      duration: data.duration,
      bond_details: data.bond_details,
      role_description: data.role_description,
      job_description_pdf_url: data.job_description_pdf_url,
      target_institutes: data.target_institutes,
      target_courses: data.target_courses,
      target_branches: data.target_branches,
      target_semesters: data.target_semesters,
      eligible_branches: data.eligible_branches,
      eligible_batches: data.eligible_batches,
      min_cgpa: data.min_cgpa,
      max_backlogs: data.max_backlogs,
      skill_requirements: data.skill_requirements,
      has_written_test: data.has_written_test,
      written_test_details: data.written_test_details,
      has_gd: data.has_gd,
      gd_details: data.gd_details,
      technical_rounds: data.technical_rounds,
      hr_rounds: data.hr_rounds,
      additional_info: data.additional_info,
      application_override_enabled: data.application_override_enabled,
      application_start_date: data.application_start_date,
      application_end_date: data.application_end_date,
      created_by: userId,
    } as Prisma.PostingUncheckedCreateInput,
  });

  if (userId) {
    prisma.auditLog.create({
      data: {
        tenant_id: tenantId,
        user_id: userId,
        action: 'create',
        module: 'postings',
        target_type: 'postings',
        target_id: posting.id,
        details: `Created posting: ${posting.title}`,
      },
    }).catch(err => logger.error({ err }, 'Audit log failed'));
  }

  return posting;
}

export async function updatePosting(postingId: string, data: UpdatePostingInput, userId?: string) {
  const existing = await prisma.posting.findUnique({ where: { id: postingId } });
  if (!existing) throw new NotFoundError('Posting');

  if (existing.status === 'closed') {
    throw new BusinessRuleError('Cannot update a closed posting', 'POSTING_CLOSED');
  }

  const posting = await prisma.posting.update({
    where: { id: postingId },
    data: {
      ...data,
      type: data.type as PostingType | undefined,
      work_mode: data.work_mode as WorkMode | undefined,
    },
  });

  if (userId) {
    prisma.auditLog.create({
      data: {
        tenant_id: existing.tenant_id,
        user_id: userId,
        action: 'update',
        module: 'postings',
        target_type: 'postings',
        target_id: postingId,
        details: `Updated posting: ${posting.title}`,
      },
    }).catch(err => logger.error({ err }, 'Audit log failed'));
  }

  return posting;
}

export async function publishPosting(postingId: string, data: PublishPostingInput, userId?: string) {
  const existing = await prisma.posting.findUnique({ where: { id: postingId } });
  if (!existing) throw new NotFoundError('Posting');

  if (existing.status !== 'draft') {
    throw new BusinessRuleError(
      `Cannot publish a posting with status "${existing.status}"`,
      'INVALID_POSTING_STATUS'
    );
  }

  const posting = await prisma.posting.update({
    where: { id: postingId },
    data: {
      status: 'published' as PostingStatus,
      published_at: new Date(),
      application_start_date: data.application_start_date || existing.application_start_date,
      application_end_date: data.application_end_date || existing.application_end_date,
    },
  });

  if (userId) {
    prisma.auditLog.create({
      data: {
        tenant_id: existing.tenant_id,
        user_id: userId,
        action: 'publish',
        module: 'postings',
        target_type: 'postings',
        target_id: postingId,
        details: `Published posting: ${posting.title}`,
      },
    }).catch(err => logger.error({ err }, 'Audit log failed'));
  }

  return posting;
}

export async function closePosting(postingId: string, userId?: string) {
  const existing = await prisma.posting.findUnique({ where: { id: postingId } });
  if (!existing) throw new NotFoundError('Posting');

  if (existing.status === 'closed') {
    throw new BusinessRuleError('Posting is already closed', 'POSTING_ALREADY_CLOSED');
  }

  const posting = await prisma.posting.update({
    where: { id: postingId },
    data: {
      status: 'closed' as PostingStatus,
      closed_at: new Date(),
    },
  });

  if (userId) {
    prisma.auditLog.create({
      data: {
        tenant_id: existing.tenant_id,
        user_id: userId,
        action: 'close',
        module: 'postings',
        target_type: 'postings',
        target_id: postingId,
        details: `Closed posting: ${posting.title}`,
      },
    }).catch(err => logger.error({ err }, 'Audit log failed'));
  }

  return posting;
}
