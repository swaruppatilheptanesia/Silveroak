import request from 'supertest';
import app from '../app';
import { prisma } from '../config/database';

let adminToken: string;
let studentToken: string;
let companyId: string;
let postingId: string;
let studentId: string;
let offerId: string;

beforeAll(async () => {
  const aRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'tpoadmin@silveroak.ac.in', password: 'Password@123' });
  adminToken = aRes.body.token;

  const sRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'student@silveroak.ac.in', password: 'Password@123' });
  studentToken = sRes.body.token;

  // Get company
  const cRes = await request(app)
    .get('/api/companies?limit=1')
    .set('Authorization', `Bearer ${adminToken}`);
  companyId = cRes.body.data[0].id;

  // Create a posting
  const pRes = await request(app)
    .post('/api/postings')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      company_id: companyId,
      title: 'Offer Test Posting',
      type: 'job',
      academic_year: '2024-25',
      role_name: 'Engineer',
      location: 'Ahmedabad',
      work_mode: 'onsite',
    });
  postingId = pRes.body.id;

  // Get student id
  const student = await prisma.student.findFirst({ where: { user: { email: 'student@silveroak.ac.in' } } });
  studentId = student!.id;
});

afterAll(async () => {
  await prisma.offerAudit.deleteMany({});
  await prisma.offer.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.$disconnect();
});

describe('Offer CRUD', () => {
  it('should create an offer', async () => {
    const res = await request(app)
      .post('/api/offers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        student_id: studentId,
        posting_id: postingId,
        company_id: companyId,
        type: 'job',
        role: 'Software Engineer',
        ctc: '8 LPA',
        location: 'Ahmedabad',
        offer_date: '2025-03-01',
      });

    expect(res.status).toBe(201);
    expect(res.body.role).toBe('Software Engineer');
    expect(res.body.status).toBe('pending_student_action');
    offerId = res.body.id;
  });

  it('should list offers', async () => {
    const res = await request(app)
      .get('/api/offers')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('should get offer by id with audit trail', async () => {
    const res = await request(app)
      .get(`/api/offers/${offerId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.audit_trail).toBeDefined();
    expect(res.body.audit_trail.length).toBeGreaterThanOrEqual(1);
  });

  it('should return 404 for non-existent offer', async () => {
    const res = await request(app)
      .get('/api/offers/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it('should reject student from admin routes', async () => {
    const res = await request(app)
      .get('/api/offers')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });
});

describe('Student Offer Actions', () => {
  it('should list my offers', async () => {
    const res = await request(app)
      .get('/api/offers/my')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.offers.length).toBeGreaterThanOrEqual(1);
  });

  it('should accept an offer', async () => {
    const res = await request(app)
      .put(`/api/offers/${offerId}/accept`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('accepted');
    expect(res.body.is_locked).toBe(true);
  });

  it('should reject re-accepting', async () => {
    const res = await request(app)
      .put(`/api/offers/${offerId}/accept`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('OFFER_NOT_PENDING');
  });
});

describe('Offer Lifecycle', () => {
  let lifecycleOfferId: string;

  beforeAll(async () => {
    const res = await request(app)
      .post('/api/offers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        student_id: studentId,
        posting_id: postingId,
        company_id: companyId,
        type: 'internship',
        role: 'Intern',
        stipend: '25000/month',
        offer_date: '2025-04-01',
      });
    lifecycleOfferId = res.body.id;
  });

  it('should reject an offer', async () => {
    const res = await request(app)
      .put(`/api/offers/${lifecycleOfferId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rejection_reason: 'Student request', rejection_remarks: 'Personal reasons' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('rejected_by_admin');
  });

  it('should reject re-rejecting', async () => {
    const res = await request(app)
      .put(`/api/offers/${lifecycleOfferId}/reject`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ rejection_reason: 'Test' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('OFFER_ALREADY_REJECTED');
  });
});

describe('Joining & Compliance', () => {
  it('should update joining status', async () => {
    const res = await request(app)
      .put(`/api/offers/${offerId}/joining`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        joining_status: 'joined',
        joining_date: '2025-06-01',
      });

    expect(res.status).toBe(200);
    expect(res.body.joining_status).toBe('joined');
  });

  it('should reject joining for non-accepted offer', async () => {
    // Create a new pending offer
    const oRes = await request(app)
      .post('/api/offers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        student_id: studentId,
        posting_id: postingId,
        company_id: companyId,
        type: 'job',
        role: 'Test Role',
        offer_date: '2025-05-01',
      });

    const res = await request(app)
      .put(`/api/offers/${oRes.body.id}/joining`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ joining_status: 'joined', joining_date: '2025-06-01' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('OFFER_NOT_ACCEPTED');
  });

  it('should update compliance status', async () => {
    const res = await request(app)
      .put(`/api/offers/${offerId}/compliance`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ compliance_status: 'blocked', applications_blocked: true });

    expect(res.status).toBe(200);
    expect(res.body.compliance_status).toBe('blocked');
    expect(res.body.applications_blocked).toBe(true);
  });
});
