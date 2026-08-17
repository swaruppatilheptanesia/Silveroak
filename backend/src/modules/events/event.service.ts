import { prisma } from '../../config/database';
import { NotFoundError, BusinessRuleError, AuthorizationError } from '../../shared/errors';
import { paginate, buildPrismaQuery } from '../../shared/utils/pagination';
import { logger } from '../../config/logger';
import type {
  CreateEventInput,
  UpdateEventInput,
  QueryEventsInput,
  CreatePanelInput,
  AssignStudentsInput,
  MarkAttendanceInput,
  UpdateEventStatusInput,
} from './event.schema';
import { EventStatus, AttendanceStatus, Prisma, ApplicationStage } from '@prisma/client';
import { buildDateRangeCondition } from '../../shared/utils/student-scope-filter';
import { createNotification, notifyManyUsers } from '../notifications/notification.service';

type EventAudienceSource = {
  company_id?: string | null;
  posting_ids?: string[] | null;
  stage?: ApplicationStage | null;
};

/**
 * Resolves an event's target audience to the distinct students who APPLIED to the
 * selected role(s) (posting_ids). When no specific role is chosen, falls back to
 * applicants across the selected company's postings. Returns [] when neither is
 * available (preserving the manual-assignment default). The Event → student link is
 * the Application table (Posting Type → Company → Role), NOT the broad
 * institute/course/branch posting-type scope.
 */
async function resolveApplicantStudentIds(tenantId: string, src: EventAudienceSource) {
  const where: Record<string, unknown> = { tenant_id: tenantId };
  if (src.posting_ids && src.posting_ids.length > 0) {
    where.posting_id = { in: src.posting_ids };
  } else if (src.company_id) {
    where.posting = { is: { company_id: src.company_id } };
  } else {
    return [];
  }

  // Application-pipeline-stage filter: only students currently at this stage on the linked
  // posting(s) are eligible. Null/undefined stage = all applicants ("All").
  if (src.stage) {
    where.current_stage = src.stage;
  }

  const apps = await prisma.application.findMany({
    where,
    select: { student_id: true },
    distinct: ['student_id'],
  });

  return apps.map((a) => a.student_id);
}

/**
 * Live count of students eligible for an event = distinct students whose CURRENT application
 * stage on a linked posting matches the event's configured stage (null stage = all applicants).
 * No linked postings → 0. Batched across a page via Promise.all in the callers.
 */
async function countEligibleStudents(
  tenantId: string,
  postingIds: string[],
  stage: ApplicationStage | null,
): Promise<number> {
  if (!postingIds || postingIds.length === 0) return 0;
  const where: Record<string, unknown> = {
    tenant_id: tenantId,
    posting_id: { in: postingIds },
  };
  if (stage) where.current_stage = stage;
  const rows = await prisma.application.findMany({
    where,
    select: { student_id: true },
    distinct: ['student_id'],
  });
  return rows.length;
}

/** Add-only assignment of pipeline students (idempotent; no panel, no notify — publish notifies). */
async function assignPipelineStudents(eventId: string, studentIds: string[]) {
  if (studentIds.length === 0) return;
  await prisma.eventStudent.createMany({
    data: studentIds.map((student_id) => ({ event_id: eventId, student_id })),
    skipDuplicates: true,
  });
}

