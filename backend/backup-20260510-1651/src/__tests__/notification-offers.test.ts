import request from 'supertest';
import app from '../app';
import { prisma } from '../config/database';

const testRoleName = 'Notification QA Engineer';

let adminToken: string;
let studentToken: string;
let interestedStudentToken: string;
let companyId: string;
let postingId: string;
let offerId: string;
let tenantId: string;
let studentId: string;
let studentFullName: string;
let studentProfilePhotoUrl: string | null;
let interestedStudentId: string;

async function login(email: string) {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email, password: 'Password@123' });

  expect(res.status).toBe(200);
  return res.body.token as string;
}

function findTestNotification(notifications: TestNotification[]) {
  return notifications.find((notification) => {
    const text = `${notification.title} ${notification.description ?? ''}`;
    return text.includes(testRoleName);
  });
}

type TestNotification = {
  id: string;
  title: string;
  description: string | null;
  action_url: string | null;
  payload: {
    posting_id: string;
    offer_id: string;
    offered_student_id: string;
    offered_student_name: string;
    offered_student_photo_url: string | null;
    company_name: string;
    role: string;
    offer_type: string;
    is_target_student: boolean;
  } | null;
};

beforeAll(async () => {
  adminToken = await login('tpoadmin@silveroak.ac.in');
  studentToken = await login('student@silveroak.ac.in');
  interestedStudentToken = await login('aditi@silveroak.ac.in');

  const [studentProfile, interestedStudentProfile] = await Promise.all([
    prisma.student.findFirst({
      where: { user: { email: 'student@silveroak.ac.in' } },
      select: { id: true, user_id: true, tenant_id: true, full_name: true, profile_photo_url: true },
    }),
    prisma.student.findFirst({
      where: { user: { email: 'aditi@silveroak.ac.in' } },
      select: { id: true, user_id: true, tenant_id: true, full_name: true, profile_photo_url: true },
    }),
  ]);

  expect(studentProfile).toBeTruthy();
  expect(interestedStudentProfile).toBeTruthy();

  tenantId = studentProfile!.tenant_id;
  studentId = studentProfile!.id;
  studentFullName = studentProfile!.full_name;
  studentProfilePhotoUrl = studentProfile!.profile_photo_url;
  interestedStudentId = interestedStudentProfile!.id;

  await prisma.notification.deleteMany({
    where: {
      tenant_id: tenantId,
      OR: [
        { title: { contains: testRoleName } },
        { description: { contains: testRoleName } },
      ],
    },
  });

  const companyRes = await request(app)
    .get('/api/companies?limit=1')
    .set('Authorization', `Bearer ${adminToken}`);

  expect(companyRes.status).toBe(200);
  companyId = companyRes.body.data[0].id;

  const postingRes = await request(app)
    .post('/api/postings')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      company_id: companyId,
      title: 'Notification Flow Posting',
      type: 'job',
      academic_year: '2024-25',
      role_name: 'Notification QA Role',
      location: 'Ahmedabad',
      work_mode: 'onsite',
    });

  expect(postingRes.status).toBe(201);
  postingId = postingRes.body.id;

  const publishRes = await request(app)
    .put(`/api/postings/${postingId}/publish`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      application_start_date: '2026-04-12',
      application_end_date: '2026-05-01',
    });

  expect(publishRes.status).toBe(200);

  await Promise.all([
    prisma.interestRegistration.upsert({
      where: {
        student_id_interest_type: {
          student_id: studentId,
          interest_type: 'placement',
        },
      },
      create: {
        student_id: studentId,
        interest_type: 'placement',
      },
      update: {},
    }),
    prisma.interestRegistration.upsert({
      where: {
        student_id_interest_type: {
          student_id: interestedStudentId,
          interest_type: 'placement',
        },
      },
      create: {
        student_id: interestedStudentId,
        interest_type: 'placement',
      },
      update: {},
    }),
  ]);

  await prisma.application.deleteMany({
    where: {
      student_id: studentId,
      posting_id: postingId,
    },
  });

  await prisma.application.create({
    data: {
      tenant_id: tenantId,
      student_id: studentId,
      posting_id: postingId,
    },
  });

  const offerRes = await request(app)
    .post('/api/offers')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      student_id: studentId,
      posting_id: postingId,
      company_id: companyId,
      type: 'job',
      role: testRoleName,
      ctc: '8 LPA',
      location: 'Ahmedabad',
      offer_date: '2025-03-01',
    });

  expect(offerRes.status).toBe(201);
  offerId = offerRes.body.id;
});

