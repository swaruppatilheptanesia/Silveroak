import request from 'supertest';
import app from '../app';
import { prisma } from '../config/database';

let adminToken: string;
let studentToken: string;
let facultyToken: string;

beforeAll(async () => {
  const aRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'tpoadmin@silveroak.ac.in', password: 'Password@123' });
  adminToken = aRes.body.token;

  const sRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'student@silveroak.ac.in', password: 'Password@123' });
  studentToken = sRes.body.token;

  const fRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'faculty@silveroak.ac.in', password: 'Password@123' });
  facultyToken = fRes.body.token;
});

afterAll(async () => {
  await prisma.nocRequest.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.$disconnect();
});

describe('NOC Module', () => {
  let nocId: string;

  it('should create a NOC request as student', async () => {
    const res = await request(app)
      .post('/api/noc')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        noc_type: 'internship',
        program: 'summer_internship',
        placement_source: 'self_sourced',
        company_name: 'Google',
        role_title: 'SWE Intern',
        technology_domain: 'Cloud',
        start_date: '2025-05-01',
        end_date: '2025-07-31',
        duration_weeks: 12,
        stipend_amount: 80000,
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('pending_faculty');
    nocId = res.body.id;
  });

  it('should list my NOCs as student', async () => {
    const res = await request(app)
      .get('/api/noc/my')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.nocs.length).toBeGreaterThanOrEqual(1);
  });

  it('should list NOCs as faculty', async () => {
    const res = await request(app)
      .get('/api/noc')
      .set('Authorization', `Bearer ${facultyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('should get NOC by id', async () => {
    const res = await request(app)
      .get(`/api/noc/${nocId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.student).toBeDefined();
  });

  it('should faculty approve NOC', async () => {
    const res = await request(app)
      .put(`/api/noc/${nocId}/faculty-approve`)
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({ remarks: 'Approved by faculty' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('pending_tpo');
    expect(res.body.faculty_remarks).toBe('Approved by faculty');
  });

  it('should reject re-faculty-approval', async () => {
    const res = await request(app)
      .put(`/api/noc/${nocId}/faculty-approve`)
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({});

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_NOC_STATUS');
  });

  it('should TPO approve NOC', async () => {
    const res = await request(app)
      .put(`/api/noc/${nocId}/tpo-approve`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ remarks: 'Approved by TPO' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');
  });

  it('should issue NOC', async () => {
    const res = await request(app)
      .put(`/api/noc/${nocId}/issue`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('issued');
    expect(res.body.noc_number).toMatch(/^SOU\/TPO\/\d{2}-\d{4}\/[A-Z]{3}\/\d{4}$/);
  });

  it('should reject issuing already issued NOC', async () => {
    const res = await request(app)
      .put(`/api/noc/${nocId}/issue`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(422);
  });

  // Rejection flow
  it('should reject a pending NOC', async () => {
    // Create another NOC
    const cRes = await request(app)
      .post('/api/noc')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        noc_type: 'training',
        program: 'industrial_training',
        placement_source: 'self_sourced',
        company_name: 'Microsoft',
        role_title: 'Trainee',
        start_date: '2025-06-01',
        end_date: '2025-08-31',
      });

    const res = await request(app)
      .put(`/api/noc/${cRes.body.id}/reject`)
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({ rejection_reason: 'Company not verified' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('rejected');
  });

  it('should return 404 for non-existent NOC', async () => {
    const res = await request(app)
      .get('/api/noc/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it('should reject admin creating NOC', async () => {
    const res = await request(app)
      .post('/api/noc')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        noc_type: 'internship',
        program: 'summer_internship',
        placement_source: 'self_sourced',
        company_name: 'Test',
        role_title: 'Test',
        start_date: '2025-05-01',
        end_date: '2025-07-31',
      });

    expect(res.status).toBe(403);
  });
});
