import request from 'supertest';
import app from '../app';
import { prisma } from '../config/database';

let adminToken: string;
let employeeToken: string;
let studentToken: string;
let createdMasterId = '';
let createdPolicyCategoryMasterId = '';

beforeAll(async () => {
  const [adminLogin, employeeLogin, studentLogin] = await Promise.all([
    request(app).post('/api/auth/login').send({ email: 'tpoadmin@silveroak.ac.in', password: 'Password@123' }),
    request(app).post('/api/auth/login').send({ email: 'tpoemployee@silveroak.ac.in', password: 'Password@123' }),
    request(app).post('/api/auth/login').send({ email: 'student@silveroak.ac.in', password: 'Password@123' }),
  ]);

  adminToken = adminLogin.body.token;
  employeeToken = employeeLogin.body.token;
  studentToken = studentLogin.body.token;
});

afterAll(async () => {
  if (createdMasterId) {
    await prisma.masterOption.deleteMany({
      where: { id: createdMasterId },
    });
  }

  if (createdPolicyCategoryMasterId) {
    await prisma.masterOption.deleteMany({
      where: { id: createdPolicyCategoryMasterId },
    });
  }

  await prisma.$disconnect();
});

describe('Master option APIs', () => {
  it('should expose active masters to authenticated users', async () => {
    const res = await request(app)
      .get('/api/masters')
      .query({ category: 'skill' })
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((item: { category: string; is_active: boolean }) => item.category === 'skill')).toBe(true);
    expect(res.body.data.every((item: { is_active: boolean }) => item.is_active === true)).toBe(true);
  });

  it('should expose policy category masters to authenticated users', async () => {
    const res = await request(app)
      .get('/api/masters')
      .query({ category: 'policy_category' })
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((item: { category: string; is_active: boolean }) => item.category === 'policy_category')).toBe(true);
  });

  it('should expose noc type masters to authenticated users', async () => {
    const res = await request(app)
      .get('/api/masters')
      .query({ category: 'noc_type' })
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data.every((item: { category: string; is_active: boolean }) => item.category === 'noc_type')).toBe(true);
    expect(res.body.data.map((item: { value: string }) => item.value)).toEqual(
      expect.arrayContaining(['internship', 'training', 'project']),
    );
  });

  it('should let TPO admin create a policy category master option', async () => {
    const createRes = await request(app)
      .post('/api/admin/masters')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        category: 'policy_category',
        value: 'Student Guidelines',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.category).toBe('policy_category');
    expect(createRes.body.value).toBe('Student Guidelines');
    createdPolicyCategoryMasterId = createRes.body.id;
  });

  it('should block TPO employees from creating master options by default', async () => {
    const res = await request(app)
      .post('/api/admin/masters')
      .set('Authorization', `Bearer ${employeeToken}`)
      .send({
        category: 'branch',
        value: 'Civil Engineering',
      });

    expect(res.status).toBe(403);
  });

  it('should let TPO admin create, update, and delete a master option', async () => {
    const createRes = await request(app)
      .post('/api/admin/masters')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        category: 'branch',
        value: 'Civil Engineering',
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.category).toBe('branch');
    expect(createRes.body.value).toBe('Civil Engineering');
    createdMasterId = createRes.body.id;

    const listRes = await request(app)
      .get('/api/admin/masters')
      .query({ category: 'branch', include_inactive: 'true' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.data.some((item: { id: string }) => item.id === createdMasterId)).toBe(true);

    const updateRes = await request(app)
      .put(`/api/admin/masters/${createdMasterId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        value: 'Civil',
        is_active: false,
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.value).toBe('Civil');
    expect(updateRes.body.is_active).toBe(false);

    const publicListRes = await request(app)
      .get('/api/masters')
      .query({ category: 'branch' })
      .set('Authorization', `Bearer ${studentToken}`);

    expect(publicListRes.status).toBe(200);
    expect(publicListRes.body.data.some((item: { id: string }) => item.id === createdMasterId)).toBe(false);

    const deleteRes = await request(app)
      .delete(`/api/admin/masters/${createdMasterId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.message).toMatch(/deleted/i);
    createdMasterId = '';
  });

  it('should refuse to delete a posting type that still has postings', async () => {
    // Posting.posting_type_master_id is onDelete: Restrict — the service pre-checks it so the
    // admin gets a 409 with an actionable message instead of a raw Prisma P2003.
    const postingInUse = await prisma.posting.findFirst({
      select: { posting_type_master_id: true },
    });

    if (!postingInUse) {
      return; // No seeded postings in this environment — nothing to assert against.
    }

    const res = await request(app)
      .delete(`/api/admin/masters/${postingInUse.posting_type_master_id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('MASTER_OPTION_IN_USE');
    expect(res.body.error.message).toMatch(/still use/i);

    // The master must survive the rejected delete.
    const stillThere = await prisma.masterOption.findUnique({
      where: { id: postingInUse.posting_type_master_id },
    });
    expect(stillThere).not.toBeNull();
  });

  it('should return dependent-usage counts on admin posting-type masters but not to students', async () => {
    const adminRes = await request(app)
      .get('/api/admin/masters')
      .query({ category: 'posting_type', include_inactive: 'true' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(adminRes.status).toBe(200);
    expect(adminRes.body.data.length).toBeGreaterThan(0);
    for (const option of adminRes.body.data) {
      expect(option.usage).toEqual({
        postings: expect.any(Number),
        noc_templates: expect.any(Number),
        student_preferences: expect.any(Number),
        policies: expect.any(Number),
      });
    }

    const studentRes = await request(app)
      .get('/api/masters')
      .query({ category: 'posting_type' })
      .set('Authorization', `Bearer ${studentToken}`);

    expect(studentRes.status).toBe(200);
    expect(studentRes.body.data.every((option: { usage?: unknown }) => option.usage === undefined)).toBe(true);
  });
});
