import { prisma } from '../../config/database';
import { NotFoundError, BusinessRuleError } from '../../shared/errors';
import { paginate, buildPrismaQuery } from '../../shared/utils/pagination';
import { logger } from '../../config/logger';
import { createOfferNotifications, createNotification, notifyTpoAudience } from '../notifications/notification.service';
import type {
  CreateOfferInput,
  RejectOfferInput,
  StudentRejectOfferInput,
  JoiningStatusInput,
  ComplianceInput,
  QueryOffersInput,
} from './offer.schema';
import { OfferType, OfferStatus, JoiningStatus, ComplianceStatus, Prisma } from '@prisma/client';
import { facultyAssignmentRawValues } from '../../shared/utils/faculty-scope';
import { buildStudentScopeConditions, buildDateRangeCondition } from '../../shared/utils/student-scope-filter';

function isOfferAdmin(user: Express.AuthUser) {
  return user.role === 'tpo_admin' || user.role === 'tpo_employee' || user.role === 'super_admin';
}

// Faculty offers are scoped to the faculty's assigned students. Honours the
// institute/course/branch assignment arrays (a target program value matches the student's
// department OR course); falls back to no-match when nothing is assigned. Exact-match (keeps
// DB pagination) — broader than the old single-department filter.
function facultyStudentWhere(user: Express.AuthUser): Prisma.StudentWhereInput {
  const { programValues, institutes } = facultyAssignmentRawValues(user);
  if (programValues.length === 0 && institutes.length === 0) {
    return { id: '__no_match__' };
  }
  const and: Prisma.StudentWhereInput[] = [];
  if (programValues.length > 0) {
    and.push({ OR: [{ department: { in: programValues } }, { course: { in: programValues } }] });
  }
  if (institutes.length > 0) {
    and.push({ institute: { in: institutes } });
  }
  return { AND: and };
}

function buildOfferWhere(
  tenantId: string,
  filters: Partial<QueryOffersInput>,
  user: Express.AuthUser,
  scope?: Express.ScopeFilters,
): Record<string, unknown> {
  const {
    status, type, posting_type_master_id, company_id, student_id, search,
    institute, course, branch, semester, academic_year, date_from, date_to,
  } = filters;
  const where: Record<string, unknown> = { tenant_id: tenantId };
  // Accumulate all student-relation conditions (faculty scope + admin scope filters) into one AND.
  const studentAnd: Prisma.StudentWhereInput[] = [];

  if (user.role === 'faculty_coordinator') {
    studentAnd.push(facultyStudentWhere(user));
  }

  if (status) where.status = status;
  if (type) where.type = type;
  if (posting_type_master_id) where.posting = { is: { posting_type_master_id } };
  if (company_id) where.company_id = company_id;

  if (student_id) {
    if (user.role === 'faculty_coordinator') {
      studentAnd.push({ id: student_id });
    } else if (isOfferAdmin(user)) {
      where.student_id = student_id;
    }
  }

  studentAnd.push(...buildStudentScopeConditions({ institute, course, branch, semester, academic_year }));
  if (studentAnd.length > 0) where.student = { is: { AND: studentAnd } };

  const dateRange = buildDateRangeCondition(date_from, date_to);
  if (dateRange) where.offer_date = dateRange;

  if (search) {
    where.OR = [
      { role: { contains: search, mode: 'insensitive' } },
      { company: { is: { name: { contains: search, mode: 'insensitive' } } } },
      { student: { is: { full_name: { contains: search, mode: 'insensitive' } } } },
      { student: { is: { enrollment_number: { contains: search, mode: 'insensitive' } } } },
    ];
  }

  return where;
}

// Whitelist of sortable columns → Prisma orderBy. Never inject sort_by raw into Prisma.
function getOfferOrderBy(sortBy?: string, sortOrder: 'asc' | 'desc' = 'asc'): Prisma.OfferOrderByWithRelationInput {
  switch (sortBy) {
    case 'student': return { student: { full_name: sortOrder } };
    case 'company': return { company: { name: sortOrder } };
    case 'role': return { role: sortOrder };
    case 'status': return { status: sortOrder };
    case 'joining': return { joining_status: sortOrder };
    case 'offer_date': return { offer_date: sortOrder };
    case 'created_at': return { created_at: sortOrder };
    default: return { offer_date: sortOrder };
  }
}

