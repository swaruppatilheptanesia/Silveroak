import request from 'supertest';
import app from '../app';
import { prisma } from '../config/database';

let studentToken: string;
let adminToken: string;

const SMALL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO2p6XQAAAAASUVORK5CYII=',
  'base64'
);

beforeAll(async () => {
  // Login as student
  const sRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'student@silveroak.ac.in', password: 'Password@123' });
  studentToken = sRes.body.token;

  await request(app)
    .post('/api/students/me/profile-photo')
    .set('Authorization', `Bearer ${studentToken}`)
    .attach('file', SMALL_PNG, {
      filename: 'bootstrap-avatar.png',
      contentType: 'image/png',
    });

  // Login as admin (for role-check tests)
  const aRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'tpoadmin@silveroak.ac.in', password: 'Password@123' });
  adminToken = aRes.body.token;
});

afterAll(async () => {
  await prisma.refreshToken.deleteMany({});
  await prisma.$disconnect();
});

// =========================================================
// Profile
// =========================================================
describe('GET /api/students/me', () => {
  it('should return student profile', async () => {
    const res = await request(app)
      .get('/api/students/me')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.student).toHaveProperty('full_name', 'Rahul Sharma');
    expect(res.body.student).toHaveProperty('enrollment_number', 'SOU2023CS001');
    expect(res.body).toHaveProperty('academic');
    expect(res.body).toHaveProperty('skills');
  });

  it('should reject non-student role', async () => {
    const res = await request(app)
      .get('/api/students/me')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(403);
  });
});

describe('PUT /api/students/me/personal', () => {
  it('should update alternate phone and linkedin URL', async () => {
    const res = await request(app)
      .put('/api/students/me/personal')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        alternate_phone: '+91-9999999999',
        linkedin_url: 'https://www.linkedin.com/in/student-profile',
      });

    expect(res.status).toBe(200);
    expect(res.body.alternate_phone).toBe('+91-9999999999');
    expect(res.body.linkedin_url).toBe('https://www.linkedin.com/in/student-profile');
  });

  it('should reject unsupported personal fields', async () => {
    const res = await request(app)
      .put('/api/students/me/personal')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ full_name: 'New Name' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('should reject invalid alternate phone number', async () => {
    const res = await request(app)
      .put('/api/students/me/personal')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ alternate_phone: 'abc' });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/students/me/profile-photo', () => {
  it('should upload a profile photo', async () => {
    const res = await request(app)
      .post('/api/students/me/profile-photo')
      .set('Authorization', `Bearer ${studentToken}`)
      .attach('file', SMALL_PNG, {
        filename: 'avatar.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(200);
    expect(res.body.profile_photo_url).toMatch(/^\/uploads\/profile-photos\//);
  });

  it('should reject profile photo upload without file', async () => {
    const res = await request(app)
      .post('/api/students/me/profile-photo')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FILE_REQUIRED');
  });

  it('should reject invalid profile photo file types', async () => {
    const res = await request(app)
      .post('/api/students/me/profile-photo')
      .set('Authorization', `Bearer ${studentToken}`)
      .attach('file', Buffer.from('not-an-image'), {
        filename: 'avatar.txt',
        contentType: 'text/plain',
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('PUT /api/students/me/academic', () => {
  it('should reject student-side academic updates because records are institute-managed', async () => {
    const res = await request(app)
      .put('/api/students/me/academic')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ cgpa: 9.0, semester: 6 });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACADEMIC_RECORDS_READ_ONLY');
  });

  it('should reject CGPA > 10', async () => {
    const res = await request(app)
      .put('/api/students/me/academic')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ cgpa: 11 });

    expect(res.status).toBe(400);
  });

  it('should reject percentage > 100', async () => {
    const res = await request(app)
      .put('/api/students/me/academic')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ tenth_percentage: 105 });

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/students/me/skills', () => {
  it('should update skills profile', async () => {
    const res = await request(app)
      .put('/api/students/me/skills')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        technical_skills: ['React', 'Node.js', 'Python'],
        domain_interests: ['AI', 'Cloud'],
      });

    expect(res.status).toBe(200);
    expect(res.body.technical_skills).toContain('React');
  });
});

// =========================================================
// Projects
// =========================================================
describe('Student Projects CRUD', () => {
  let projectId: string;

  it('should create a project', async () => {
    const res = await request(app)
      .post('/api/students/me/projects')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        title: 'E-Commerce Platform',
        description: 'Full-stack e-commerce app',
        technologies: ['React', 'Node.js', 'PostgreSQL'],
        github_url: 'https://github.com/test/ecom',
        demo_url: 'https://example.com/ecommerce-demo',
        start_date: '2024-01-01',
        end_date: '2024-04-30',
        is_ongoing: false,
      });

    expect(res.status).toBe(201);
    expect(res.body.title).toBe('E-Commerce Platform');
    projectId = res.body.id;
  });

  it('should list projects', async () => {
    const res = await request(app)
      .get('/api/students/me/projects')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.projects.length).toBeGreaterThanOrEqual(1);
  });

  it('should update a project', async () => {
    const res = await request(app)
      .put(`/api/students/me/projects/${projectId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ title: 'E-Commerce Platform v2' });

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('E-Commerce Platform v2');
  });

  it('should reject update of non-existent project', async () => {
    const res = await request(app)
      .put('/api/students/me/projects/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ title: 'X' });

    expect(res.status).toBe(404);
  });

  it('should delete a project', async () => {
    const res = await request(app)
      .delete(`/api/students/me/projects/${projectId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
  });

  it('should reject create without title', async () => {
    const res = await request(app)
      .post('/api/students/me/projects')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ description: 'No title' });

    expect(res.status).toBe(400);
  });
});

