import { NotificationPriority, NotificationType, OfferType, Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { NotFoundError } from '../../shared/errors';
import { buildPrismaQuery, paginate } from '../../shared/utils/pagination';
import { POSTING_TYPE_INTEREST_MAP } from '../students/student.service';
import type { QueryNotificationsInput } from './notification.schema';

const notificationSelect = {
  id: true,
  type: true,
  title: true,
  description: true,
  priority: true,
  action_url: true,
  payload: true,
  is_read: true,
  created_at: true,
} as const satisfies Prisma.NotificationSelect;

type OfferNotificationArgs = {
  tenantId: string;
  offerId: string;
  studentId: string;
  postingId: string;
  companyId: string;
  role: string;
  offerType: OfferType;
};

type OfferNotificationPayload = {
  posting_id: string;
  offer_id: string;
  offered_student_id: string;
  offered_student_name: string;
  offered_student_photo_url: string | null;
  company_name: string;
  role: string;
  offer_type: OfferType;
  is_target_student: boolean;
};

type NotificationCreateInput = Prisma.NotificationCreateManyInput;

function getOfferInterestTypes(offerType: OfferType) {
  return [POSTING_TYPE_INTEREST_MAP[offerType]];
}

function buildOfferTitle(offerType: OfferType, isTargetStudent: boolean, offeredStudentName: string) {
  const offerLabel = offerType === 'job' ? 'job' : 'internship';
  return isTargetStudent
    ? `You have been offered a ${offerLabel}`
    : `${offerLabel === 'job' ? 'Job' : 'Internship'} offer released for ${offeredStudentName}`;
}

function buildOfferDescription(args: OfferNotificationArgs, companyName: string, offeredStudentName: string, isTargetStudent: boolean) {
  const offerLabel = args.offerType === 'job' ? 'job' : 'internship';
  const article = offerLabel === 'job' ? 'A' : 'An';

  if (isTargetStudent) {
    return `Your ${offerLabel} offer for ${args.role} at ${companyName} has been released by the TPO team.`;
  }

  return `${article} ${offerLabel} offer for ${args.role} at ${companyName} has been released for ${offeredStudentName}.`;
}

function buildOfferActionUrl(postingId: string, offerId: string) {
  return `/opportunities/${postingId}?offerId=${offerId}`;
}

export async function getMyNotifications(userId: string, tenantId: string, query: QueryNotificationsInput) {
  const { page, limit } = query;
  const where = { tenant_id: tenantId, user_id: userId };

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      ...buildPrismaQuery(page, limit),
      orderBy: { created_at: 'desc' },
      select: notificationSelect,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { ...where, is_read: false } }),
  ]);

  return {
    data: notifications,
    pagination: paginate(page, limit, total),
    unread_count: unreadCount,
  };
}

export async function markNotificationAsRead(notificationId: string, userId: string, tenantId: string) {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      user_id: userId,
      tenant_id: tenantId,
    },
    select: notificationSelect,
  });

  if (!notification) {
    throw new NotFoundError('Notification');
  }

  if (notification.is_read) {
    return notification;
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { is_read: true },
    select: notificationSelect,
  });
}

export async function markAllNotificationsAsRead(userId: string, tenantId: string) {
  const result = await prisma.notification.updateMany({
    where: {
      user_id: userId,
      tenant_id: tenantId,
      is_read: false,
    },
    data: { is_read: true },
  });

  return {
    message: 'All notifications marked as read',
    updated_count: result.count,
  };
}

export async function dismissNotification(notificationId: string, userId: string, tenantId: string) {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      user_id: userId,
      tenant_id: tenantId,
    },
    select: { id: true },
  });

  if (!notification) {
    throw new NotFoundError('Notification');
  }

  await prisma.notification.delete({ where: { id: notification.id } });

  return {
    message: 'Notification dismissed',
  };
}

export async function createOfferNotifications(args: OfferNotificationArgs) {
  const [offeredStudent, company, applicantStudents, interestedStudents] = await Promise.all([
    prisma.student.findUnique({
      where: { id: args.studentId },
      select: { user_id: true, full_name: true, profile_photo_url: true },
    }),
    prisma.company.findUnique({
      where: { id: args.companyId },
      select: { name: true },
    }),
    prisma.student.findMany({
      where: {
        tenant_id: args.tenantId,
        applications: {
          some: {
            posting_id: args.postingId,
          },
        },
      },
      select: { user_id: true },
    }),
    prisma.student.findMany({
      where: {
        tenant_id: args.tenantId,
        interest_registrations: {
          some: {
            interest_type: {
              in: getOfferInterestTypes(args.offerType),
            },
            status: { not: 'withdrawn' },
          },
        },
      },
      select: { user_id: true },
    }),
  ]);

  if (!offeredStudent?.user_id || !company?.name) {
    logger.warn(
      {
        studentId: args.studentId,
        companyId: args.companyId,
        postingId: args.postingId,
      },
      'Skipping offer notifications because the offer context could not be resolved',
    );
    return { created: 0 };
  }

  const recipientIds = new Set<string>([offeredStudent.user_id]);

  for (const student of applicantStudents) {
    if (student.user_id) {
      recipientIds.add(student.user_id);
    }
  }

  for (const student of interestedStudents) {
    if (student.user_id) {
      recipientIds.add(student.user_id);
    }
  }

  const notificationRows: NotificationCreateInput[] = Array.from(recipientIds).map((userId) => {
    const isTargetStudent = userId === offeredStudent.user_id;
    const payload: OfferNotificationPayload = {
      posting_id: args.postingId,
      offer_id: args.offerId,
      offered_student_id: args.studentId,
      offered_student_name: offeredStudent.full_name,
      offered_student_photo_url: offeredStudent.profile_photo_url,
      company_name: company.name,
      role: args.role,
      offer_type: args.offerType,
      is_target_student: isTargetStudent,
    };

    return {
      tenant_id: args.tenantId,
      user_id: userId,
      type: 'placement',
      title: buildOfferTitle(args.offerType, isTargetStudent, offeredStudent.full_name),
      description: buildOfferDescription(args, company.name, offeredStudent.full_name, isTargetStudent),
      priority: 'high',
      action_url: buildOfferActionUrl(args.postingId, args.offerId),
      payload,
    };
  });

  if (notificationRows.length === 0) {
    return { created: 0 };
  }

  await prisma.notification.createMany({
    data: notificationRows,
  });

  return { created: notificationRows.length };
}

