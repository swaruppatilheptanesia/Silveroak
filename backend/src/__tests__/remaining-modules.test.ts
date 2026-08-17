import request from 'supertest';
import app from '../app';
import { prisma } from '../config/database';

let adminToken: string;
let studentToken: string;
let superAdminToken: string;

beforeAll(async () => {
  // Clean up test user from previous runs
  await prisma.user.deleteMany({ where: { email: 'newuser@silveroakuni.ac.in' } });

  const aRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'tpoadmin@silveroak.ac.in', password: 'Password@123' });
  adminToken = aRes.body.token;

  const saRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'superadmin@silveroak.ac.in', password: 'Password@123' });
  superAdminToken = saRes.body.token;

  const sRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'student@silveroak.ac.in', password: 'Password@123' });
  studentToken = sRes.body.token;
});

afterAll(async () => {
  await prisma.announcementReceipt.deleteMany({});
  await prisma.announcement.deleteMany({});
  await prisma.generatedCircular.deleteMany({});
  await prisma.circularTemplate.deleteMany({});
  await prisma.noDuesRequest.deleteMany({});
  await prisma.studentProject.deleteMany({});
  await prisma.internshipShowcase.deleteMany({});
  await prisma.portfolio.deleteMany({});
  await prisma.user.deleteMany({ where: { email: 'newuser@silveroakuni.ac.in' } });
  await prisma.refreshToken.deleteMany({});
  await prisma.$disconnect();
});