// =========================================================
// Certifications
// =========================================================
describe('Student Certifications CRUD', () => {
  let certId: string;

  it('should create a certification', async () => {
    const res = await request(app)
      .post('/api/students/me/certifications')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        name: 'AWS Solutions Architect',
        issuer: 'Amazon Web Services',
        credential_url: 'https://aws.amazon.com/cert/123',
        document_url: '/uploads/certification-documents/aws-cert.pdf',
        document_name: 'aws-cert.pdf',
        document_mime_type: 'application/pdf',
        document_size: 1024,
      });

    expect(res.status).toBe(201);
    certId = res.body.id;
  });

  it('should list certifications', async () => {
    const res = await request(app)
      .get('/api/students/me/certifications')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.certifications.length).toBeGreaterThanOrEqual(1);
  });

  it('should delete a certification', async () => {
    const res = await request(app)
      .delete(`/api/students/me/certifications/${certId}`)
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
  });
});

// =========================================================
// Employment
// =========================================================
describe('Student Employment', () => {
  it('should update employment', async () => {
    const res = await request(app)
      .put('/api/students/me/employment')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        is_currently_working: true,
        employment_type: 'part-time',
        company_name: 'TechCorp',
        designation: 'SDE Intern',
        duration: '0-6 months',
        package_lpa: 4.5,
      });

    expect(res.status).toBe(200);
    expect(res.body.is_currently_working).toBe(true);
    expect(Number(res.body.package_lpa)).toBe(4.5);
  });

  it('should get employment', async () => {
    const res = await request(app)
      .get('/api/students/me/employment')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.company_name).toBe('TechCorp');
  });
});

