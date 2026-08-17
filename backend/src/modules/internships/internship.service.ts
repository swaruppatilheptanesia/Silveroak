import { InternshipStatus, InternshipType, IssueStatus, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AuthorizationError, NotFoundError } from '../../shared/errors';
import { buildPrismaQuery, paginate } from '../../shared/utils/pagination';
import type {
  CreateInternshipInput,
  CreateIssueInput,
  QueryInternshipsInput,
  UpdateInternshipInput,
} from './internship.schema';

function isAdmin(user: Express.AuthUser) {
  return user.role === 'tpo_admin' || user.role === 'tpo_employee';
}

function buildStudentRelationFilter(
  user: Express.AuthUser,
  scope?: Express.ScopeFilters,
  filters?: Pick<QueryInternshipsInput, 'department' | 'batch'>
) {
  const studentWhere: Record<string, unknown> = {};

  if (user.role === 'faculty_coordinator') {
    studentWhere.department = scope?.department ?? '__no_match__';
  } else if (filters?.department) {
    studentWhere.department = filters.department;
  }

  if (filters?.batch) {
    studentWhere.batch = filters.batch;
  }

  return Object.keys(studentWhere).length > 0 ? { is: studentWhere } : undefined;
}

function buildInternshipWhere(
  tenantId: string,
  user: Express.AuthUser,
  scope: Express.ScopeFilters | undefined,
  filters: Partial<QueryInternshipsInput>
) {
  const where: Record<string, unknown> = { tenant_id: tenantId };
  const studentFilter = buildStudentRelationFilter(user, scope, filters);

  if (studentFilter) {
    where.student = studentFilter;
  }

  if (user.role === 'student') {
    where.student_id = scope?.student_id ?? '__no_match__';
  }

  if (user.role === 'recruiter') {
    where.company_id = scope?.company_id ?? '__no_match__';
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.student_id && isAdmin(user)) {
    where.student_id = filters.student_id;
  }

  if (filters.internship_type) {
    where.internship_type = filters.internship_type;
  }

  if (filters.posting_type_master_id) {
    where.offer = {
      is: {
        posting: {
          is: {
            posting_type_master_id: filters.posting_type_master_id,
          },
        },
      },
    };
  }

  if (filters.company_id) {
    if (isAdmin(user)) {
      where.company_id = filters.company_id;
    } else if (user.role === 'recruiter' && filters.company_id !== scope?.company_id) {
      where.company_id = '__no_match__';
    }
  }

  if (filters.has_open_issues) {
    where.issues = { some: { status: 'open' as IssueStatus } };
  }

  if (typeof filters.is_receiving_stipend === 'boolean') {
    where.is_receiving_stipend = filters.is_receiving_stipend;
  }

  if (filters.certificate_pending) {
    where.certificate_uploaded = false;

    if (filters.status === 'discontinued') {
      where.id = '__no_match__';
    } else if (!filters.status) {
      where.status = { not: 'discontinued' as InternshipStatus };
    }
  }

  if (filters.search) {
    where.OR = [
      { company_name: { contains: filters.search, mode: 'insensitive' } },
      { role: { contains: filters.search, mode: 'insensitive' } },
      {
        student: {
          is: {
            full_name: { contains: filters.search, mode: 'insensitive' },
          },
        },
      },
      {
        student: {
          is: {
            enrollment_number: { contains: filters.search, mode: 'insensitive' },
          },
        },
      },
    ];
  }

  return where;
}

// Whitelist of sortable columns → Prisma orderBy. Never inject sort_by raw into Prisma.
// Company sorts by the always-present company_name scalar (company relation is nullable).
function getInternshipOrderBy(sortBy?: string, sortOrder: 'asc' | 'desc' = 'asc'): Prisma.InternshipOrderByWithRelationInput {
  switch (sortBy) {
    case 'student': return { student: { full_name: sortOrder } };
    case 'company': return { company_name: sortOrder };
    case 'status': return { status: sortOrder };
    case 'start_date': return { start_date: sortOrder };
    case 'created_at': return { created_at: sortOrder };
    default: return { created_at: sortOrder };
  }
}

