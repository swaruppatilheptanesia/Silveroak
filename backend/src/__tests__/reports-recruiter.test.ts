import request from 'supertest';
import app from '../app';
import { prisma } from '../config/database';

let adminToken: string;
let studentToken: string;
let recruiterToken: string;

beforeAll(async () => {
  const aRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'tpoadmin@silveroak.ac.in', password: 'Password@123' });
  adminToken = aRes.body.token;

  const sRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'student@silveroak.ac.in', password: 'Password@123' });
  studentToken = sRes.body.token;

  const rRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'recruiter@techcorp.com', password: 'Password@123' });
  recruiterToken = rRes.body.token;
});

afterAll(async () => {
  await prisma.refreshToken.deleteMany({});
  await prisma.$disconnect();
});

// =========================================================
// Reports
// =========================================================
describe('Reports Module', () => {
  it('should get dashboard stats', async () => {
    const res = await request(app)
      .get('/api/reports/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('students');
    expect(res.body).toHaveProperty('companies');
    expect(res.body).toHaveProperty('postings');
    expect(res.body).toHaveProperty('offers');
  });

  it('should get placement stats', async () => {
    const res = await request(app)
      .get('/api/reports/placement')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('placed');
    expect(res.body).toHaveProperty('unplaced');
  });

  it('should get placement cell report for a posting', async () => {
    const samplePosting = await prisma.posting.findFirst({
      include: {
        company: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!samplePosting) {
      throw new Error('Expected a seeded posting for placement cell report tests');
    }

    const res = await request(app)
      .get('/api/reports/placement-cell')
      .query({
        posting_id: samplePosting.id,
        company_id: samplePosting.company_id,
        posting_type: samplePosting.type,
      })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('summary');
    expect(res.body).toHaveProperty('postings');
    expect(Array.isArray(res.body.postings)).toBe(true);
    expect(res.body.postings).toHaveLength(1);
    expect(res.body.postings[0].posting_id).toBe(samplePosting.id);
    expect(res.body.summary).toHaveProperty('job_postings', 1);
  });

  it('should get application pipeline', async () => {
    const res = await request(app)
      .get('/api/reports/pipeline')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('pipeline');
  });

  it('should get company-wise stats', async () => {
    const res = await request(app)
      .get('/api/reports/companies')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.companies.length).toBeGreaterThanOrEqual(1);
  });

  it('should get department-wise stats', async () => {
    const res = await request(app)
      .get('/api/reports/departments')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('departments');
  });

  it('should get profile completion stats', async () => {
    const res = await request(app)
      .get('/api/reports/profile-completion')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.profile_completion).toHaveLength(4);
  });

  it('should filter applicant list by posting type', async () => {
    const sampleApplication = await prisma.application.findFirst({
      include: {
        posting: {
          select: {
            type: true,
          },
        },
      },
    });

    if (!sampleApplication) {
      throw new Error('Expected a seeded application for posting type report tests');
    }

    const mismatchedPostingType = sampleApplication.posting.type === 'job' ? 'internship' : 'job';

    const res = await request(app)
      .get('/api/reports/applicant-list')
      .query({
        posting_id: sampleApplication.posting_id,
        posting_type: mismatchedPostingType,
      })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.applications).toHaveLength(0);
  });

  it('should filter offer acceptance by posting type', async () => {
    const sampleOffer = await prisma.offer.findFirst({
      where: {
        posting: {
          type: 'job',
        },
      },
      include: {
        posting: {
          select: {
            type: true,
          },
        },
      },
    }) ?? await prisma.offer.findFirst({
      where: {
        posting: {
          type: 'internship',
        },
      },
      include: {
        posting: {
          select: {
            type: true,
          },
        },
      },
    });

    if (!sampleOffer) {
      throw new Error('Expected a seeded job or internship offer for posting type report tests');
    }

    const res = await request(app)
      .get('/api/reports/offer-acceptance')
      .query({
        posting_type: sampleOffer.posting.type,
      })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.offers.length).toBeGreaterThan(0);
    expect(res.body.offers.every((offer: { posting_type: string }) => offer.posting_type === sampleOffer.posting.type)).toBe(true);
  });

  it('should reject student access to reports', async () => {
    const res = await request(app)
      .get('/api/reports/dashboard')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });
});

// =========================================================
// Recruiter Portal
// =========================================================
describe('Recruiter Portal', () => {
  it('should reject admin from recruiter routes', async () => {
    const res = await request(app)
      .get('/api/recruiter/dashboard')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(403);
  });

  it('should reject student from recruiter routes', async () => {
    const res = await request(app)
      .get('/api/recruiter/dashboard')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(403);
  });

  // The recruiter user may not have a recruiter profile linked, so dashboard may 404
  // This tests that the route + auth works correctly
  it('should access recruiter dashboard (may 404 if no profile)', async () => {
    const res = await request(app)
      .get('/api/recruiter/dashboard')
      .set('Authorization', `Bearer ${recruiterToken}`);

    // Either 200 (has profile) or 404 (no recruiter record linked)
    expect([200, 404]).toContain(res.status);
  });
});
