import { prisma } from '../../config/database';
import { NotFoundError, BusinessRuleError } from '../../shared/errors';
import { paginate, buildPrismaQuery } from '../../shared/utils/pagination';
import { logger } from '../../config/logger';
import { matchesStudentTargeting, type StudentTargetContext } from '../../shared/utils/student-targeting';
import { flattenPostingType, POSTING_TYPE_MASTER_INCLUDE } from '../../shared/utils/flatten-posting-type';
import { buildDateRangeCondition } from '../../shared/utils/student-scope-filter';
import {
  getVisiblePostingTypeValues,
  normalizePostingTypeValue,
} from '../../shared/utils/posting-type-interest';
import type {
  CreatePostingInput,
  UpdatePostingInput,
  QueryPostingsInput,
  PublishPostingInput,
  RepublishPostingInput,
} from './posting.schema';
import { Prisma, WorkMode, PostingStatus, UserRole } from '@prisma/client';

async function ensurePostingTypeMaster(tenantId: string, postingTypeMasterId: string) {
  const master = await prisma.masterOption.findFirst({
    where: { id: postingTypeMasterId, tenant_id: tenantId, category: 'posting_type' },
  });
  if (!master) {
    throw new BusinessRuleError('Selected posting type is not available', 'POSTING_TYPE_NOT_FOUND');
  }
  if (!master.is_active) {
    throw new BusinessRuleError('Selected posting type is inactive', 'POSTING_TYPE_INACTIVE');
  }
  return master;
}

