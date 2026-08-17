import request from 'supertest';
import app from '../app';
import { prisma } from '../config/database';

let adminToken: string;
let studentToken: string;
let aditiToken: string;
let companyId: string;
const visibilityTestTitles = [
  `Visibility Target A ${Date.now()}`,
  `Visibility Target B ${Date.now()}`,
];

beforeAll(async () => {
  const aRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'tpoadmin@silveroak.ac.in', password: 'Password@123' });
  adminToken = aRes.body.token;

  const sRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'student@silveroak.ac.in', password: 'Password@123' });
  studentToken = sRes.body.token;

  const aditiRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'aditi@silveroak.ac.in', password: 'Password@123' });
  aditiToken = aditiRes.body.token;

  // Get a company
  const cRes = await request(app)
    .get('/api/companies?limit=1')
    .set('Authorization', `Bearer ${adminToken}`);
  companyId = cRes.body.data[0].id;
});

afterAll(async () => {
  await prisma.posting.deleteMany({
    where: { title: { in: visibilityTestTitles } },
  });
  await prisma.refreshToken.deleteMany({});
  await prisma.$disconnect();
});

// =========================================================
// Postings CRUD
// =========================================================
describe('Postings CRUD', () => {
  let postingId: string;

  it('should create a posting', async () => {
    const res = await request(app)
      .post('/api/postings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        company_id: companyId,
        title: 'Software Engineer',
        type: 'job',
        academic_year: '2024-25',
        role_name: 'SDE-1',
        location: 'Ahmedabad',
        work_mode: 'hybrid',
        ctc: '8 LPA',
        eligible_branches: ['CSE', 'IT'],
        min_cgpa: 7.0,
        max_backlogs: 0,
        technical_rounds: 2,
        hr_rounds: 1,
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('Software Engineer');
    expect(res.body.status).toBe('draft');
    postingId = res.body.id;
  });

  it('should list postings with pagination', async () => {
    const res = await request(app)
      .get('/api/postings?page=1&limit=10')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('pagination');
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('should search postings', async () => {
    const res = await request(app)
      .get('/api/postings?search=Software')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('should filter postings by status', async () => {
    const res = await request(app)
      .get('/api/postings?status=draft')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  it('should filter postings by type', async () => {
    const res = await request(app)
      .get('/api/postings?type=job')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });

  it('should get posting by id', async () => {
    const res = await request(app)
      .get(`/api/postings/${postingId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Software Engineer');
    expect(res.body.company).toBeDefined();
    expect(res.body._count).toBeDefined();
  });

  it('should update a posting', async () => {
    const res = await request(app)
      .put(`/api/postings/${postingId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ctc: '10 LPA', technical_rounds: 3 });

    expect(res.status).toBe(200);
    expect(res.body.ctc).toBe('10 LPA');
    expect(res.body.technical_rounds).toBe(3);
  });

  it('should return 404 for non-existent posting', async () => {
    const res = await request(app)
      .get('/api/postings/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(404);
  });

  it('should allow student role to view visible postings', async () => {
    const res = await request(app)
      .get('/api/postings')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('should reject create without required fields', async () => {
    const res = await request(app)
      .post('/api/postings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ title: 'Incomplete' });

    expect(res.status).toBe(400);
  });

  it('should reject create with non-existent company', async () => {
    const res = await request(app)
      .post('/api/postings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        company_id: '00000000-0000-0000-0000-000000000000',
        title: 'Test',
        type: 'job',
        academic_year: '2024-25',
        role_name: 'Test',
        location: 'Test',
        work_mode: 'onsite',
      });

    expect(res.status).toBe(404);
  });

  // Lifecycle tests
  it('should publish a draft posting', async () => {
    const res = await request(app)
      .put(`/api/postings/${postingId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('published');
    expect(res.body.published_at).toBeDefined();
  });

  it('should reject re-publishing an already published posting', async () => {
    const res = await request(app)
      .put(`/api/postings/${postingId}/publish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('INVALID_POSTING_STATUS');
  });

  it('should close a published posting', async () => {
    const res = await request(app)
      .put(`/api/postings/${postingId}/close`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('closed');
    expect(res.body.closed_at).toBeDefined();
  });

  it('should reject closing an already closed posting', async () => {
    const res = await request(app)
      .put(`/api/postings/${postingId}/close`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('POSTING_ALREADY_CLOSED');
  });

  it('should reject updating a closed posting', async () => {
    const res = await request(app)
      .put(`/api/postings/${postingId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ ctc: '12 LPA' });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('POSTING_CLOSED');
  });
});

// =========================================================
// Student visibility targeting
// =========================================================
describe('Student visibility targeting', () => {
  const targetPostingSpecs = [
    {
      title: visibilityTestTitles[0],
      institute: 'Silver Oak University',
      course: 'B.Tech Information Technology',
      branch: 'Information Technology',
      semester: '8',
      matchingToken: () => aditiToken,
      nonMatchingToken: () => studentToken,
    },
    {
      title: visibilityTestTitles[1],
      institute: 'Silver Oak University',
      course: 'B.Tech Computer Science',
      branch: 'Computer Science',
      semester: '6',
      matchingToken: () => studentToken,
      nonMatchingToken: () => aditiToken,
    },
  ];

  for (const spec of targetPostingSpecs) {
    it(`should only expose ${spec.title} to the targeted student`, async () => {
      const createRes = await request(app)
        .post('/api/postings')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          company_id: companyId,
          title: spec.title,
          type: 'job',
          academic_year: '2025-26',
          role_name: 'QA Engineer',
          location: 'Ahmedabad',
          work_mode: 'onsite',
          ctc: '6.0 LPA',
          target_institutes: [spec.institute],
          target_courses: [spec.course],
          target_branches: [spec.branch],
          target_semesters: [spec.semester],
          eligible_branches: [],
          eligible_batches: [],
          min_cgpa: 0,
          max_backlogs: 0,
          technical_rounds: 1,
          hr_rounds: 1,
        });

      expect(createRes.status).toBe(201);

      const publishRes = await request(app)
        .put(`/api/postings/${createRes.body.id}/publish`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(publishRes.status).toBe(200);
      expect(publishRes.body.status).toBe('published');

      const matchingListRes = await request(app)
        .get('/api/postings?limit=100&sort_by=created_at&sort_order=desc')
        .set('Authorization', `Bearer ${spec.matchingToken()}`);

      expect(matchingListRes.status).toBe(200);
      expect(matchingListRes.body.data.some((posting: { id: string }) => posting.id === createRes.body.id)).toBe(true);

      const matchingDetailRes = await request(app)
        .get(`/api/postings/${createRes.body.id}`)
        .set('Authorization', `Bearer ${spec.matchingToken()}`);

      expect(matchingDetailRes.status).toBe(200);
      expect(matchingDetailRes.body.id).toBe(createRes.body.id);

      const nonMatchingListRes = await request(app)
        .get('/api/postings?limit=100&sort_by=created_at&sort_order=desc')
        .set('Authorization', `Bearer ${spec.nonMatchingToken()}`);

      expect(nonMatchingListRes.status).toBe(200);
      expect(nonMatchingListRes.body.data.some((posting: { id: string }) => posting.id === createRes.body.id)).toBe(false);

      const nonMatchingDetailRes = await request(app)
        .get(`/api/postings/${createRes.body.id}`)
        .set('Authorization', `Bearer ${spec.nonMatchingToken()}`);

      expect(nonMatchingDetailRes.status).toBe(404);
    });
  }
});