afterAll(async () => {
  if (tenantId) {
    await prisma.notification.deleteMany({
      where: {
        tenant_id: tenantId,
        OR: [
          { title: { contains: testRoleName } },
          { description: { contains: testRoleName } },
        ],
      },
    });
  }

  if (offerId) {
    await prisma.offerAudit.deleteMany({ where: { offer_id: offerId } });
    await prisma.offer.deleteMany({ where: { id: offerId } });
  }

  if (postingId) {
    await prisma.application.deleteMany({ where: { posting_id: postingId } });
    await prisma.posting.deleteMany({ where: { id: postingId } });
  }

  if (studentId || interestedStudentId) {
    await prisma.interestRegistration.deleteMany({
      where: {
        student_id: { in: [studentId, interestedStudentId].filter(Boolean) as string[] },
        interest_type: 'placement',
      },
    });
  }

  await prisma.$disconnect();
});

describe('Offer notifications', () => {
  it('creates one persisted notification per unique recipient', async () => {
    const studentNotificationsRes = await request(app)
      .get('/api/notifications/me')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(studentNotificationsRes.status).toBe(200);
    const studentNotifications = studentNotificationsRes.body.data as TestNotification[];
    const studentMatch = findTestNotification(studentNotifications);

    expect(studentMatch).toBeTruthy();
    expect(studentNotifications.filter((notification) => findTestNotification([notification])).length).toBe(1);
    expect(studentMatch?.action_url).toContain(`/opportunities/${postingId}`);
    expect(studentMatch?.action_url).toContain(`offerId=${offerId}`);
    expect(studentMatch?.payload?.offered_student_name).toBe(studentFullName);
    expect(studentMatch?.payload?.offered_student_photo_url).toBe(studentProfilePhotoUrl ?? null);

    const studentUnreadCount = studentNotificationsRes.body.unread_count as number;
    expect(studentUnreadCount).toBeGreaterThanOrEqual(1);

    const interestedNotificationsRes = await request(app)
      .get('/api/notifications/me')
      .set('Authorization', `Bearer ${interestedStudentToken}`);

    expect(interestedNotificationsRes.status).toBe(200);
    const interestedNotifications = interestedNotificationsRes.body.data as TestNotification[];
    const interestedMatch = findTestNotification(interestedNotifications);

    expect(interestedMatch).toBeTruthy();
    expect(interestedNotifications.filter((notification) => findTestNotification([notification])).length).toBe(1);
    expect(interestedNotificationsRes.body.unread_count as number).toBeGreaterThanOrEqual(1);
    expect(interestedMatch?.description ?? '').toContain(studentFullName);
    expect(interestedMatch?.payload?.offered_student_photo_url).toBe(studentProfilePhotoUrl ?? null);
  });

  it('includes the released offer on the posting detail page', async () => {
    const postingRes = await request(app)
      .get(`/api/postings/${postingId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(postingRes.status).toBe(200);
    expect(Array.isArray(postingRes.body.offers)).toBe(true);

    const releasedOffer = (postingRes.body.offers as Array<{
      id: string;
      status: string;
      student: {
        id: string;
        full_name: string;
        enrollment_number: string;
        department: string;
        batch: string;
        profile_photo_url: string | null;
      };
    }>).find((item) => item.id === offerId);

    expect(releasedOffer).toBeTruthy();
    expect(releasedOffer?.student.full_name).toBe(studentFullName);
    expect(releasedOffer?.student.profile_photo_url).toBe(studentProfilePhotoUrl ?? null);
  });

  it('supports marking an offer notification as read and dismissing it', async () => {
    const notificationsRes = await request(app)
      .get('/api/notifications/me')
      .set('Authorization', `Bearer ${studentToken}`);

    const notification = findTestNotification(notificationsRes.body.data as TestNotification[]);
    expect(notification).toBeTruthy();

    const readRes = await request(app)
      .put(`/api/notifications/${notification!.id}/read`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({});

    expect(readRes.status).toBe(200);
    expect(readRes.body.is_read).toBe(true);

    const dismissRes = await request(app)
      .delete(`/api/notifications/${notification!.id}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(dismissRes.status).toBe(200);

    const refreshedRes = await request(app)
      .get('/api/notifications/me')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(
      (refreshedRes.body.data as Array<{ id: string }>).some((item) => item.id === notification!.id)
    ).toBe(false);
  });
});
