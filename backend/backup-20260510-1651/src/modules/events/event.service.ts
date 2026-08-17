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
import { EventType, EventStatus, AttendanceStatus } from '@prisma/client';

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
    where.faculty_coordinators = { has: user.name };
  }
}

export async function getEvents(
  tenantId: string,
  filters: QueryEventsInput,
  user: Express.AuthUser,
  scope?: Express.ScopeFilters
) {
  const { page, limit, type, posting_type, company_id, sort_by, sort_order } = filters;
  const where: Record<string, unknown> = { tenant_id: tenantId };

  applyVisibilityScope(where, user, scope, filters);
  if (type) where.type = type;
  if (posting_type) {
    where.posting = {
      is: {
        type: posting_type,
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
      orderBy: { [sort_by || 'date']: sort_order || 'desc' },
      include: {
        company: { select: { id: true, name: true } },
        posting: { select: { id: true, title: true, type: true } },
        _count: { select: { panels: true, assigned_students: true } },
      },
    }),
    prisma.event.count({ where }),
  ]);

  return { data: events, pagination: paginate(page, limit, total) };
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
      posting: { select: { id: true, title: true, type: true } },
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
  return event;
}

export async function createEvent(tenantId: string, data: CreateEventInput, userId?: string) {
  const company = await prisma.company.findUnique({ where: { id: data.company_id } });
  if (!company) throw new NotFoundError('Company');

  return prisma.event.create({
    data: {
      tenant_id: tenantId,
      company_id: data.company_id,
      posting_id: data.posting_id,
      title: data.title,
      type: data.type as EventType,
      date: data.date,
      start_time: data.start_time,
      end_time: data.end_time,
      venue: data.venue,
      reporting_time: data.reporting_time,
      dress_code: data.dress_code,
      instructions: data.instructions,
      documents_required: data.documents_required,
      faculty_coordinators: data.faculty_coordinators,
      created_by: userId,
    },
  });
}

export async function updateEvent(eventId: string, data: UpdateEventInput) {
  const existing = await prisma.event.findUnique({ where: { id: eventId } });
  if (!existing) throw new NotFoundError('Event');

  if (['completed', 'cancelled'].includes(existing.status)) {
    throw new BusinessRuleError('Cannot update a completed or cancelled event', 'EVENT_FINALIZED');
  }

  return prisma.event.update({
    where: { id: eventId },
    data: {
      ...data,
      type: data.type as EventType | undefined,
    },
  });
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

  return results;
}

export async function markAttendance(
  eventId: string,
  data: MarkAttendanceInput,
  user: Express.AuthUser
) {
  const event = await prisma.event.findFirst({
    where: { id: eventId, tenant_id: user.tenant_id },
    select: { id: true, faculty_coordinators: true },
  });
  if (!event) throw new NotFoundError('Event');

  if (user.role === 'faculty_coordinator' && !event.faculty_coordinators.includes(user.name)) {
    throw new AuthorizationError(
      'You are not assigned as a faculty coordinator for this event',
      'ROLE_NOT_ALLOWED'
    );
  }

  const assignment = await prisma.eventStudent.findUnique({
    where: { event_id_student_id: { event_id: eventId, student_id: data.student_id } },
  });
  if (!assignment) throw new NotFoundError('Student assignment');

  return prisma.eventStudent.update({
    where: { id: assignment.id },
    data: {
      attendance: data.attendance as AttendanceStatus,
      marked_by: user.id,
      marked_at: new Date(),
    },
  });
}