function normalizeEventTypeValue(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

/** Ensures the submitted event type matches an active event_type master for the tenant. */
async function assertValidEventType(tenantId: string, value: string) {
  const match = await prisma.masterOption.findFirst({
    where: {
      tenant_id: tenantId,
      category: 'event_type',
      is_active: true,
      normalized_value: normalizeEventTypeValue(value),
    },
    select: { id: true },
  });
  if (!match) {
    throw new BusinessRuleError('Invalid event type', 'INVALID_EVENT_TYPE');
  }
}

function applyVisibilityScope(
  where: Record<string, unknown>,
  user: Express.AuthUser,
  scope?: Express.ScopeFilters,
  filters?: QueryEventsInput
) {
  const isAdmin = user.role === 'tpo_admin' || user.role === 'tpo_employee';

  if (isAdmin) {
    if (filters?.status) where.status = filters.status;
    return;
  }

  if (filters?.status === 'draft') {
    where.id = '__no_match__';
    return;
  }

  if (filters?.status) {
    where.status = filters.status;
  } else {
    where.status = { not: 'draft' };
  }

  if (user.role === 'student') {
    where.assigned_students = {
      some: { student_id: scope?.student_id ?? '__no_match__' },
    };
    return;
  }

  if (user.role === 'recruiter') {
    where.company_id = scope?.company_id ?? '__no_match__';
    return;
  }

  if (user.role === 'faculty_coordinator') {
    // Scope by the faculty's USER id (identity link) — the legacy name array is display-only and
    // an exact-name match was unreliable (titles/spacing). Legacy events with no ids won't match
    // until re-saved through the coordinator picker.
    where.faculty_coordinator_ids = { has: user.id };
  }
}

/**
 * Attaches the full `postings: [{id,title,type}]` array (resolved from `posting_ids`) to each event,
 * and keeps the legacy single `posting` (mirror = first linked posting) flattened for back-compat.
 * One batched query over the union of all events' `posting_ids`.
 */
async function attachEventPostings<T extends { posting_ids?: string[]; posting?: unknown }>(
  events: T[]
) {
  const allIds = Array.from(new Set(events.flatMap((event) => event.posting_ids ?? [])));
  const rows = allIds.length
    ? await prisma.posting.findMany({
        where: { id: { in: allIds } },
        select: { id: true, title: true, posting_type_master: { select: { value: true } } },
      })
    : [];
  const byId = new Map(
    rows.map((row) => [row.id, { id: row.id, title: row.title, type: row.posting_type_master?.value ?? '' }])
  );

  return events.map((event) => {
    const legacyPosting = event.posting as
      | { id: string; title: string; posting_type_master?: { value?: string } | null }
      | null
      | undefined;
    return {
      ...event,
      posting: legacyPosting
        ? { ...legacyPosting, type: legacyPosting.posting_type_master?.value ?? '' }
        : null,
      postings: (event.posting_ids ?? [])
        .map((id) => byId.get(id))
        .filter((posting): posting is { id: string; title: string; type: string } => Boolean(posting)),
    };
  });
}

// Whitelist of sortable columns → Prisma orderBy. Never inject sort_by raw into Prisma.
function getEventOrderBy(sortBy?: string, sortOrder: 'asc' | 'desc' = 'asc'): Prisma.EventOrderByWithRelationInput {
  switch (sortBy) {
    case 'title': return { title: sortOrder };
    case 'date': return { date: sortOrder };
    case 'status': return { status: sortOrder };
    case 'panels': return { panels: { _count: sortOrder } };
    case 'students': return { assigned_students: { _count: sortOrder } };
    default: return { date: sortOrder };
  }
}

export async function getEvents(
  tenantId: string,
  filters: QueryEventsInput,
  user: Express.AuthUser,
  scope?: Express.ScopeFilters
) {
  const { page, limit, type, posting_type_master_id, company_id, sort_by, sort_order, institute, course, branch, date_from, date_to } = filters;
  const where: Record<string, unknown> = { tenant_id: tenantId };

  applyVisibilityScope(where, user, scope, filters);
  if (type) where.type = type;
  // FILTER COUNTER EXPORT — target-array scope + event-date range (admin/tpo screens).
  if (institute) where.target_institutes = { has: institute };
  if (course) where.target_courses = { has: course };
  if (branch) where.target_branches = { has: branch };
  const eventDateRange = buildDateRangeCondition(date_from, date_to);
  if (eventDateRange) where.date = eventDateRange;
  if (posting_type_master_id) {
    where.posting = {
      is: {
        posting_type_master_id,
      },
    };
  }
  if (company_id && (user.role === 'tpo_admin' || user.role === 'tpo_employee')) {
    where.company_id = company_id;
  } else if (company_id && user.role === 'recruiter' && company_id === scope?.company_id) {
    where.company_id = company_id;
  }

  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      ...buildPrismaQuery(page, limit),
      orderBy: getEventOrderBy(sort_by, sort_order),
      include: {
        company: { select: { id: true, name: true } },
        posting: { select: { id: true, title: true, posting_type_master: { select: { value: true } } } },
        _count: { select: { panels: true, assigned_students: true } },
      },
    }),
    prisma.event.count({ where }),
  ]);

  const withPostings = await attachEventPostings(events);
  // Live "Eligible Student Count" per event (distinct students matching linked postings + stage).
  const eligibleCounts = await Promise.all(
    events.map((event) =>
      countEligibleStudents(tenantId, event.posting_ids ?? [], event.application_stage ?? null)
    )
  );
  const data = withPostings.map((event, index) => ({
    ...event,
    eligible_student_count: eligibleCounts[index] ?? 0,
  }));

  return {
    data,
    pagination: paginate(page, limit, total),
  };
}

