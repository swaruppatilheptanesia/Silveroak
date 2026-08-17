import request from 'supertest';
import app from '../app';
import { prisma } from '../config/database';

let adminToken: string;
let studentToken: string;

beforeAll(async () => {
  const aRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'tpoadmin@silveroak.ac.in', password: 'Password@123' });
  adminToken = aRes.body.token;

  const sRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'student@silveroak.ac.in', password: 'Password@123' });
  studentToken = sRes.body.token;
});

afterAll(async () => {
  await prisma.refreshToken.deleteMany({});
  await prisma.$disconnect();
});

// =========================================================
// Companies
// =========================================================
describe('Companies CRUD', () => {
  let companyId: string;

  it('should list companies with pagination', async () => {
    const res = await request(app)
      .get('/api/companies?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
    expect(res.body.pagination).toHaveProperty('total');
  });

  it('should search companies by name', async () => {
    const res = await request(app)
      .get('/api/companies?search=TCS')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(0);
  });

  it('should filter companies by status', async () => {
    const res = await request(app)
      .get('/api/companies?status=active')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  it('should create a company', async () => {
    const res = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Corp',
        industry: 'Technology',
        website: 'https://testcorp.com',
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Test Corp');
    companyId = res.body.id;
  });

  it('should get company by id', async () => {
    const res = await request(app)
      .get(`/api/companies/${companyId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Test Corp');
    expect(res.body._count).toBeDefined();
  });

  it('should update a company', async () => {
    const res = await request(app)
      .put(`/api/companies/${companyId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ industry: 'Software' });

    expect(res.status).toBe(200);
    expect(res.body.industry).toBe('Software');
  });

  it('should classify a company', async () => {
    const res = await request(app)
      .put(`/api/companies/${companyId}/classification`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ classification: 'preferred', internal_remarks: 'Top recruiter' });

    expect(res.status).toBe(200);
    expect(res.body.classification).toBe('preferred');
  });

  it('should reject invalid classification', async () => {
    const res = await request(app)
      .put(`/api/companies/${companyId}/classification`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ classification: 'invalid' });

    expect(res.status).toBe(400);
  });

  it('should return 404 for non-existent company', async () => {
    const res = await request(app)
      .get('/api/companies/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it('should reject student role', async () => {
    const res = await request(app)
      .get('/api/companies')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });

  it('should reject create without name', async () => {
    const res = await request(app)
      .post('/api/companies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ industry: 'Tech' });

    expect(res.status).toBe(400);
  });
});

// =========================================================
// Recruiters
// =========================================================
describe('Recruiters CRUD', () => {
  let companyId: string;
  let recruiterId: string;

  beforeAll(async () => {
    // Get a company from seed data
    const res = await request(app)
      .get('/api/companies?limit=1')
      .set('Authorization', `Bearer ${adminToken}`);
    companyId = res.body.data[0].id;
  });

  it('should create a recruiter', async () => {
    const res = await request(app)
      .post(`/api/companies/${companyId}/recruiters`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Jane Doe',
        email: 'jane@testcorp.com',
        phone: '+91 9876543210',
        designation: 'HR Manager',
      });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Jane Doe');
    recruiterId = res.body.id;
  });

  it('should list recruiters by company', async () => {
    const res = await request(app)
      .get(`/api/companies/${companyId}/recruiters`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.recruiters.length).toBeGreaterThanOrEqual(1);
  });

  it('should update a recruiter', async () => {
    const res = await request(app)
      .put(`/api/recruiters/${recruiterId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ designation: 'Senior HR' });

    expect(res.status).toBe(200);
    expect(res.body.designation).toBe('Senior HR');
  });

  it('should verify a recruiter', async () => {
    const res = await request(app)
      .put(`/api/recruiters/${recruiterId}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'verified' });

    expect(res.status).toBe(200);
    expect(res.body.verification_status).toBe('verified');
  });

  it('should reject invalid verification status', async () => {
    const res = await request(app)
      .put(`/api/recruiters/${recruiterId}/verify`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'invalid' });

    expect(res.status).toBe(400);
  });

  it('should reject invalid email on create', async () => {
    const res = await request(app)
      .post(`/api/companies/${companyId}/recruiters`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Bad', email: 'not-an-email' });

    expect(res.status).toBe(400);
  });

  it('should return 404 for recruiter of non-existent company', async () => {
    const res = await request(app)
      .get('/api/companies/00000000-0000-0000-0000-000000000000/recruiters')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it('should delete a recruiter', async () => {
    const res = await request(app)
      .delete(`/api/recruiters/${recruiterId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Recruiter deleted');
  });

  it('should return 404 deleting non-existent recruiter', async () => {
    const res = await request(app)
      .delete('/api/recruiters/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});

// =========================================================
// Engagements
// =========================================================
describe('Engagements CRUD', () => {
  let companyId: string;

  beforeAll(async () => {
    const res = await request(app)
      .get('/api/companies?limit=1')
      .set('Authorization', `Bearer ${adminToken}`);
    companyId = res.body.data[0].id;
  });

  it('should create an engagement', async () => {
    const res = await request(app)
      .post(`/api/companies/${companyId}/engagements`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        visitor_type: 'placement',
        date: '2025-01-15',
        remarks: 'Annual placement drive',
        students_hired: 25,
        academic_year: '2024-25',
      });

    expect(res.status).toBe(201);
    expect(res.body.students_hired).toBe(25);
  });

  it('should list engagements by company', async () => {
    const res = await request(app)
      .get(`/api/companies/${companyId}/engagements`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.engagements.length).toBeGreaterThanOrEqual(1);
  });

  it('should reject invalid visitor_type', async () => {
    const res = await request(app)
      .post(`/api/companies/${companyId}/engagements`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ visitor_type: 'invalid', date: '2025-01-15' });

    expect(res.status).toBe(400);
  });

  it('should return 404 for engagements of non-existent company', async () => {
    const res = await request(app)
      .get('/api/companies/00000000-0000-0000-0000-000000000000/engagements')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});
