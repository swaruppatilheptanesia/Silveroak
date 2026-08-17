import { AnnouncementPriority, AnnouncementStatus, Prisma, TargetAudienceType } from '@prisma/client';
import { prisma } from '../../config/database';
import { AuthorizationError, BusinessRuleError, NotFoundError } from '../../shared/errors';
import { buildPrismaQuery, paginate } from '../../shared/utils/pagination';
import { notifyManyUsers } from '../notifications/notification.service';
import { buildDateRangeCondition } from '../../shared/utils/student-scope-filter';
import type {
  CreateAnnouncementInput,
  QueryAnnouncementsInput,
  QueryAudienceSemestersInput,
  UpdateAnnouncementInput,
} from './announcement.schema';

function isAdmin(user: Express.AuthUser) {
  return user.role === 'tpo_admin' || user.role === 'tpo_employee';
}

function normalizeComparable(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function matchesAllowedValue(studentValue: string | null | undefined, allowedValues: string[]) {
  if (!studentValue?.trim()) {
    return false;
  }

  const normalizedStudentValue = normalizeComparable(studentValue);

  return allowedValues.some((allowedValue) => {
    const normalizedAllowedValue = normalizeComparable(allowedValue);
    return normalizedStudentValue === normalizedAllowedValue
      || normalizedStudentValue.includes(normalizedAllowedValue)
      || normalizedAllowedValue.includes(normalizedStudentValue);
  });
}

function extractBatchTokens(batch: string) {
  const trimmed = batch.trim();
  const tokens = new Set<string>([trimmed, normalizeComparable(trimmed)]);
  const lastSegment = trimmed
    .split(/[-/]/)
    .map((part) => part.trim())
    .filter(Boolean)
    .at(-1);

  if (lastSegment) {
    tokens.add(lastSegment);
    tokens.add(normalizeComparable(lastSegment));
  }

  return Array.from(tokens);
}

function matchesAllowedBatch(studentBatch: string, allowedBatches: string[]) {
  const studentTokens = new Set(extractBatchTokens(studentBatch));

  return allowedBatches.some((batch) => {
    const allowedTokens = extractBatchTokens(batch);
    return allowedTokens.some((token) => studentTokens.has(token));
  });
}

const announcementBaseInclude = {
  created_by_user: {
    select: {
      id: true,
      name: true,
    },
  },
  linked_circular: {
    select: {
      id: true,
      company_name: true,
      role_name: true,
      type: true,
      template: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} satisfies Prisma.AnnouncementInclude;

type AnnouncementRecord = Prisma.AnnouncementGetPayload<{
  include: typeof announcementBaseInclude;
}>;

type StudentAnnouncementRecord = Prisma.AnnouncementGetPayload<{
  include: typeof announcementBaseInclude & {
    receipts: {
      where: { student_id: string };
      select: {
        is_read: true;
        read_at: true;
        has_consented: true;
        consented_at: true;
      };
    };
  };
}>;

type AnnouncementStudentRecord = {
  id: string;
  institute: string | null;
  course: string | null;
  department: string;
  batch: string;
  academic_profile: {
    cgpa: Prisma.Decimal | null;
    backlog_count: number;
    semester: number | null;
  } | null;
};

type PostingEligibilityRecord = {
  id: string;
  eligible_branches: string[];
  eligible_batches: string[];
  min_cgpa: Prisma.Decimal;
  max_backlogs: number;
};

async function getStudentContext(userId: string, scope?: Express.ScopeFilters) {
  const student = await prisma.student.findUnique({
    where: { user_id: userId },
    select: {
      id: true,
      institute: true,
      course: true,
      department: true,
      batch: true,
      academic_profile: {
        select: {
          cgpa: true,
          backlog_count: true,
          semester: true,
        },
      },
    },
  });

  if (!student) throw new NotFoundError('Student profile');

  if (scope?.student_id && scope.student_id !== student.id) {
    throw new AuthorizationError('You can only access your own announcement records', 'ROLE_NOT_ALLOWED');
  }

  return student;
}

async function getPostingEligibilityMap(tenantId: string, announcements: Array<{ target_posting_id: string | null }>) {
  const postingIds = Array.from(
    new Set(
      announcements
        .map((announcement) => announcement.target_posting_id)
        .filter((postingId): postingId is string => Boolean(postingId))
    )
  );

  if (postingIds.length === 0) {
    return new Map<string, PostingEligibilityRecord>();
  }

  const postings = await prisma.posting.findMany({
    where: {
      tenant_id: tenantId,
      id: { in: postingIds },
    },
    select: {
      id: true,
      eligible_branches: true,
      eligible_batches: true,
      min_cgpa: true,
      max_backlogs: true,
    },
  });

  return new Map(postings.map((posting) => [posting.id, posting]));
}

/**
 * The hierarchical Institute → Course → Branch → Semester scope, AND-ed across levels. An empty
 * level means "all" for that level. Shared by delivery matching and by the audience-semester
 * picker endpoint, so the options an admin sees can never disagree with who actually receives it.
 */
interface AnnouncementScopeTargets {
  target_institutes: string[];
  target_courses: string[];
  target_branches: string[];
  target_semesters: string[];
}

interface AnnouncementScopeStudent {
  institute: string | null;
  course: string | null;
  department: string | null;
  semester: number | null;
}

function studentMatchesAnnouncementScope(
  targets: AnnouncementScopeTargets,
  student: AnnouncementScopeStudent,
) {
  if (targets.target_institutes.length > 0 && !matchesAllowedValue(student.institute, targets.target_institutes)) {
    return false;
  }

  if (targets.target_courses.length > 0 && !matchesAllowedValue(student.course, targets.target_courses)) {
    return false;
  }

  // Students carry no branch-level attribute — `department` is course-derived — so a branch target
  // is also satisfied by the parent course. Mirrors matchesStudentTargetingForMaster's fallback;
  // without it, branch-targeted announcements reach nobody.
  if (
    targets.target_branches.length > 0
    && !matchesAllowedValue(student.department, targets.target_branches)
    && !matchesAllowedValue(student.course, targets.target_branches)
  ) {
    return false;
  }

  if (
    targets.target_semesters.length > 0
    && !matchesAllowedValue(
      student.semester != null ? String(student.semester) : null,
      targets.target_semesters,
    )
  ) {
    return false;
  }

  return true;
}

function studentMatchesAnnouncement(
  announcement: {
    target_audience_type: TargetAudienceType;
    target_institutes: string[];
    target_courses: string[];
    target_branches: string[];
    target_departments: string[];
    target_batches: string[];
    target_semesters: string[];
    target_posting_id: string | null;
  },
  student: AnnouncementStudentRecord,
  postingMap: Map<string, PostingEligibilityRecord>
) {
  // Scope levels always apply, regardless of target_audience_type.
  if (
    !studentMatchesAnnouncementScope(announcement, {
      institute: student.institute,
      course: student.course,
      department: student.department,
      semester: student.academic_profile?.semester ?? null,
    })
  ) {
    return false;
  }

  switch (announcement.target_audience_type) {
    case 'all':
      return true;
    case 'department':
      return announcement.target_departments.length > 0
        && matchesAllowedValue(student.department, announcement.target_departments);
    case 'batch':
      return announcement.target_batches.length > 0
        && matchesAllowedBatch(student.batch, announcement.target_batches);
    case 'semester':
      return announcement.target_semesters.length > 0
        && matchesAllowedValue(
          student.academic_profile?.semester != null ? String(student.academic_profile.semester) : null,
          announcement.target_semesters,
        );
    case 'eligible_for_posting': {
      if (!announcement.target_posting_id) {
        return false;
      }

      const posting = postingMap.get(announcement.target_posting_id);
      if (!posting) {
        return false;
      }

      if (
        posting.eligible_branches.length > 0
        && !matchesAllowedValue(student.department, posting.eligible_branches)
      ) {
        return false;
      }

      if (
        posting.eligible_batches.length > 0
        && !matchesAllowedBatch(student.batch, posting.eligible_batches)
      ) {
        return false;
      }

      if (Number(posting.min_cgpa) > 0) {
        if (student.academic_profile?.cgpa == null || Number(student.academic_profile.cgpa) < Number(posting.min_cgpa)) {
          return false;
        }
      }

      if ((student.academic_profile?.backlog_count ?? 0) > posting.max_backlogs) {
        return false;
      }

      return true;
    }
    default:
      return false;
  }
}

function serializeAnnouncement(
  announcement: AnnouncementRecord,
  myReceipt?: {
    is_read: boolean;
    read_at: Date | null;
    has_consented: boolean;
    consented_at: Date | null;
  } | null
) {
  return {
    ...announcement,
    my_receipt: myReceipt
      ? {
          is_read: myReceipt.is_read,
          read_at: myReceipt.read_at,
          has_consented: myReceipt.has_consented,
          consented_at: myReceipt.consented_at,
        }
      : null,
  };
}

async function countRecipientsForAnnouncement(announcementId: string) {
  const announcement = await prisma.announcement.findUnique({
    where: { id: announcementId },
    select: {
      id: true,
      tenant_id: true,
      status: true,
      target_audience_type: true,
      target_institutes: true,
      target_courses: true,
      target_branches: true,
      target_departments: true,
      target_batches: true,
      target_semesters: true,
      target_posting_id: true,
    },
  });

  if (!announcement) throw new NotFoundError('Announcement');
  if (announcement.status !== 'published') return 0;

  const students = await prisma.student.findMany({
    where: { tenant_id: announcement.tenant_id },
    select: {
      id: true,
      institute: true,
      course: true,
      department: true,
      batch: true,
      academic_profile: {
        select: {
          cgpa: true,
          backlog_count: true,
          semester: true,
        },
      },
    },
  });

  const postingMap = await getPostingEligibilityMap(announcement.tenant_id, [announcement]);

  return students.filter((student) => studentMatchesAnnouncement(announcement, student, postingMap)).length;
}

async function syncAnnouncementMetrics(announcementId: string, syncRecipients: boolean) {
  const [readCount, consentCount, totalRecipients] = await Promise.all([
    prisma.announcementReceipt.count({
      where: {
        announcement_id: announcementId,
        is_read: true,
      },
    }),
    prisma.announcementReceipt.count({
      where: {
        announcement_id: announcementId,
        has_consented: true,
      },
    }),
    syncRecipients ? countRecipientsForAnnouncement(announcementId) : Promise.resolve<number | undefined>(undefined),
  ]);

  await prisma.announcement.update({
    where: { id: announcementId },
    data: {
      read_count: readCount,
      consent_count: consentCount,
      ...(typeof totalRecipients === 'number' ? { total_recipients: totalRecipients } : {}),
    },
  });
}

async function getAnnouncementDetailForAdmin(announcementId: string, tenantId: string) {
  const announcement = await prisma.announcement.findFirst({
    where: {
      id: announcementId,
      tenant_id: tenantId,
    },
    include: {
      ...announcementBaseInclude,
      receipts: {
        orderBy: [
          { read_at: 'desc' },
          { consented_at: 'desc' },
        ],
        include: {
          student: {
            select: {
              id: true,
              full_name: true,
              enrollment_number: true,
              department: true,
              batch: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!announcement) throw new NotFoundError('Announcement');
  return serializeAnnouncement(announcement);
}

// Whitelist of sortable columns → Prisma orderBy. Never inject sort_by raw into Prisma.
function getAnnouncementOrderBy(
  sortBy: string | undefined,
  sortOrder: 'asc' | 'desc' = 'asc',
  fallback: 'created_at' | 'published_at' = 'created_at',
): Prisma.AnnouncementOrderByWithRelationInput {
  switch (sortBy) {
    case 'title': return { title: sortOrder };
    case 'priority': return { priority: sortOrder };
    case 'status': return { status: sortOrder };
    case 'published_at': return { published_at: sortOrder };
    case 'created_at': return { created_at: sortOrder };
    default: return { [fallback]: sortOrder };
  }
}

export async function getAnnouncements(
  tenantId: string,
  filters: QueryAnnouncementsInput,
  user: Express.AuthUser,
  scope?: Express.ScopeFilters
) {
  const {
    page,
    limit,
    status,
    priority,
    sort_by,
    sort_order,
    institute,
    course,
    branch,
    date_from,
    date_to,
  } = filters;

  if (isAdmin(user)) {
    const where: Prisma.AnnouncementWhereInput = { tenant_id: tenantId };
    if (status) where.status = status;
    if (priority) where.priority = priority;
    // FILTER COUNTER EXPORT — match the announcement's targeting arrays; empty-target rows are "all students".
    if (institute) where.target_institutes = { has: institute };
    if (course) where.target_courses = { has: course };
    if (branch) where.target_branches = { has: branch };
    const dateRange = buildDateRangeCondition(date_from, date_to);
    if (dateRange) where.created_at = dateRange;

    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        ...buildPrismaQuery(page, limit),
        orderBy: getAnnouncementOrderBy(sort_by, sort_order, 'created_at'),
        include: announcementBaseInclude,
      }),
      prisma.announcement.count({ where }),
    ]);

    return {
      data: announcements.map((announcement) => serializeAnnouncement(announcement)),
      pagination: paginate(page, limit, total),
    };
  }

  const where: Prisma.AnnouncementWhereInput = {
    tenant_id: tenantId,
    status: 'published' as AnnouncementStatus,
  };

  if (priority) {
    where.priority = priority;
  }

  if (user.role === 'faculty_coordinator') {
    const [announcements, total] = await Promise.all([
      prisma.announcement.findMany({
        where,
        ...buildPrismaQuery(page, limit),
        orderBy: getAnnouncementOrderBy(sort_by, sort_order, 'published_at'),
        include: announcementBaseInclude,
      }),
      prisma.announcement.count({ where }),
    ]);

    return {
      data: announcements.map((announcement) => serializeAnnouncement(announcement)),
      pagination: paginate(page, limit, total),
    };
  }

  const student = await getStudentContext(user.id, scope);
  const announcements = await prisma.announcement.findMany({
    where,
    orderBy: getAnnouncementOrderBy(sort_by, sort_order, 'published_at'),
    include: {
      ...announcementBaseInclude,
      receipts: {
        where: { student_id: student.id },
        select: {
          is_read: true,
          read_at: true,
          has_consented: true,
          consented_at: true,
        },
      },
    },
  });

  const postingMap = await getPostingEligibilityMap(tenantId, announcements);
  const visibleAnnouncements = announcements
    .filter((announcement) => studentMatchesAnnouncement(announcement, student, postingMap))
    .map((announcement) => serializeAnnouncement(announcement, announcement.receipts[0] ?? null));

  const total = visibleAnnouncements.length;
  const start = (page - 1) * limit;
  const end = start + limit;

  return {
    data: visibleAnnouncements.slice(start, end),
    pagination: paginate(page, limit, total),
  };
}

export async function getAnnouncementById(
  announcementId: string,
  user: Express.AuthUser,
  scope?: Express.ScopeFilters
) {
  if (isAdmin(user)) {
    return getAnnouncementDetailForAdmin(announcementId, user.tenant_id);
  }

  if (user.role === 'faculty_coordinator') {
    const announcement = await prisma.announcement.findFirst({
      where: {
        id: announcementId,
        tenant_id: user.tenant_id,
        status: 'published',
      },
      include: announcementBaseInclude,
    });

    if (!announcement) throw new NotFoundError('Announcement');
    return serializeAnnouncement(announcement);
  }

  const student = await getStudentContext(user.id, scope);
  const announcement = await prisma.announcement.findFirst({
    where: {
      id: announcementId,
      tenant_id: user.tenant_id,
      status: 'published',
    },
    include: {
      ...announcementBaseInclude,
      receipts: {
        where: { student_id: student.id },
        select: {
          is_read: true,
          read_at: true,
          has_consented: true,
          consented_at: true,
        },
      },
    },
  });

  if (!announcement) throw new NotFoundError('Announcement');

  const postingMap = await getPostingEligibilityMap(user.tenant_id, [announcement]);
  if (!studentMatchesAnnouncement(announcement, student, postingMap)) {
    throw new NotFoundError('Announcement');
  }

  return serializeAnnouncement(announcement, announcement.receipts[0] ?? null);
}

/**
 * Semesters that actually exist among the students in the given Institute/Course/Branch scope.
 *
 * There is no course→semester mapping anywhere (not in the DB, not in the CRM feeds, not in Master
 * Data — `AcademicProfile.semester` is a bare Int), so the option list is DERIVED from student
 * records. That makes cross-selection impossible by construction: pick BCA and a B.Tech-only
 * semester simply never appears. Mirrors faculty.service.getStudentFilterOptions, and reuses the
 * same scope predicate as delivery so the picker and the recipient set can't disagree.
 */
export async function getAudienceSemesterOptions(tenantId: string, filters: QueryAudienceSemestersInput) {
  const students = await prisma.student.findMany({
    where: { tenant_id: tenantId },
    select: {
      institute: true,
      course: true,
      department: true,
      academic_profile: { select: { semester: true } },
    },
  });

  const targets: AnnouncementScopeTargets = {
    target_institutes: filters.institutes,
    target_courses: filters.courses,
    target_branches: filters.branches,
    target_semesters: [],
  };

  const countsBySemester = new Map<number, number>();
  let totalStudents = 0;

  for (const student of students) {
    const inScope = studentMatchesAnnouncementScope(targets, {
      institute: student.institute,
      course: student.course,
      department: student.department,
      semester: student.academic_profile?.semester ?? null,
    });

    if (!inScope) continue;

    totalStudents += 1;

    const semester = student.academic_profile?.semester;
    if (semester == null) continue;

    countsBySemester.set(semester, (countsBySemester.get(semester) ?? 0) + 1);
  }

  return {
    semesters: Array.from(countsBySemester.entries())
      .sort(([a], [b]) => a - b)
      .map(([semester, students_count]) => ({ semester: String(semester), students: students_count })),
    total_students: totalStudents,
  };
}

export async function createAnnouncement(tenantId: string, data: CreateAnnouncementInput, userId: string) {
  const announcement = await prisma.announcement.create({
    data: {
      tenant_id: tenantId,
      title: data.title,
      content: data.content,
      priority: data.priority as AnnouncementPriority,
      target_audience_type: data.target_audience_type as TargetAudienceType,
      target_institutes: data.target_institutes,
      target_courses: data.target_courses,
      target_branches: data.target_branches,
      target_batches: data.target_batches,
      target_departments: data.target_departments,
      target_semesters: data.target_semesters,
      target_posting_id: data.target_posting_id,
      requires_consent: data.requires_consent,
      attachment_url: data.attachment_url,
      attachment_name: data.attachment_name,
      attachment_mime_type: data.attachment_mime_type,
      attachment_size: data.attachment_size,
      linked_circular_id: data.linked_circular_id,
      created_by: userId,
      total_recipients: 0,
      read_count: 0,
      consent_count: 0,
    },
  });

  return getAnnouncementDetailForAdmin(announcement.id, tenantId);
}

export async function updateAnnouncement(announcementId: string, data: UpdateAnnouncementInput, tenantId: string) {
  const existing = await prisma.announcement.findFirst({
    where: {
      id: announcementId,
      tenant_id: tenantId,
    },
  });

  if (!existing) throw new NotFoundError('Announcement');
  if (existing.status === 'archived') {
    throw new BusinessRuleError('Cannot update archived announcement', 'ANNOUNCEMENT_ARCHIVED');
  }

  await prisma.announcement.update({
    where: { id: announcementId },
    data: {
      ...data,
      priority: data.priority as AnnouncementPriority | undefined,
      target_audience_type: data.target_audience_type as TargetAudienceType | undefined,
    },
  });

  if (existing.status === 'published') {
    await syncAnnouncementMetrics(announcementId, true);
  }

  return getAnnouncementDetailForAdmin(announcementId, tenantId);
}

export async function publishAnnouncement(announcementId: string, tenantId: string) {
  const existing = await prisma.announcement.findFirst({
    where: {
      id: announcementId,
      tenant_id: tenantId,
    },
  });

  if (!existing) throw new NotFoundError('Announcement');
  // Both `draft` (first publish) and `archived` (republish) are valid inputs — the update below
  // already clears archived_at. Only an already-published announcement is rejected.
  if (existing.status === 'published') {
    throw new BusinessRuleError('This announcement is already published', 'INVALID_ANNOUNCEMENT_STATUS');
  }

  await prisma.announcement.update({
    where: { id: announcementId },
    data: {
      status: 'published' as AnnouncementStatus,
      published_at: new Date(),
      archived_at: null,
    },
  });

  await syncAnnouncementMetrics(announcementId, true);

  try {
    // Tenant-wide broadcast for the first pass — refine to use the
    // target_* columns when we have appetite for the join.
    const tenantStudents = await prisma.user.findMany({
      where: { tenant_id: tenantId, role: 'student', is_active: true },
      select: { id: true },
    });
    if (tenantStudents.length > 0) {
      void notifyManyUsers({
        tenantId,
        type: 'announcement',
        title: existing.title,
        description: existing.content.slice(0, 200),
        priority: 'medium',
        actionUrl: '/announcements',
        payload: { announcement_id: announcementId },
        userIds: tenantStudents.map((u) => u.id),
      });
    }
  } catch (err) {
    // swallow
  }

  return getAnnouncementDetailForAdmin(announcementId, tenantId);
}

export async function archiveAnnouncement(announcementId: string, tenantId: string) {
  const existing = await prisma.announcement.findFirst({
    where: {
      id: announcementId,
      tenant_id: tenantId,
    },
  });

  if (!existing) throw new NotFoundError('Announcement');

  await prisma.announcement.update({
    where: { id: announcementId },
    data: {
      status: 'archived' as AnnouncementStatus,
      archived_at: new Date(),
    },
  });

  await syncAnnouncementMetrics(announcementId, false);

  return getAnnouncementDetailForAdmin(announcementId, tenantId);
}

async function getAccessibleStudentAnnouncement(
  announcementId: string,
  user: Express.AuthUser,
  scope?: Express.ScopeFilters
) {
  const student = await getStudentContext(user.id, scope);
  const announcement = await prisma.announcement.findFirst({
    where: {
      id: announcementId,
      tenant_id: user.tenant_id,
      status: 'published',
    },
    select: {
      id: true,
      tenant_id: true,
      status: true,
      requires_consent: true,
      target_audience_type: true,
      target_institutes: true,
      target_courses: true,
      target_branches: true,
      target_departments: true,
      target_batches: true,
      target_semesters: true,
      target_posting_id: true,
    },
  });

  if (!announcement) throw new NotFoundError('Announcement');

  const postingMap = await getPostingEligibilityMap(user.tenant_id, [announcement]);
  if (!studentMatchesAnnouncement(announcement, student, postingMap)) {
    throw new NotFoundError('Announcement');
  }

  return { announcement, student };
}

export async function markRead(
  announcementId: string,
  user: Express.AuthUser,
  scope?: Express.ScopeFilters
) {
  const { student } = await getAccessibleStudentAnnouncement(announcementId, user, scope);

  const receipt = await prisma.announcementReceipt.upsert({
    where: {
      announcement_id_student_id: {
        announcement_id: announcementId,
        student_id: student.id,
      },
    },
    create: {
      announcement_id: announcementId,
      student_id: student.id,
      is_read: true,
      read_at: new Date(),
    },
    update: {
      is_read: true,
      read_at: new Date(),
    },
  });

  await syncAnnouncementMetrics(announcementId, false);
  return receipt;
}

export async function giveConsent(
  announcementId: string,
  user: Express.AuthUser,
  scope?: Express.ScopeFilters
) {
  const { announcement, student } = await getAccessibleStudentAnnouncement(announcementId, user, scope);

  if (!announcement.requires_consent) {
    throw new BusinessRuleError(
      'This announcement does not require consent',
      'ANNOUNCEMENT_CONSENT_NOT_REQUIRED'
    );
  }

  const receipt = await prisma.announcementReceipt.upsert({
    where: {
      announcement_id_student_id: {
        announcement_id: announcementId,
        student_id: student.id,
      },
    },
    create: {
      announcement_id: announcementId,
      student_id: student.id,
      is_read: true,
      read_at: new Date(),
      has_consented: true,
      consented_at: new Date(),
    },
    update: {
      has_consented: true,
      consented_at: new Date(),
      is_read: true,
      read_at: new Date(),
    },
  });

  await syncAnnouncementMetrics(announcementId, false);
  return receipt;
}