export async function getEventById(
  eventId: string,
  user: Express.AuthUser,
  scope?: Express.ScopeFilters
) {
  const where: Record<string, unknown> = {
    id: eventId,
    tenant_id: user.tenant_id,
  };

  applyVisibilityScope(where, user, scope);

  const assignedStudentWhere =
    user.role === 'student'
      ? { student_id: scope?.student_id ?? '__no_match__' }
      : undefined;

  const event = await prisma.event.findFirst({
    where,
    include: {
      company: { select: { id: true, name: true } },
      posting: { select: { id: true, title: true, posting_type_master: { select: { value: true } } } },
      panels: true,
      assigned_students: {
        where: assignedStudentWhere,
        include: {
          student: { select: { id: true, full_name: true, enrollment_number: true, department: true } },
        },
      },
    },
  });

  if (!event) throw new NotFoundError('Event');
  const [mapped] = await attachEventPostings([event]);
  return mapped;
}

export async function createEvent(tenantId: string, data: CreateEventInput, userId?: string) {
  const company = await prisma.company.findUnique({ where: { id: data.company_id } });
  if (!company) throw new NotFoundError('Company');

  await assertValidEventType(tenantId, data.type);

  const postingIds = data.posting_ids ?? [];

  const event = await prisma.event.create({
    data: {
      tenant_id: tenantId,
      company_id: data.company_id,
      posting_ids: postingIds,
      // Legacy mirror = first linked posting (keeps single-`posting` consumers working).
      posting_id: postingIds[0] ?? data.posting_id ?? null,
      title: data.title,
      type: data.type,
      date: data.date,
      start_time: data.start_time,
      end_time: data.end_time,
      venue: data.venue,
      reporting_time: data.reporting_time,
      dress_code: data.dress_code,
      instructions: data.instructions,
      documents_required: data.documents_required,
      faculty_coordinators: data.faculty_coordinators,
      faculty_coordinator_ids: data.faculty_coordinator_ids,
      target_institutes: data.target_institutes,
      target_courses: data.target_courses,
      target_branches: data.target_branches,
      application_stage: data.application_stage ?? null,
      created_by: userId,
    },
  });

  // Best-effort audience auto-assignment (applicants to the selected company/role[s] at the
  // configured pipeline stage) — must never break event creation.
  try {
    const studentIds = await resolveApplicantStudentIds(tenantId, {
      company_id: data.company_id,
      posting_ids: postingIds,
      stage: data.application_stage ?? null,
    });
    await assignPipelineStudents(event.id, studentIds);
  } catch (err) {
    logger.error({ err }, 'Event audience auto-assignment failed (create)');
  }

  return event;
}

export async function updateEvent(eventId: string, data: UpdateEventInput) {
  const existing = await prisma.event.findUnique({ where: { id: eventId } });
  if (!existing) throw new NotFoundError('Event');

  if (['completed', 'cancelled'].includes(existing.status)) {
    throw new BusinessRuleError('Cannot update a completed or cancelled event', 'EVENT_FINALIZED');
  }

  if (data.type !== undefined) {
    await assertValidEventType(existing.tenant_id, data.type);
  }

  // Keep the legacy `posting_id` mirror in sync with the multi-select `posting_ids`.
  const updateData: UpdateEventInput & { posting_id?: string | null } = { ...data };
  if (data.posting_ids !== undefined) {
    updateData.posting_id = data.posting_ids[0] ?? null;
  }

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: updateData,
  });

  // Re-resolve the audience add-only when the company, linked role(s), or pipeline stage change
  // (never removes existing assignments / attendance / manual assignments).
  const audienceTouched =
    data.posting_ids !== undefined ||
    data.company_id !== undefined ||
    data.application_stage !== undefined;
  if (audienceTouched) {
    try {
      const studentIds = await resolveApplicantStudentIds(existing.tenant_id, {
        company_id: updated.company_id,
        posting_ids: updated.posting_ids,
        stage: updated.application_stage,
      });
      await assignPipelineStudents(eventId, studentIds);
    } catch (err) {
      logger.error({ err }, 'Event audience auto-assignment failed (update)');
    }
  }

  return updated;
}