export async function getOffers(
  tenantId: string,
  filters: QueryOffersInput,
  user: Express.AuthUser,
  scope?: Express.ScopeFilters,
) {
  const { page, limit, sort_by, sort_order } = filters;
  const where = buildOfferWhere(tenantId, filters, user, scope);

  const [offers, total] = await Promise.all([
    prisma.offer.findMany({
      where,
      ...buildPrismaQuery(page, limit),
      orderBy: getOfferOrderBy(sort_by, sort_order),
      include: {
        student: { select: { id: true, full_name: true, enrollment_number: true, department: true, batch: true, institute: true, course: true, current_semester: true } },
        company: { select: { id: true, name: true } },
        posting: { select: { id: true, title: true, posting_type_master: { select: { value: true } } } },
      },
    }),
    prisma.offer.count({ where }),
  ]);

  return {
    data: offers.map((offer) => ({
      ...offer,
      posting: offer.posting ? { ...offer.posting, type: offer.posting.posting_type_master?.value ?? '' } : null,
    })),
    pagination: paginate(page, limit, total),
  };
}

export async function getOfferById(
  offerId: string,
  user: Express.AuthUser,
  scope?: Express.ScopeFilters,
) {
  const offer = await prisma.offer.findFirst({
    where: {
      id: offerId,
      ...buildOfferWhere(user.tenant_id, {}, user, scope),
    },
    include: {
      student: { select: { id: true, full_name: true, enrollment_number: true, department: true, batch: true } },
      company: { select: { id: true, name: true } },
      posting: { select: { id: true, title: true, posting_type_master: { select: { value: true } } } },
      audit_trail: { orderBy: { performed_at: 'desc' } },
    },
  });

  if (!offer) throw new NotFoundError('Offer');
  return {
    ...offer,
    posting: offer.posting ? { ...offer.posting, type: offer.posting.posting_type_master?.value ?? '' } : null,
  };
}

export async function getMyOffers(userId: string) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');

  const offers = await prisma.offer.findMany({
    where: { student_id: student.id },
    include: {
      company: { select: { name: true } },
      posting: { select: { title: true, posting_type_master: { select: { value: true } } } },
    },
    orderBy: { created_at: 'desc' },
  });
  return offers.map((offer) => ({
    ...offer,
    posting: offer.posting ? { ...offer.posting, type: offer.posting.posting_type_master?.value ?? '' } : null,
  }));
}

export async function createOffer(tenantId: string, data: CreateOfferInput, userId: string) {
  const offer = await prisma.offer.create({
    data: {
      tenant_id: tenantId,
      student_id: data.student_id,
      posting_id: data.posting_id,
      company_id: data.company_id,
      type: data.type as OfferType,
      role: data.role,
      ctc: data.ctc,
      stipend: data.stipend,
      location: data.location,
      offer_date: data.offer_date,
      status: 'pending_student_action' as OfferStatus,
      is_locked: true,
      applications_blocked: true,
      created_by: userId,
    },
  });

  await prisma.offerAudit.create({
    data: {
      offer_id: offer.id,
      action: 'released',
      performed_by: userId,
      details: `Offer released to student for role: ${data.role}`,
    },
  });

  try {
    await createOfferNotifications({
      tenantId,
      offerId: offer.id,
      studentId: data.student_id,
      postingId: data.posting_id,
      companyId: data.company_id,
      role: data.role,
      offerType: data.type as OfferType,
    });
  } catch (err) {
    logger.error({ err, offerId: offer.id }, 'Failed to create offer notifications');
  }

  return offer;
}

export async function acceptOffer(userId: string, offerId: string) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');

  const offer = await prisma.offer.findFirst({
    where: { id: offerId, student_id: student.id },
  });
  if (!offer) throw new NotFoundError('Offer');

  if (offer.status !== 'pending_student_action') {
    throw new BusinessRuleError('Offer is not pending', 'OFFER_NOT_PENDING');
  }

  const updated = await prisma.offer.update({
    where: { id: offerId },
    data: {
      status: 'accepted' as OfferStatus,
      accepted_at: new Date(),
      is_locked: true,
    },
  });

  await prisma.offerAudit.create({
    data: {
      offer_id: offerId,
      action: 'accepted',
      performed_by: userId,
      details: 'Student accepted the offer',
    },
  });

  void notifyTpoAudience({
    tenantId: offer.tenant_id,
    type: 'offer',
    title: `${student.full_name} accepted an offer`,
    description: `Role: ${offer.role}`,
    priority: 'high',
    actionUrl: `/admin/offers`,
    payload: { offer_id: offerId, student_id: student.id },
  });

  return updated;
}