export async function getInternships(
  tenantId: string,
  filters: QueryInternshipsInput,
  user: Express.AuthUser,
  scope?: Express.ScopeFilters
) {
  const { page, limit, sort_by, sort_order } = filters;
  const where = buildInternshipWhere(tenantId, user, scope, filters);

  const [internships, total] = await Promise.all([
    prisma.internship.findMany({
      where,
      ...buildPrismaQuery(page, limit),
      orderBy: getInternshipOrderBy(sort_by, sort_order),
      include: {
        student: {
          select: {
            id: true,
            full_name: true,
            enrollment_number: true,
            department: true,
            batch: true,
          },
        },
        issues: {
          select: {
            id: true,
            status: true,
          },
        },
        offer: {
          select: {
            posting: {
              select: {
                posting_type_master: { select: { value: true } },
              },
            },
          },
        },
      },
    }),
    prisma.internship.count({ where }),
  ]);

  return {
    data: internships.map(({ issues, offer, ...internship }) => ({
      ...internship,
      posting_type: offer?.posting?.posting_type_master?.value ?? null,
      issue_count: issues.length,
      open_issue_count: issues.filter((issue) => issue.status === 'open').length,
    })),
    pagination: paginate(page, limit, total),
  };
}

export async function getMyInternships(userId: string) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');

  return prisma.internship.findMany({
    where: { student_id: student.id },
    include: {
      issues: {
        orderBy: { created_at: 'desc' },
        include: {
          reported_by_user: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { created_at: 'desc' },
  });
}

export async function getInternshipById(
  internshipId: string,
  user: Express.AuthUser,
  scope?: Express.ScopeFilters
) {
  const internship = await prisma.internship.findFirst({
    where: {
      id: internshipId,
      ...buildInternshipWhere(user.tenant_id, user, scope, {}),
    },
    include: {
      student: {
        select: {
          id: true,
          full_name: true,
          enrollment_number: true,
          department: true,
          batch: true,
          email: true,
          mobile: true,
        },
      },
      issues: {
        orderBy: { created_at: 'desc' },
        include: {
          reported_by_user: { select: { id: true, name: true } },
        },
      },
      offer: {
        select: {
          posting: {
            select: {
              posting_type_master: { select: { value: true } },
            },
          },
        },
      },
    },
  });

  if (!internship) throw new NotFoundError('Internship');
  return internship;
}

export async function createInternship(userId: string, tenantId: string, data: CreateInternshipInput) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');

  if (data.offer_id) {
    const offer = await prisma.offer.findFirst({
      where: {
        id: data.offer_id,
        tenant_id: tenantId,
        student_id: student.id,
      },
      select: { id: true },
    });

    if (!offer) {
      throw new AuthorizationError(
        'You can only link your own internship offer',
        'OFFER_NOT_ALLOWED'
      );
    }
  }

  return prisma.internship.create({
    data: {
      tenant_id: tenantId,
      student_id: student.id,
      company_id: data.company_id,
      company_name: data.company_name,
      role: data.role,
      department: data.department,
      internship_type: data.internship_type as InternshipType,
      start_date: data.start_date,
      end_date: data.end_date,
      stipend_amount: data.stipend_amount,
      stipend_frequency: data.stipend_frequency,
      is_receiving_stipend: data.is_receiving_stipend,
      certificate_url: data.certificate_url,
      certificate_uploaded: true,
      offer_id: data.offer_id,
    },
  });
}

export async function updateInternship(internshipId: string, data: UpdateInternshipInput) {
  const existing = await prisma.internship.findUnique({ where: { id: internshipId } });
  if (!existing) throw new NotFoundError('Internship');

  return prisma.internship.update({
    where: { id: internshipId },
    data: {
      ...data,
      internship_type: data.internship_type as InternshipType | undefined,
      status: data.status as InternshipStatus | undefined,
    },
  });
}

export async function createIssue(
  internshipId: string,
  data: CreateIssueInput,
  user: Express.AuthUser,
  scope?: Express.ScopeFilters
) {
  const internship = await prisma.internship.findFirst({
    where: {
      id: internshipId,
      ...buildInternshipWhere(user.tenant_id, user, scope, {}),
    },
  });

  if (!internship) throw new NotFoundError('Internship');

  return prisma.internshipIssue.create({
    data: {
      internship_id: internshipId,
      title: data.title,
      description: data.description,
      reported_by: user.id,
    },
  });
}

export async function resolveIssue(issueId: string) {
  const issue = await prisma.internshipIssue.findUnique({ where: { id: issueId } });
  if (!issue) throw new NotFoundError('Issue');

  return prisma.internshipIssue.update({
    where: { id: issueId },
    data: { status: 'resolved' as IssueStatus, resolved_at: new Date() },
  });
}
