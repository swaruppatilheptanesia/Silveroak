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
  await prisma.internshipIssue.deleteMany({});
  await prisma.internship.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.$disconnect();
});

describe('Internship Module', () => {
  let internshipId: string;
  let issueId: string;

  it('should create an internship as student', async () => {
    const res = await request(app)
      .post('/api/internships')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        company_name: 'Google',
        role: 'SWE Intern',
        internship_type: 'paid',
        start_date: '2025-05-01',
        stipend_amount: 80000,
        is_receiving_stipend: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.role).toBe('SWE Intern');
    internshipId = res.body.id;
  });

  it('should list my internships', async () => {
    const res = await request(app)
      .get('/api/internships/my')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.internships.length).toBeGreaterThanOrEqual(1);
  });

  it('should list internships as admin', async () => {
    const res = await request(app)
      .get('/api/internships')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('should get internship by id', async () => {
    const res = await request(app)
      .get(`/api/internships/${internshipId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.student).toBeDefined();
  });

  it('should update internship as admin', async () => {
    const res = await request(app)
      .put(`/api/internships/${internshipId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'completed' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('completed');
  });

  it('should create an issue', async () => {
    const res = await request(app)
      .post(`/api/internships/${internshipId}/issues`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ title: 'Stipend not received', description: 'Month 2 stipend pending' });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Stipend not received');
    issueId = res.body.id;
  });

  it('should resolve an issue', async () => {
    const res = await request(app)
      .put(`/api/internships/issues/${issueId}/resolve`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('resolved');
  });

  it('should return 404 for non-existent internship', async () => {
    const res = await request(app)
      .get('/api/internships/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });
});