export async function rejectOfferByStudent(userId: string, offerId: string, data: StudentRejectOfferInput) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');

  const offer = await prisma.offer.findFirst({
    where: { id: offerId, student_id: student.id },
  });
  if (!offer) throw new NotFoundError('Offer');

  if (offer.status !== 'pending_student_action') {
    throw new BusinessRuleError('Offer is not pending', 'OFFER_NOT_PENDING');
  }

  const reason = data.reason?.trim();

  const updated = await prisma.offer.update({
    where: { id: offerId },
    data: {
      status: 'rejected_by_student' as OfferStatus,
      rejected_at: new Date(),
      rejected_by: userId,
      rejection_reason: 'student_declined',
      rejection_remarks: reason || null,
      is_locked: true,
      applications_blocked: true,
    },
  });

  await prisma.offerAudit.create({
    data: {
      offer_id: offerId,
      action: 'rejected_by_student',
      performed_by: userId,
      details: reason ? `Student declined the offer. Reason: ${reason}` : 'Student declined the offer.',
    },
  });

  void notifyTpoAudience({
    tenantId: offer.tenant_id,
    type: 'offer',
    title: `${student.full_name} declined an offer`,
    description: reason ? `Reason: ${reason}` : `Role: ${offer.role}`,
    priority: 'high',
    actionUrl: `/admin/offers`,
    payload: { offer_id: offerId, student_id: student.id, reason: reason ?? null },
  });

  return updated;
}

export async function rejectOffer(offerId: string, data: RejectOfferInput, userId: string) {
  const offer = await prisma.offer.findUnique({ where: { id: offerId } });
  if (!offer) throw new NotFoundError('Offer');

  if (offer.status === 'rejected_by_admin') {
    throw new BusinessRuleError('Offer is already rejected', 'OFFER_ALREADY_REJECTED');
  }

  const updated = await prisma.offer.update({
    where: { id: offerId },
    data: {
      status: 'rejected_by_admin' as OfferStatus,
      rejected_at: new Date(),
      rejected_by: userId,
      rejection_reason: data.rejection_reason,
      rejection_remarks: data.rejection_remarks,
    },
  });

  await prisma.offerAudit.create({
    data: {
      offer_id: offerId,
      action: 'rejected',
      performed_by: userId,
      details: `Rejected: ${data.rejection_reason}`,
    },
  });

  try {
    const studentUser = await prisma.student.findUnique({
      where: { id: offer.student_id },
      select: { user_id: true },
    });
    if (studentUser?.user_id) {
      void createNotification({
        userId: studentUser.user_id,
        tenantId: offer.tenant_id,
        type: 'offer',
        title: 'Your offer was withdrawn by the TPO office',
        description: `Reason: ${data.rejection_reason}`,
        priority: 'high',
        actionUrl: '/applications',
        payload: { offer_id: offerId, reason: data.rejection_reason },
      });
    }
  } catch (err) {
    // swallow — createNotification already handles its own failures
  }

  return updated;
}

export async function updateJoiningStatus(offerId: string, data: JoiningStatusInput, userId: string) {
  const offer = await prisma.offer.findUnique({ where: { id: offerId } });
  if (!offer) throw new NotFoundError('Offer');

  if (offer.status !== 'accepted') {
    throw new BusinessRuleError('Only accepted offers can have joining status updated', 'OFFER_NOT_ACCEPTED');
  }

  const updated = await prisma.offer.update({
    where: { id: offerId },
    data: {
      joining_status: data.joining_status as JoiningStatus,
      joining_date: data.joining_date,
      dnj_reason: data.dnj_reason,
    },
  });

  await prisma.offerAudit.create({
    data: {
      offer_id: offerId,
      action: `joining_${data.joining_status}`,
      performed_by: userId,
      details: data.joining_status === 'did_not_join' ? `DNJ reason: ${data.dnj_reason}` : 'Student joined',
    },
  });

  return updated;
}

export async function updateCompliance(offerId: string, data: ComplianceInput, userId: string) {
  const offer = await prisma.offer.findUnique({ where: { id: offerId } });
  if (!offer) throw new NotFoundError('Offer');

  const updated = await prisma.offer.update({
    where: { id: offerId },
    data: {
      compliance_status: data.compliance_status as ComplianceStatus,
      applications_blocked: data.applications_blocked,
      admin_override_enabled: data.compliance_status === 'override_enabled',
    },
  });

  await prisma.offerAudit.create({
    data: {
      offer_id: offerId,
      action: `compliance_${data.compliance_status}`,
      performed_by: userId,
      details: `Compliance updated to ${data.compliance_status}`,
    },
  });

  return updated;
}
