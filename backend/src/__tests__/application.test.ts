import request from 'supertest';
import app from '../app';
import { prisma } from '../config/database';

let adminToken: string;
let studentToken: string;
let postingId: string;
let applicationId: string;

beforeAll(async () => {
  const aRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'tpoadmin@silveroak.ac.in', password: 'Password@123' });
  adminToken = aRes.body.token;

  const sRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'student@silveroak.ac.in', password: 'Password@123' });
  studentToken = sRes.body.token;

  // Create and publish a posting for testing
  const cRes = await request(app)
    .get('/api/companies?limit=1')
    .set('Authorization', `Bearer ${adminToken}`);
  const companyId = cRes.body.data[0].id;

  const pRes = await request(app)
    .post('/api/postings')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({
      company_id: companyId,
      title: 'App Test Posting',
      type: 'job',
      academic_year: '2024-25',
      role_name: 'Developer',
      location: 'Ahmedabad',
      work_mode: 'onsite',
      min_cgpa: 0,
    });
  postingId = pRes.body.id;

  await request(app)
    .put(`/api/postings/${postingId}/publish`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({});
});

afterAll(async () => {
  // Clean up test applications
  await prisma.applicationStageHistory.deleteMany({});
  await prisma.application.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.$disconnect();
});

describe('Student Apply', () => {
  it('should apply to a published posting', async () => {
    const res = await request(app)
      .post('/api/applications/apply')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ posting_id: postingId });

    expect(res.status).toBe(201);
    expect(res.body.posting_id).toBe(postingId);
    expect(res.body.current_stage).toBe('applied');
    applicationId = res.body.id;
  });

  it('should reject duplicate application', async () => {
    const res = await request(app)
      .post('/api/applications/apply')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ posting_id: postingId });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('ALREADY_APPLIED');
  });

  it('should reject application to non-existent posting', async () => {
    const res = await request(app)
      .post('/api/applications/apply')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ posting_id: '00000000-0000-0000-0000-000000000000' });

    expect(res.status).toBe(404);
  });

  it('should list my applications', async () => {
    const res = await request(app)
      .get('/api/applications/my')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.applications.length).toBeGreaterThanOrEqual(1);
    expect(res.body.applications[0].posting).toBeDefined();
  });

  it('should reject admin from apply route', async () => {
    const res = await request(app)
      .post('/api/applications/apply')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ posting_id: postingId });

    expect(res.status).toBe(403);
  });
});

describe('Admin Pipeline', () => {
  it('should list applications with filters', async () => {
    const res = await request(app)
      .get(`/api/applications?posting_id=${postingId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0].student).toBeDefined();
  });

  it('should get application by id', async () => {
    const res = await request(app)
      .get(`/api/applications/${applicationId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.stage_history).toBeDefined();
    expect(res.body.stage_history.length).toBeGreaterThanOrEqual(1);
  });

  it('should move application stage', async () => {
    const res = await request(app)
      .put(`/api/applications/${applicationId}/stage`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ stage: 'mock_round', remarks: 'Moved to mock round' });

    expect(res.status).toBe(200);
    expect(res.body.current_stage).toBe('mock_round');
  });

  it('should set mock round result', async () => {
    const res = await request(app)
      .put(`/api/applications/${applicationId}/mock-result`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ result: 'passed' });

    expect(res.status).toBe(200);
    expect(res.body.mock_round_result).toBe('passed');
  });

  it('should reject mock result for wrong stage', async () => {
    // First move to shortlisted
    await request(app)
      .put(`/api/applications/${applicationId}/stage`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ stage: 'shortlisted' });

    const res = await request(app)
      .put(`/api/applications/${applicationId}/mock-result`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ result: 'passed' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_STAGE_FOR_MOCK');
  });

  it('should bulk move stages', async () => {
    const res = await request(app)
      .put('/api/applications/bulk/stage')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        application_ids: [applicationId],
        stage: 'interview',
        remarks: 'Bulk move to interview',
      });

    expect(res.status).toBe(200);
    expect(res.body.results).toHaveLength(1);
    expect(res.body.results[0].status).toBe('moved');
  });

  it('should reject moving a rejected application', async () => {
    // Reject the application
    await request(app)
      .put(`/api/applications/${applicationId}/stage`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ stage: 'rejected' });

    const res = await request(app)
      .put(`/api/applications/${applicationId}/stage`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ stage: 'shortlisted' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('APPLICATION_REJECTED');
  });

  it('should return 404 for non-existent application', async () => {
    const res = await request(app)
      .get('/api/applications/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it('should reject student from admin routes', async () => {
    const res = await request(app)
      .get('/api/applications')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });
});

describe('Withdraw Application', () => {
  let withdrawPostingId: string;
  let withdrawAppId: string;

  beforeAll(async () => {
    // Create another posting and apply
    const cRes = await request(app)
      .get('/api/companies?limit=1')
      .set('Authorization', `Bearer ${adminToken}`);

    const pRes = await request(app)
      .post('/api/postings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        company_id: cRes.body.data[0].id,
        title: 'Withdraw Test Posting',
        type: 'internship',
        academic_year: '2024-25',
        role_name: 'Intern',
        location: 'Remote',
        work_mode: 'remote',
      });
    withdrawPostingId = pRes.body.id;

    await request(app)
      .put(`/api/postings/${withdrawPostingId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    const aRes = await request(app)
      .post('/api/applications/apply')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ posting_id: withdrawPostingId });
    withdrawAppId = aRes.body.id;
  });

  it('should withdraw an application', async () => {
    const res = await request(app)
      .delete(`/api/applications/${withdrawAppId}/withdraw`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Application withdrawn');
  });

  it('should return 404 for already withdrawn application', async () => {
    const res = await request(app)
      .delete(`/api/applications/${withdrawAppId}/withdraw`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(404);
  });
});