async function getStudentTargetContext(
  userId: string,
): Promise<{ studentId: string; context: StudentTargetContext }> {
  const student = await prisma.student.findUnique({
    where: { user_id: userId },
    select: {
      id: true,
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
    studentId: student.id,
    context: {
      institute: student.institute ?? null,
      course: student.course ?? null,
      branch: student.department ?? null,
      semester: student.academic_profile?.semester ?? null,
    },
  };
}

// Whitelist of sortable columns → Prisma orderBy. Never inject sort_by raw into Prisma.
function getPostingOrderBy(sortBy?: string, sortOrder: 'asc' | 'desc' = 'asc'): Prisma.PostingOrderByWithRelationInput {
  switch (sortBy) {
    case 'title': return { title: sortOrder };
    case 'company': return { company: { name: sortOrder } };
    case 'posting_type': return { posting_type_master: { value: sortOrder } };
    case 'status': return { status: sortOrder };
    case 'created_at': return { created_at: sortOrder };
    default: return { created_at: sortOrder };
  }
}

export async function getPostings(
  tenantId: string,
  filters: QueryPostingsInput,
  role?: UserRole,
  userId?: string
) {
  const {
    page, limit, search, status, posting_type_master_id, company_id, sort_by, sort_order,
    institute, course, branch, academic_year, date_from, date_to,
  } = filters;
  const where: Record<string, unknown> = { tenant_id: tenantId };

  if (role === 'student') {
    where.status = 'published';
  } else if (status) {
    where.status = status;
  }
  if (posting_type_master_id) where.posting_type_master_id = posting_type_master_id;
  if (company_id) where.company_id = company_id;
  // Admin FILTER COUNTER EXPORT scope — target arrays hold names; academic_year is a scalar; date on created_at.
  if (institute) where.target_institutes = { has: institute };
  if (course) where.target_courses = { has: course };
  if (branch) where.target_branches = { has: branch };
  if (academic_year) where.academic_year = { contains: academic_year, mode: 'insensitive' };
  const postingDateRange = buildDateRangeCondition(date_from, date_to);
  if (postingDateRange) where.created_at = postingDateRange;
  if (search) {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { role_name: { contains: search, mode: 'insensitive' } },
    ];
  }

  const include = {
    company: { select: { id: true, name: true, industry: true } },
    ...POSTING_TYPE_MASTER_INCLUDE,
  } as const;

  if (role === 'student') {
    if (!userId) {
      throw new NotFoundError('Student profile');
    }

    const [postings, { studentId, context: studentTargetContext }] = await Promise.all([
      prisma.posting.findMany({
        where,
        orderBy: getPostingOrderBy(sort_by, sort_order),
        include,
      }),
      getStudentTargetContext(userId),
    ]);

    // Students only see postings under a posting type they have enrolled in (registered
    // interest for) — or already have an application/offer for. Not-enrolled types are hidden.
    const visibleTypeValues = await getVisiblePostingTypeValues(studentId);

    const filtered = postings.filter(
      (posting) =>
        matchesStudentTargeting(posting as any, studentTargetContext) &&
        visibleTypeValues.has(normalizePostingTypeValue((posting as any).posting_type_master?.value ?? '')),
    );

    return {
      data: filtered.slice((page - 1) * limit, page * limit).map(flattenPostingType),
      pagination: paginate(page, limit, filtered.length),
    };
  }

  const [postings, total] = await Promise.all([
    prisma.posting.findMany({
      where,
      ...buildPrismaQuery(page, limit),
      orderBy: getPostingOrderBy(sort_by, sort_order),
      include,
    }),
    prisma.posting.count({ where }),
  ]);

  return { data: postings.map(flattenPostingType), pagination: paginate(page, limit, total) };
}

export async function getPostingById(postingId: string, tenantId?: string, role?: UserRole, userId?: string) {
  // When a student calls this, the `offers` include must be scoped to their
  // own offer only — other applicants' identities must not leak through the
  // detail response. Admin / faculty / recruiter callers get the full list.
  let viewerStudentId: string | null = null;
  if (role === 'student' && userId) {
    const viewer = await prisma.student.findUnique({
      where: { user_id: userId },
      select: { id: true },
    });
    viewerStudentId = viewer?.id ?? null;
  }

  const posting = await prisma.posting.findFirst({
    where: {
      id: postingId,
      ...(tenantId ? { tenant_id: tenantId } : {}),
    },
    include: {
      company: { select: { id: true, name: true, industry: true } },
      ...POSTING_TYPE_MASTER_INCLUDE,
      offers: {
        ...(role === 'student'
          ? { where: { student_id: viewerStudentId ?? '__no_match__' } }
          : {}),
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

    const { studentId, context: studentTargetContext } = await getStudentTargetContext(userId);
    if (!matchesStudentTargeting(posting as any, studentTargetContext)) {
      throw new NotFoundError('Posting');
    }

    // Hide the posting from students who have not enrolled in its posting type
    // (unless they already have an application/offer for it) — matches the list behaviour.
    const visibleTypeValues = await getVisiblePostingTypeValues(studentId);
    if (!visibleTypeValues.has(normalizePostingTypeValue((posting as any).posting_type_master?.value ?? ''))) {
      throw new NotFoundError('Posting');
    }
  }
  return flattenPostingType(posting);
}

export async function createPosting(tenantId: string, data: CreatePostingInput, userId?: string) {
  // Verify company exists
  const company = await prisma.company.findUnique({ where: { id: data.company_id } });
  if (!company) throw new NotFoundError('Company');

  // Verify posting type master row exists, belongs to this tenant, and is active.
  // The DB-level FK also enforces existence (ON DELETE RESTRICT), but the explicit
  // check returns a friendlier error and rejects inactive types up-front.
  await ensurePostingTypeMaster(tenantId, data.posting_type_master_id);

  const posting = await prisma.posting.create({
    data: {
      tenant_id: tenantId,
      company_id: data.company_id,
      title: data.title,
      posting_type_master_id: data.posting_type_master_id,
      academic_year: data.academic_year,
      role_name: data.role_name,
      // `location` (legacy scalar) mirrors the first of `locations` so existing
      // read sites keep working; `locations` is the multi-value source of truth.
      location: data.locations?.[0] ?? data.location,
      locations: data.locations ?? [],
      work_mode: data.work_mode as WorkMode,
      ctc: data.ctc,
      stipend: data.stipend,
      duration: data.duration,
      bond_details: data.bond_details,
      role_description: data.role_description,
      // `job_description_pdf_url` (legacy scalar) mirrors the first uploaded PDF.
      job_description_pdf_url: data.job_description_pdf_urls?.[0] ?? data.job_description_pdf_url,
      job_description_pdf_urls: data.job_description_pdf_urls ?? [],
      job_description_pdf_names: data.job_description_pdf_names ?? [],
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

  if (data.posting_type_master_id) {
    await ensurePostingTypeMaster(existing.tenant_id, data.posting_type_master_id);
  }

  const posting = await prisma.posting.update({
    where: { id: postingId },
    data: {
      ...data,
      work_mode: data.work_mode as WorkMode | undefined,
      // Keep the legacy scalar columns in sync with the new array fields when provided.
      ...(data.locations && data.locations.length > 0 ? { location: data.locations[0] } : {}),
      ...(data.job_description_pdf_urls && data.job_description_pdf_urls.length > 0
        ? { job_description_pdf_url: data.job_description_pdf_urls[0] }
        : {}),
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

export async function republishPosting(postingId: string, data: RepublishPostingInput, userId?: string) {
  const existing = await prisma.posting.findUnique({ where: { id: postingId } });
  if (!existing) throw new NotFoundError('Posting');

  if (existing.status !== 'closed') {
    throw new BusinessRuleError(
      `Cannot republish a posting with status "${existing.status}"`,
      'POSTING_NOT_CLOSED'
    );
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  if (data.application_end_date < startOfToday) {
    throw new BusinessRuleError(
      'Application end date must be today or later.',
      'INVALID_DATE_WINDOW'
    );
  }

  if (data.application_end_date < data.application_start_date) {
    throw new BusinessRuleError(
      'Application end date must be on or after the start date.',
      'INVALID_DATE_WINDOW'
    );
  }

  const posting = await prisma.posting.update({
    where: { id: postingId },
    data: {
      status: 'published' as PostingStatus,
      published_at: new Date(),
      closed_at: null,
      application_start_date: data.application_start_date,
      application_end_date: data.application_end_date,
    },
  });

  if (userId) {
    prisma.auditLog.create({
      data: {
        tenant_id: existing.tenant_id,
        user_id: userId,
        action: 'republish',
        module: 'postings',
        target_type: 'postings',
        target_id: postingId,
        details: `Republished posting: ${posting.title}`,
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
