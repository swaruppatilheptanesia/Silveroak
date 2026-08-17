import request from 'supertest';
import app from '../app';
import { prisma } from '../config/database';

let adminToken: string;
let tenantId: string;
let adminUserId: string;
const createdRuleIds: string[] = [];
const createdStudentIds: string[] = [];
const createdUserIds: string[] = [];
const createdOfferIds: string[] = [];

type TempStudentSeed = {
  userId: string;
  studentId: string;
  fullName: string;
};

let pendingStudentOne: TempStudentSeed;
let pendingStudentTwo: TempStudentSeed;
let pendingStudentThree: TempStudentSeed;

beforeAll(async () => {
  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'tpoadmin@silveroak.ac.in', password: 'Password@123' });

  adminToken = adminLogin.body.token;

  const adminUser = await prisma.user.findFirst({
    where: { email: 'tpoadmin@silveroak.ac.in' },
  });

  tenantId = adminUser!.tenant_id;
  adminUserId = adminUser!.id;

  pendingStudentOne = await createTempStudent('Codex Pending Student One', 'CXS-001', 7.8);
  pendingStudentTwo = await createTempStudent('Codex Pending Student Two', 'CXS-002', 8.2);
  pendingStudentThree = await createTempStudent('Codex Pending Student Three', 'CXS-003', 6.9);

  await createPlacementOfferFixture(pendingStudentOne.studentId);
});

afterAll(async () => {
  if (createdOfferIds.length > 0) {
    await prisma.offer.deleteMany({
      where: { id: { in: createdOfferIds } },
    });
  }

  if (createdRuleIds.length > 0) {
    await prisma.eligibilityRule.deleteMany({
      where: { id: { in: createdRuleIds } },
    });
  }

  if (createdStudentIds.length > 0) {
    await prisma.student.deleteMany({
      where: { id: { in: createdStudentIds } },
    });
  }

  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds } },
    });
  }

  await prisma.$disconnect();
});