describe('Student Access Gate', () => {
  it('should block student routes when the profile photo is missing', async () => {
    const user = await prisma.user.findFirst({
      where: { email: 'student@silveroak.ac.in' },
      select: { id: true },
    });

    if (!user) {
      throw new Error('Seeded student user not found');
    }

    const student = await prisma.student.findUnique({
      where: { user_id: user.id },
      select: { id: true, profile_photo_url: true },
    });

    if (!student) {
      throw new Error('Seeded student profile not found');
    }

    const previousPhotoUrl = student.profile_photo_url;

    try {
      await prisma.student.update({
        where: { id: student.id },
        data: { profile_photo_url: null },
      });

      const res = await request(app)
        .get('/api/students/me/projects')
        .set('Authorization', `Bearer ${studentToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('PROFILE_PHOTO_REQUIRED');
    } finally {
      await prisma.student.update({
        where: { id: student.id },
        data: { profile_photo_url: previousPhotoUrl },
      });
    }
  });
});

// =========================================================
// Resumes (without file upload - test metadata only)
// =========================================================
describe('Student Resumes', () => {
  it('should list resumes (initially empty or from seed)', async () => {
    const res = await request(app)
      .get('/api/students/me/resumes')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('resumes');
  });

  it('should reject resume upload without file', async () => {
    const res = await request(app)
      .post('/api/students/me/resumes')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({});

    expect(res.status).toBe(400);
  });
});

// =========================================================
// Policy (already accepted in seed - test rejection)
// =========================================================
describe('Policy Acceptance', () => {
  it('should handle placement policy acceptance based on the current seed state', async () => {
    const profileRes = await request(app)
      .get('/api/students/me')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(profileRes.status).toBe(200);

    const expectedStatus = profileRes.body.student.policy_accepted ? 422 : 200;

    const res = await request(app)
      .post('/api/students/me/policy-acceptance')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        policy_read: true,
        rules_accepted: true,
        profile_sharing_consent: true,
        resume_sharing_consent: true,
        data_storage_consent: true,
        communication_consent: true,
      });

    expect(res.status).toBe(expectedStatus);
    if (expectedStatus === 422) {
      expect(res.body.error.code).toBe('POLICY_ALREADY_ACCEPTED');
    }
  });

  it('should reject partial acceptance', async () => {
    const res = await request(app)
      .post('/api/students/me/policy-acceptance')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        policy_read: true,
        rules_accepted: false,
        profile_sharing_consent: true,
        resume_sharing_consent: true,
        data_storage_consent: true,
        communication_consent: true,
      });

    expect(res.status).toBe(400);
  });
});

// =========================================================
// Interest Registration
// =========================================================
describe('Interest Registration', () => {
  it('should register interests', async () => {
    const res = await request(app)
      .post('/api/students/me/interests')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ interest_types: ['PGDM All', 'Placement'] });

    expect(res.status).toBe(200);
    expect(res.body.interests).toHaveLength(2);
  });

  it('should allow interest registration even when profile completion is low and policy is not accepted', async () => {
    const user = await prisma.user.findFirst({
      where: { email: 'student@silveroak.ac.in' },
      select: { id: true },
    });

    if (!user) {
      throw new Error('Seeded student user not found');
    }

    const student = await prisma.student.findUnique({
      where: { user_id: user.id },
      select: {
        id: true,
        profile_completion_percentage: true,
        policy_accepted: true,
        policy_accepted_at: true,
      },
    });

    if (!student) {
      throw new Error('Seeded student profile not found');
    }

    const originalState = {
      profile_completion_percentage: student.profile_completion_percentage,
      policy_accepted: student.policy_accepted,
      policy_accepted_at: student.policy_accepted_at,
    };

    const candidateInterestTypes = [
      'PGDM All',
      'Placement',
      'job',
      'summer internship',
    ] as const;

    const existingRegistrations = await prisma.interestRegistration.findMany({
      where: { student_id: student.id },
      select: { interest_type: true },
    });
    const existingInterestTypes = new Set(existingRegistrations.map((registration) => registration.interest_type as string));
    const targetInterestType =
      candidateInterestTypes.find((interestType) => !existingInterestTypes.has(interestType)) ?? 'placement';

    try {
      await prisma.student.update({
        where: { id: student.id },
        data: {
          profile_completion_percentage: 10,
          policy_accepted: false,
          policy_accepted_at: null,
        },
      });

      const res = await request(app)
        .post('/api/students/me/interests')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({ interest_types: [targetInterestType] });

      expect(res.status).toBe(200);
      expect(
        res.body.interests.some(
          (item: { interest_type: string }) =>
            item.interest_type.trim().toLowerCase().replace(/\s+/g, ' ')
            === targetInterestType.trim().toLowerCase().replace(/\s+/g, ' ')
        )
      ).toBe(true);
    } finally {
      await prisma.student.update({
        where: { id: student.id },
        data: originalState,
      });
    }
  });

  it('should get interests', async () => {
    const res = await request(app)
      .get('/api/students/me/interests')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    expect(res.body.interests.length).toBeGreaterThanOrEqual(2);
  });

  it('should reject invalid interest type', async () => {
    const res = await request(app)
      .post('/api/students/me/interests')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ interest_types: ['invalid_type'] });

    expect(res.status).toBe(400);
  });

  it('should idempotently re-register same interests', async () => {
    const res = await request(app)
      .post('/api/students/me/interests')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({ interest_types: ['Placement'] });

    expect(res.status).toBe(200);
  });
});

// =========================================================
// Profile Completion
// =========================================================
describe('Profile Completion', () => {
  it('should recalculate completion after updates', async () => {
    const res = await request(app)
      .get('/api/students/me')
      .set('Authorization', `Bearer ${studentToken}`);

    expect(res.status).toBe(200);
    // With seed data (name, mobile, dob, gender, dept, batch, academic, skills) + linkedin added above
    expect(res.body.student.profile_completion_percentage).toBeGreaterThan(50);
  });
});