// ============================================================
// Generic dispatch helpers (used by domain triggers)
// ============================================================

interface CreateNotificationArgs {
  userId: string;
  tenantId: string;
  type: NotificationType;
  title: string;
  description?: string | null;
  priority?: NotificationPriority;
  actionUrl?: string | null;
  payload?: Prisma.InputJsonValue | null;
}

async function isPreferenceEnabled(userId: string, category: NotificationType): Promise<boolean> {
  const pref = await prisma.notificationPreference.findUnique({
    where: { user_id_category: { user_id: userId, category } },
    select: { enabled: true },
  });
  // Default ON when no row exists.
  return pref ? pref.enabled : true;
}

/**
 * Single-row writer with per-user preference filter. Never throws — failures
 * are logged so a notification problem can't break the parent mutation.
 */
export async function createNotification(args: CreateNotificationArgs): Promise<void> {
  try {
    if (!(await isPreferenceEnabled(args.userId, args.type))) {
      return;
    }
    await prisma.notification.create({
      data: {
        tenant_id: args.tenantId,
        user_id: args.userId,
        type: args.type,
        title: args.title,
        description: args.description ?? null,
        priority: args.priority ?? 'low',
        action_url: args.actionUrl ?? null,
        payload: (args.payload ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    logger.error({ err, args }, 'createNotification failed');
  }
}

/**
 * Fan out to a list of recipient user_ids. Pre-filters opt-outs in a
 * single preference query and uses createMany for the writes.
 */
export async function notifyManyUsers(
  args: Omit<CreateNotificationArgs, 'userId'> & { userIds: string[] },
): Promise<void> {
  try {
    const userIds = Array.from(new Set(args.userIds.filter(Boolean)));
    if (userIds.length === 0) return;

    const optOuts = await prisma.notificationPreference.findMany({
      where: { user_id: { in: userIds }, category: args.type, enabled: false },
      select: { user_id: true },
    });
    const optOutSet = new Set(optOuts.map((row) => row.user_id));
    const recipients = userIds.filter((id) => !optOutSet.has(id));
    if (recipients.length === 0) return;

    await prisma.notification.createMany({
      data: recipients.map((userId) => ({
        tenant_id: args.tenantId,
        user_id: userId,
        type: args.type,
        title: args.title,
        description: args.description ?? null,
        priority: args.priority ?? 'low',
        action_url: args.actionUrl ?? null,
        payload: (args.payload ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      })),
    });
  } catch (err) {
    logger.error({ err, args }, 'notifyManyUsers failed');
  }
}

/**
 * Fan out to every active tpo_admin + tpo_employee in the tenant.
 */
export async function notifyTpoAudience(
  args: Omit<CreateNotificationArgs, 'userId'>,
): Promise<void> {
  try {
    const tpoUsers = await prisma.user.findMany({
      where: {
        tenant_id: args.tenantId,
        role: { in: ['tpo_admin', 'tpo_employee'] },
        is_active: true,
      },
      select: { id: true },
    });
    if (tpoUsers.length === 0) return;
    await notifyManyUsers({ ...args, userIds: tpoUsers.map((u) => u.id) });
  } catch (err) {
    logger.error({ err, args }, 'notifyTpoAudience failed');
  }
}

// ============================================================
// User notification preferences
// ============================================================

export async function getMyPreferences(userId: string) {
  const rows = await prisma.notificationPreference.findMany({
    where: { user_id: userId },
    select: { category: true, enabled: true },
  });
  const map = new Map(rows.map((row) => [row.category, row.enabled]));
  const allCategories: NotificationType[] = [
    'profile',
    'policy',
    'readiness',
    'placement',
    'offer',
    'application',
    'interest',
    'noc',
    'event',
    'announcement',
    'circular',
    'no_dues',
    'recruiter',
  ];
  return {
    preferences: allCategories.map((category) => ({
      category,
      enabled: map.has(category) ? Boolean(map.get(category)) : true,
    })),
  };
}

export async function upsertMyPreferences(
  userId: string,
  preferences: { category: NotificationType; enabled: boolean }[],
) {
  await prisma.$transaction(
    preferences.map((pref) =>
      prisma.notificationPreference.upsert({
        where: { user_id_category: { user_id: userId, category: pref.category } },
        create: { user_id: userId, category: pref.category, enabled: pref.enabled },
        update: { enabled: pref.enabled },
      }),
    ),
  );
  return getMyPreferences(userId);
}
