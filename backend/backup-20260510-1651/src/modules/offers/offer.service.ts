import { prisma } from '../../config/database';
import { NotFoundError, BusinessRuleError } from '../../shared/errors';
import { paginate, buildPrismaQuery } from '../../shared/utils/pagination';
import { logger } from '../../config/logger';
import { createOfferNotifications } from '../notifications/notification.service';
import type {
  CreateOfferInput,
  RejectOfferInput,
  JoiningStatusInput,
  ComplianceInput,
  QueryOffersInput,
} from './offer.schema';
import { OfferType, OfferStatus, JoiningStatus, ComplianceStatus } from '@prisma/client';

function isOfferAdmin(user: Express.AuthUser) {
  return user.role === 'tpo_admin' || user.role === 'tpo_employee' || user.role === 'super_admin';
}

function buildOfferWhere(
  tenantId: string,
  filters: Partial<QueryOffersInput>,
  user: Express.AuthUser,
  scope?: Express.ScopeFilters,
): Record<string, unknown> {
  const { status, type, posting_type, company_id, student_id, search } = filters;
  const where: Record<string, unknown> = { tenant_id: tenantId };

  if (user.role === 'faculty_coordinator') {
    where.student = {
      is: {
        department: scope?.department ?? '__no_match__',
      },
    };
  }

  if (status) where.status = status;
  if (type) where.type = type;
  if (posting_type) where.posting = { is: { type: posting_type } };
  if (company_id) where.company_id = company_id;

  if (student_id) {
    if (user.role === 'faculty_coordinator') {
      where.student = {
        is: {
          id: student_id,
          department: scope?.department ?? '__no_match__',
        },
      };
    } else if (isOfferAdmin(user)) {
      where.student_id = student_id;
    }
  }

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
      orderBy: { [sort_by || 'created_at']: sort_order || 'desc' },
      include: {
        student: { select: { id: true, full_name: true, enrollment_number: true, department: true, batch: true } },
        company: { select: { id: true, name: true } },
        posting: { select: { id: true, title: true, type: true } },
      },
    }),
    prisma.offer.count({ where }),
  ]);

  return { data: offers, pagination: paginate(page, limit, total) };
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
      posting: { select: { id: true, title: true, type: true } },
      audit_trail: { orderBy: { performed_at: 'desc' } },
    },
  });

  if (!offer) throw new NotFoundError('Offer');
  return offer;
}

export async function getMyOffers(userId: string) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');

  return prisma.offer.findMany({
    where: { student_id: student.id },
    include: {
      company: { select: { name: true } },
      posting: { select: { title: true, type: true } },
    },
    orderBy: { created_at: 'desc' },
  });
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
      status: 'accepted' as OfferStatus,
      accepted_at: new Date(),
      is_locked: true,
      created_by: userId,
    },
  });

  await prisma.offerAudit.create({
    data: {
      offer_id: offer.id,
      action: 'created',
      performed_by: userId,
      details: `Offer created and released for role: ${data.role}`,
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