export async function updateEventStatus(eventId: string, data: UpdateEventStatusInput, userId?: string) {
  const existing = await prisma.event.findUnique({ where: { id: eventId } });
  if (!existing) throw new NotFoundError('Event');

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: { status: data.status as EventStatus },
  });

  if (userId) {
    prisma.auditLog.create({
      data: {
        tenant_id: existing.tenant_id,
        user_id: userId,
        action: `event_${data.status}`,
        module: 'events',
        target_type: 'events',
        target_id: eventId,
        details: `Event status changed to ${data.status}`,
      },
    }).catch(err => logger.error({ err }, 'Audit log failed'));
  }

  if (data.status === 'published') {
    try {
      const assignedStudents = await prisma.eventStudent.findMany({
        where: { event_id: eventId },
        select: { student: { select: { user_id: true } } },
      });
      const recipientIds = assignedStudents
        .map((row) => row.student?.user_id)
        .filter((id): id is string => Boolean(id));
      if (recipientIds.length > 0) {
        void notifyManyUsers({
          tenantId: existing.tenant_id,
          type: 'event',
          title: `${existing.title} has been published`,
          description: `On ${existing.date.toISOString().slice(0, 10)} at ${existing.venue ?? 'TBA'}`,
          priority: 'medium',
          actionUrl: '/drives',
          payload: { event_id: eventId },
          userIds: recipientIds,
        });
      }
    } catch (err) {
      // swallow
    }
  }

  return updated;
}

export async function createPanel(eventId: string, data: CreatePanelInput) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new NotFoundError('Event');

  return prisma.eventPanel.create({
    data: {
      event_id: eventId,
      panel_name: data.panel_name,
      room: data.room,
      start_time: data.start_time,
      end_time: data.end_time,
      recruiters: data.recruiters,
    },
  });
}

export async function assignStudents(eventId: string, data: AssignStudentsInput) {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new NotFoundError('Event');

  const results = [];
  for (const studentId of data.student_ids) {
    try {
      const assignment = await prisma.eventStudent.upsert({
        where: { event_id_student_id: { event_id: eventId, student_id: studentId } },
        create: {
          event_id: eventId,
          student_id: studentId,
          panel_id: data.panel_id,
        },
        update: { panel_id: data.panel_id },
      });
      results.push({ student_id: studentId, status: 'assigned', id: assignment.id });
    } catch (err: any) {
      results.push({ student_id: studentId, status: 'error', message: err.message });
    }
  }

  try {
    const assignedIds = results.filter((r) => r.status === 'assigned').map((r) => r.student_id);
    if (assignedIds.length > 0) {
      const students = await prisma.student.findMany({
        where: { id: { in: assignedIds } },
        select: { user_id: true },
      });
      const recipientIds = students.map((s) => s.user_id).filter((id): id is string => Boolean(id));
      if (recipientIds.length > 0) {
        void notifyManyUsers({
          tenantId: event.tenant_id,
          type: 'event',
          title: `You've been added to ${event.title}`,
          description: `On ${event.date.toISOString().slice(0, 10)} at ${event.venue ?? 'TBA'}`,
          priority: 'medium',
          actionUrl: '/drives',
          payload: { event_id: eventId },
          userIds: recipientIds,
        });
      }
    }
  } catch (err) {
    // swallow
  }

  return results;
}

export async function markAttendance(
  eventId: string,
  data: MarkAttendanceInput,
  user: Express.AuthUser
) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, tenant_id: user.tenant_id },
    select: { id: true, faculty_coordinator_ids: true },
  });
  if (!event) throw new NotFoundError('Event');

  if (user.role === 'faculty_coordinator' && !event.faculty_coordinator_ids.includes(user.id)) {
    throw new AuthorizationError(
      'You are not assigned as a faculty coordinator for this event',
      'ROLE_NOT_ALLOWED'
    );
  }

  const assignment = await prisma.eventStudent.findUnique({
    where: { event_id_student_id: { event_id: eventId, student_id: data.student_id } },
  });
  if (!assignment) throw new NotFoundError('Student assignment');

  const updated = await prisma.eventStudent.update({
    where: { id: assignment.id },
    data: {
      attendance: data.attendance as AttendanceStatus,
      marked_by: user.id,
      marked_at: new Date(),
    },
  });

  try {
    const studentRow = await prisma.student.findUnique({
      where: { id: data.student_id },
      select: { user_id: true },
    });
    if (studentRow?.user_id) {
      void createNotification({
        userId: studentRow.user_id,
        tenantId: user.tenant_id,
        type: 'event',
        title: 'Your attendance was recorded',
        description: `Marked as ${data.attendance}`,
        priority: 'low',
        actionUrl: '/drives',
        payload: { event_id: eventId, attendance: data.attendance },
      });
    }
  } catch (err) {
    // swallow
  }

  return updated;
}