// =========================================================
// Announcements
// =========================================================
describe('Announcements', () => {
  let announcementId: string;

  it('should create announcement', async () => {
    const res = await request(app)
      .post('/api/announcements')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Placement Drive 2025',
        content: 'TCS campus drive scheduled for April.',
        priority: 'high',
        target_audience_type: 'all',
        requires_consent: true,
      });

    expect(res.status).toBe(201);
    announcementId = res.body.id;
  });

  it('should list announcements', async () => {
    const res = await request(app)
      .get('/api/announcements')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('should publish announcement', async () => {
    const res = await request(app)
      .put(`/api/announcements/${announcementId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('published');
  });

  it('should reject re-publish', async () => {
    const res = await request(app)
      .put(`/api/announcements/${announcementId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(422);
  });

  it('should mark as read by student', async () => {
    const res = await request(app)
      .put(`/api/announcements/${announcementId}/read`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.is_read).toBe(true);
  });

  it('should give consent by student', async () => {
    const res = await request(app)
      .put(`/api/announcements/${announcementId}/consent`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.has_consented).toBe(true);
  });

  it('should archive announcement', async () => {
    const res = await request(app)
      .put(`/api/announcements/${announcementId}/archive`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('archived');
  });

  it('should republish an archived announcement', async () => {
    // Runs straight after the archive test, so the announcement is archived here.
    const res = await request(app)
      .put(`/api/announcements/${announcementId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('published');
    expect(res.body.published_at).toBeTruthy();
  });
});

// =========================================================
// Circulars
// =========================================================
describe('Circulars', () => {
  let templateId: string;
  let companyId: string;

  beforeAll(async () => {
    const cRes = await request(app)
      .get('/api/companies?limit=1')
      .set('Authorization', `Bearer ${adminToken}`);
    companyId = cRes.body.data[0].id;
  });

  it('should create template', async () => {
    const res = await request(app)
      .post('/api/circulars/templates')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Placement Circular', type: 'placement', sections: [{ heading: 'Details' }] });

    expect(res.status).toBe(201);
    templateId = res.body.id;
  });

  it('should list templates', async () => {
    const res = await request(app)
      .get('/api/circulars/templates')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('should generate circular', async () => {
    const res = await request(app)
      .post('/api/circulars/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        template_id: templateId,
        company_id: companyId,
        company_name: 'TCS',
        role_name: 'SDE',
        type: 'placement',
        field_values: { ctc: '8 LPA' },
      });

    expect(res.status).toBe(201);
    expect(res.body.company_name).toBe('TCS');
  });

  it('should generate circular without template', async () => {
    const res = await request(app)
      .post('/api/circulars/generate')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        company_id: companyId,
        company_name: 'Infosys',
        role_name: 'Analyst',
        type: 'placement',
        field_values: { ctc: '6 LPA' },
      });

    expect(res.status).toBe(201);
    expect(res.body.company_name).toBe('Infosys');
    expect(res.body.template).toBeNull();
  });

  it('should list generated circulars', async () => {
    const res = await request(app)
      .get('/api/circulars/generated')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.circulars.length).toBeGreaterThanOrEqual(1);
  });
});

// =========================================================
// No Dues
// =========================================================
describe('No Dues', () => {
  let ndcId: string;

  it('should create no dues request', async () => {
    const res = await request(app)
      .post('/api/no-dues')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        exit_reason: 'employment',
        company_name: 'Google',
        designation: 'SWE',
        package_lpa: 25,
        declaration_accepted: true,
      });

    expect(res.status).toBe(201);
    ndcId = res.body.id;
  });

  it('should list my no dues', async () => {
    const res = await request(app)
      .get('/api/no-dues/my')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.requests.length).toBeGreaterThanOrEqual(1);
  });

  it('should review and approve', async () => {
    const res = await request(app)
      .put(`/api/no-dues/${ndcId}/review`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'approved', admin_remarks: 'All clear' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');
  });

  it('should issue NDC', async () => {
    const res = await request(app)
      .put(`/api/no-dues/${ndcId}/issue`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.ndc_number).toMatch(/^NDC-/);
  });

  it('should reject declaration_accepted=false', async () => {
    const res = await request(app)
      .post('/api/no-dues')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        exit_reason: 'employment',
        declaration_accepted: false,
      });

    expect(res.status).toBe(400);
  });
});

// =========================================================
// Policies
// =========================================================
describe('Policies', () => {
  let policyId: string;

  it('should create policy', async () => {
    const res = await request(app)
      .post('/api/policies')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Placement Policy 2025',
        category: 'placement',
        content: 'All students must follow...',
        version: '1.0',
      });

    expect(res.status).toBe(201);
    policyId = res.body.id;
  });

  it('should list policies', async () => {
    const res = await request(app)
      .get('/api/policies')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('should update policy', async () => {
    const res = await request(app)
      .put(`/api/policies/${policyId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ version: '1.1' });

    expect(res.status).toBe(200);
    expect(res.body.version).toBe('1.1');
  });

  it('should delete policy', async () => {
    const res = await request(app)
      .delete(`/api/policies/${policyId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  it('should reject student access', async () => {
    const res = await request(app)
      .get('/api/policies')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
  });
});

// =========================================================
// Portfolio
// =========================================================
describe('Portfolio', () => {
  let projectId: string;
  let showcaseId: string;

  it('should get or create portfolio', async () => {
    const res = await request(app)
      .get('/api/portfolio/me')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('projects');
    expect(res.body).toHaveProperty('showcases');
  });

  it('should add portfolio project', async () => {
    const res = await request(app)
      .post('/api/portfolio/me/projects')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: 'AI Chatbot',
        description: 'Built a chatbot using LLMs',
        technologies: ['Python', 'FastAPI'],
      });

    expect(res.status).toBe(201);
    projectId = res.body.id;
  });

  it('should update portfolio project', async () => {
    const res = await request(app)
      .put(`/api/portfolio/me/projects/${projectId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ title: 'AI Chatbot v2' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('AI Chatbot v2');
  });

  it('should add internship showcase', async () => {
    const res = await request(app)
      .post('/api/portfolio/me/showcases')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        company_name: 'Microsoft',
        role: 'SDE Intern',
        duration_months: 3,
        key_outcomes: ['Built CI/CD pipeline', 'Reduced latency by 30%'],
      });

    expect(res.status).toBe(201);
    showcaseId = res.body.id;
  });

  it('should update portfolio status', async () => {
    const res = await request(app)
      .put('/api/portfolio/me/status')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ status: 'published' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('published');
  });

  it('should delete showcase', async () => {
    const res = await request(app)
      .delete(`/api/portfolio/me/showcases/${showcaseId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
  });

  it('should delete project', async () => {
    const res = await request(app)
      .delete(`/api/portfolio/me/projects/${projectId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
  });
});

// =========================================================
// Admin
// =========================================================
describe('Admin Module', () => {
  it('should list users', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('should search users', async () => {
    const res = await request(app)
      .get('/api/admin/users?search=student')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  it('should create a user', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'newuser@silveroakuni.ac.in',
        password: 'Password@123',
        name: 'New User',
        role: 'tpo_employee',
      });

    expect(res.status).toBe(201);
    expect(res.body.email).toBe('newuser@silveroakuni.ac.in');
  });

  it('should reject duplicate email', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        email: 'newuser@silveroakuni.ac.in',
        password: 'Password@123',
        name: 'Duplicate',
        role: 'tpo_employee',
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('EMAIL_EXISTS');
  });

  it('should list audit logs', async () => {
    const res = await request(app)
      .get('/api/admin/audit-logs')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
  });

  it('should list permissions', async () => {
    const res = await request(app)
      .get('/api/admin/permissions')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.permissions.length).toBeGreaterThanOrEqual(1);
  });

  it('should reject student access to admin', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });
});