describe('Admin student management APIs', () => {
  it('should list pending students with pagination and filters', async () => {
    const res = await request(app)
      .get('/api/admin/students')
      .query({
        verification_status: 'pending',
        search: 'Codex Pending Student',
        limit: 10,
      })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.pagination.total).toBeGreaterThanOrEqual(3);
    expect(res.body.data[0]).toHaveProperty('verificationStatus', 'pending');
    expect(res.body.data[0]).toHaveProperty('academicProfile');
  });

  it('should return a student detail record', async () => {
    const res = await request(app)
      .get(`/api/admin/students/${pendingStudentOne.studentId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.student_id).toBe(pendingStudentOne.studentId);
    expect(res.body.full_name).toBe(pendingStudentOne.fullName);
  });

  it('should require remarks when rejecting a student', async () => {
    const res = await request(app)
      .put(`/api/admin/students/${pendingStudentTwo.studentId}/verification`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'rejected' });

    expect(res.status).toBe(400);
  });

  it('should block and unblock a student profile with a reason', async () => {
    const blockRes = await request(app)
      .put(`/api/admin/students/${pendingStudentThree.studentId}/profile-block`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        profile_blocked: true,
        reason: 'Profile needs correction before access can continue.',
      });

    expect(blockRes.status).toBe(200);
    expect(blockRes.body.profile_blocked).toBe(true);
    expect(blockRes.body.profile_block_reason).toBe('Profile needs correction before access can continue.');

    const unblockRes = await request(app)
      .put(`/api/admin/students/${pendingStudentThree.studentId}/profile-block`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ profile_blocked: false });

    expect(unblockRes.status).toBe(200);
    expect(unblockRes.body.profile_blocked).toBe(false);
    expect(unblockRes.body.profile_block_reason).toBeNull();
  });

  it('should reject a student with remarks', async () => {
    const res = await request(app)
      .put(`/api/admin/students/${pendingStudentTwo.studentId}/verification`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'rejected',
        remarks: 'Pending documents were not uploaded.',
      });

    expect(res.status).toBe(200);
    expect(res.body.verificationStatus).toBe('rejected');
    expect(res.body.verification_remarks).toBe('Pending documents were not uploaded.');
  });

  it('should bulk verify pending students', async () => {
    const res = await request(app)
      .post('/api/admin/students/verification/bulk')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        student_ids: [pendingStudentOne.studentId, pendingStudentThree.studentId],
        remarks: 'Verified in bulk review.',
      });

    expect(res.status).toBe(200);
    expect(res.body.updated_count).toBe(2);
  });

  it('should list eligibility rules', async () => {
    const createRes = await request(app)
      .post('/api/admin/eligibility-rules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        rule_name: 'Codex List Eligibility Rule',
        min_cgpa: 6.0,
        max_backlogs: 2,
        required_branches: ['Computer Science'],
        eligible_batches: ['2023-27'],
      });

    expect(createRes.status).toBe(201);
    createdRuleIds.push(createRes.body.id);

    const res = await request(app)
      .get('/api/admin/eligibility-rules')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data[0]).toHaveProperty('eligible_students_count');
  });

  it('should create, update, and delete an eligibility rule', async () => {
    const createRes = await request(app)
      .post('/api/admin/eligibility-rules')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        rule_name: 'Codex Admin Test Rule',
        min_cgpa: 6.5,
        max_backlogs: 0,
        required_branches: ['Computer Science', 'Information Technology'],
        eligible_batches: ['2023-27', '2022-26'],
        min_tenth_percentage: 60,
        min_twelfth_percentage: 60,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.rule_name).toBe('Codex Admin Test Rule');
    expect(createRes.body.required_branches).toContain('Computer Science');

    createdRuleIds.push(createRes.body.id);

    const updateRes = await request(app)
      .put(`/api/admin/eligibility-rules/${createRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        min_cgpa: 7.1,
        required_branches: ['Computer Science'],
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body.min_cgpa).toBe(7.1);
    expect(updateRes.body.required_branches).toEqual(['Computer Science']);

    const deleteRes = await request(app)
      .delete(`/api/admin/eligibility-rules/${createRes.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.message).toMatch(/deleted/i);
  });

  it('should list portfolio monitoring data for all students including missing portfolios', async () => {
    const res = await request(app)
      .get('/api/admin/portfolios')
      .query({ search: 'Codex Pending Student One' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].student_name).toBe('Codex Pending Student One');
    expect(res.body.data[0].status).toBe('draft');
    expect(res.body.stats.total).toBeGreaterThanOrEqual(1);
  });

  it('should list selection database records with summary counts', async () => {
    const res = await request(app)
      .get('/api/admin/selection-database')
      .query({ type: 'placement' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.counts.placements).toBeGreaterThanOrEqual(1);
    expect(res.body.data.every((record: { type: string }) => record.type === 'placement')).toBe(true);
    expect(res.body.stats).toHaveProperty('total');
  });

  it('should return interest summary and filtered registrations', async () => {
    const summaryRes = await request(app)
      .get('/api/admin/interests/summary')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(summaryRes.status).toBe(200);
    const placementSummary = summaryRes.body.summary.find((entry: { interest_type: string }) => entry.interest_type === 'placement');
    expect(placementSummary).toBeDefined();
    expect(placementSummary.count).toBeGreaterThanOrEqual(1);

    const registrationsRes = await request(app)
      .get('/api/admin/interests/registrations')
      .query({ interest_type: 'placement' })
      .set('Authorization', `Bearer ${adminToken}`);

    expect(registrationsRes.status).toBe(200);
    expect(registrationsRes.body.total).toBeGreaterThanOrEqual(1);
    expect(registrationsRes.body.data[0]).toHaveProperty('academicProfile');
  });
});

async function createTempStudent(fullName: string, rollNumber: string, cgpa: number): Promise<TempStudentSeed> {
  const emailSlug = rollNumber.toLowerCase();
  const user = await prisma.user.create({
    data: {
      tenant_id: tenantId,
      email: `${emailSlug}@silveroak.test`,
      password_hash: 'temp-password-hash',
      name: fullName,
      role: 'student',
      department: 'Computer Science',
    },
  });
  createdUserIds.push(user.id);

  const student = await prisma.student.create({
    data: {
      user_id: user.id,
      tenant_id: tenantId,
      enrollment_number: `TEMP-${rollNumber}`,
      roll_number: rollNumber,
      full_name: fullName,
      email: `${emailSlug}@silveroak.test`,
      mobile: '+91-9000000000',
      department: 'Computer Science',
      batch: '2023-27',
      course: 'B.Tech Computer Science',
      institute: 'Silver Oak University',
      profile_completion_percentage: 78,
      verification_status: 'pending',
      policy_accepted: false,
    },
  });
  createdStudentIds.push(student.id);

  await prisma.academicProfile.create({
    data: {
      student_id: student.id,
      cgpa,
      tenth_percentage: 84,
      twelfth_percentage: 81,
      backlog_count: 0,
      active_backlogs: 0,
      semester: 6,
      year_of_study: 3,
      course_duration: 4,
    },
  });

  return {
    userId: user.id,
    studentId: student.id,
    fullName,
  };
}

async function createPlacementOfferFixture(studentId: string) {
  const posting = await prisma.posting.findFirst({
    where: {
      tenant_id: tenantId,
      type: 'job',
    },
    orderBy: {
      created_at: 'asc',
    },
  });

  if (!posting) {
    throw new Error('Expected a seeded job posting for admin selection database tests');
  }

  const offer = await prisma.offer.create({
    data: {
      tenant_id: tenantId,
      student_id: studentId,
      posting_id: posting.id,
      company_id: posting.company_id,
      type: 'job',
      role: 'Codex QA Engineer',
      ctc: '6.5 LPA',
      location: 'Ahmedabad',
      offer_date: new Date('2026-04-04'),
      status: 'accepted',
      accepted_at: new Date('2026-04-04'),
      joining_status: 'pending',
      is_locked: true,
      compliance_status: 'compliant',
      applications_blocked: true,
      created_by: adminUserId,
    },
  });

  createdOfferIds.push(offer.id);
}
