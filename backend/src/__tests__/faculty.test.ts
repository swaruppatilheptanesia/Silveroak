import request from 'supertest';
import app from '../app';
import { prisma } from '../config/database';

let adminToken: string;
let facultyToken: string;
let tenantId: string;
let companyId: string;
let postingId: string;
let csUserId: string;
let itUserId: string;
let csStudentId: string;
let itStudentId: string;
let csPortfolioId: string;
let itPortfolioId: string;
let csProjectId: string;
let itProjectId: string;
let csOfferId: string;
let itOfferId: string;

const uniqueMarker = `FacultyScope${Date.now()}`;
const csEmail = `${uniqueMarker.toLowerCase()}-cs@silveroak.ac.in`;
const itEmail = `${uniqueMarker.toLowerCase()}-it@silveroak.ac.in`;

beforeAll(async () => {
  const adminLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'tpoadmin@silveroak.ac.in', password: 'Password@123' });
  adminToken = adminLogin.body.token;

  const facultyLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'faculty@silveroak.ac.in', password: 'Password@123' });
  facultyToken = facultyLogin.body.token;

  const adminUser = await prisma.user.findFirstOrThrow({
    where: { email: 'tpoadmin@silveroak.ac.in' },
    select: { tenant_id: true },
  });
  tenantId = adminUser.tenant_id;

  const companyResponse = await request(app)
    .get('/api/companies?limit=1')
    .set('Authorization', `Bearer ${adminToken}`);
  companyId = companyResponse.body.data[0].id;

  const posting = await prisma.posting.create({
    data: {
      tenant_id: tenantId,
      company_id: companyId,
      title: `${uniqueMarker} Posting`,
      type: 'job',
      academic_year: '2026-27',
      role_name: 'Faculty Scope Engineer',
      location: 'Ahmedabad',
      work_mode: 'onsite',
      status: 'published',
    },
  });
  postingId = posting.id;

  const csUser = await prisma.user.create({
    data: {
      tenant_id: tenantId,
      email: csEmail,
      password_hash: 'test-password-hash',
      role: 'student',
      name: `${uniqueMarker} CS Student`,
      department: 'Computer Science',
    },
  });
  csUserId = csUser.id;

  const itUser = await prisma.user.create({
    data: {
      tenant_id: tenantId,
      email: itEmail,
      password_hash: 'test-password-hash',
      role: 'student',
      name: `${uniqueMarker} IT Student`,
      department: 'Information Technology',
    },
  });
  itUserId = itUser.id;

  const csStudent = await prisma.student.create({
    data: {
      user_id: csUser.id,
      tenant_id: tenantId,
      enrollment_number: `${uniqueMarker}CS`,
      roll_number: `${uniqueMarker}CSR`,
      full_name: `${uniqueMarker} CS Student`,
      email: csEmail,
      mobile: '+91 90000 00001',
      department: 'Computer Science',
      batch: '2026',
      course: 'B.Tech',
      institute: 'Silver Oak University',
      residential_address: 'Ahmedabad',
      permanent_address: 'Ahmedabad',
      profile_completion_percentage: 96,
      policy_accepted: true,
      policy_accepted_at: new Date(),
      verification_status: 'verified',
    },
  });
  csStudentId = csStudent.id;

  const itStudent = await prisma.student.create({
    data: {
      user_id: itUser.id,
      tenant_id: tenantId,
      enrollment_number: `${uniqueMarker}IT`,
      roll_number: `${uniqueMarker}ITR`,
      full_name: `${uniqueMarker} IT Student`,
      email: itEmail,
      mobile: '+91 90000 00002',
      department: 'Information Technology',
      batch: '2026',
      course: 'B.Tech',
      institute: 'Silver Oak University',
      residential_address: 'Ahmedabad',
      permanent_address: 'Ahmedabad',
      profile_completion_percentage: 94,
      policy_accepted: true,
      policy_accepted_at: new Date(),
      verification_status: 'verified',
    },
  });
  itStudentId = itStudent.id;

  await prisma.academicProfile.createMany({
    data: [
      {
        student_id: csStudentId,
        cgpa: 8.4,
        tenth_percentage: 78,
        twelfth_percentage: 74,
        backlog_count: 0,
        active_backlogs: 0,
        semester: 6,
        year_of_study: 3,
      },
      {
        student_id: itStudentId,
        cgpa: 8.1,
        tenth_percentage: 76,
        twelfth_percentage: 72,
        backlog_count: 0,
        active_backlogs: 0,
        semester: 6,
        year_of_study: 3,
      },
    ],
  });

  await prisma.skillsProfile.createMany({
    data: [
      {
        student_id: csStudentId,
        technical_skills: ['React', 'Node.js'],
        domain_interests: ['Web Development'],
        preferred_locations: ['Ahmedabad'],
      },
      {
        student_id: itStudentId,
        technical_skills: ['Java', 'Spring Boot'],
        domain_interests: ['Backend'],
        preferred_locations: ['Ahmedabad'],
      },
    ],
  });

  const csPortfolio = await prisma.portfolio.create({
    data: {
      student_id: csStudentId,
      status: 'published',
      project_count: 1,
      internship_count: 0,
    },
  });
  csPortfolioId = csPortfolio.id;

  const itPortfolio = await prisma.portfolio.create({
    data: {
      student_id: itStudentId,
      status: 'published',
      project_count: 1,
      internship_count: 0,
    },
  });
  itPortfolioId = itPortfolio.id;

  const csProject = await prisma.studentProject.create({
    data: {
      student_id: csStudentId,
      portfolio_id: csPortfolioId,
      title: `${uniqueMarker} CS Project`,
      description: 'Faculty portfolio visibility test',
      role: 'Developer',
      technologies: ['React'],
      keywords: ['faculty-scope'],
      display_order: 0,
    },
  });
  csProjectId = csProject.id;

  const itProject = await prisma.studentProject.create({
    data: {
      student_id: itStudentId,
      portfolio_id: itPortfolioId,
      title: `${uniqueMarker} IT Project`,
      description: 'Faculty should not see this portfolio',
      role: 'Developer',
      technologies: ['Java'],
      keywords: ['faculty-scope'],
      display_order: 0,
    },
  });
  itProjectId = itProject.id;

  const csOffer = await prisma.offer.create({
    data: {
      tenant_id: tenantId,
      student_id: csStudentId,
      posting_id: postingId,
      company_id: companyId,
      type: 'job',
      role: `${uniqueMarker} CS Offer`,
      offer_date: new Date('2026-04-01'),
    },
  });
  csOfferId = csOffer.id;

  const itOffer = await prisma.offer.create({
    data: {
      tenant_id: tenantId,
      student_id: itStudentId,
      posting_id: postingId,
      company_id: companyId,
      type: 'job',
      role: `${uniqueMarker} IT Offer`,
      offer_date: new Date('2026-04-01'),
    },
  });
  itOfferId = itOffer.id;
});

afterAll(async () => {
  await prisma.offerAudit.deleteMany({
    where: {
      offer_id: { in: [csOfferId, itOfferId].filter(Boolean) },
    },
  });
  await prisma.offer.deleteMany({
    where: {
      id: { in: [csOfferId, itOfferId].filter(Boolean) },
    },
  });
  await prisma.studentProject.deleteMany({
    where: {
      id: { in: [csProjectId, itProjectId].filter(Boolean) },
    },
  });
  await prisma.portfolio.deleteMany({
    where: {
      id: { in: [csPortfolioId, itPortfolioId].filter(Boolean) },
    },
  });
  await prisma.skillsProfile.deleteMany({
    where: {
      student_id: { in: [csStudentId, itStudentId].filter(Boolean) },
    },
  });
  await prisma.academicProfile.deleteMany({
    where: {
      student_id: { in: [csStudentId, itStudentId].filter(Boolean) },
    },
  });
  await prisma.student.deleteMany({
    where: {
      id: { in: [csStudentId, itStudentId].filter(Boolean) },
    },
  });
  await prisma.user.deleteMany({
    where: {
      id: { in: [csUserId, itUserId].filter(Boolean) },
    },
  });
  await prisma.posting.deleteMany({
    where: {
      id: { in: [postingId].filter(Boolean) },
    },
  });
  await prisma.refreshToken.deleteMany({});
  await prisma.$disconnect();
});

describe('Faculty module APIs', () => {
  it('should get faculty dashboard data', async () => {
    const res = await request(app)
      .get('/api/faculty/dashboard')
      .set('Authorization', `Bearer ${facultyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.departmentStats.department).toBe('Computer Science');
    expect(res.body.departmentStats.totalStudents).toBeGreaterThan(0);
    expect(Array.isArray(res.body.recentStudents)).toBe(true);
  });

  it('should list only faculty department students', async () => {
    const res = await request(app)
      .get('/api/faculty/students')
      .query({ search: uniqueMarker })
      .set('Authorization', `Bearer ${facultyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(csStudentId);
    expect(res.body.data[0].department).toBe('Computer Science');
    expect(res.body.data[0].eligibility_status).toBe('eligible');
  });

  it('should get faculty student detail inside department', async () => {
    const res = await request(app)
      .get(`/api/faculty/students/${csStudentId}`)
      .set('Authorization', `Bearer ${facultyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(csStudentId);
    expect(res.body.skillsProfile.technical_skills).toContain('React');
    expect(res.body.portfolioSummary.status).toBe('published');
  });

  it('should hide students from other departments', async () => {
    const res = await request(app)
      .get(`/api/faculty/students/${itStudentId}`)
      .set('Authorization', `Bearer ${facultyToken}`);

    expect(res.status).toBe(404);
  });
});

describe('Faculty portfolio and offers access', () => {
  it('should get read-only portfolio for department student', async () => {
    const res = await request(app)
      .get(`/api/portfolio/${csStudentId}`)
      .set('Authorization', `Bearer ${facultyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('published');
    expect(res.body.student.id).toBe(csStudentId);
    expect(res.body.portfolio.projects).toHaveLength(1);
  });

  it('should not get portfolio for another department student', async () => {
    const res = await request(app)
      .get(`/api/portfolio/${itStudentId}`)
      .set('Authorization', `Bearer ${facultyToken}`);

    expect(res.status).toBe(404);
  });

  it('should list only department-scoped offers for faculty', async () => {
    const res = await request(app)
      .get('/api/offers')
      .query({ search: uniqueMarker })
      .set('Authorization', `Bearer ${facultyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].id).toBe(csOfferId);
    expect(res.body.data[0].student.department).toBe('Computer Science');
  });

  it('should allow faculty to get offer detail for department student', async () => {
    const res = await request(app)
      .get(`/api/offers/${csOfferId}`)
      .set('Authorization', `Bearer ${facultyToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(csOfferId);
    expect(res.body.student.id).toBe(csStudentId);
  });

  it('should hide offer detail for another department student', async () => {
    const res = await request(app)
      .get(`/api/offers/${itOfferId}`)
      .set('Authorization', `Bearer ${facultyToken}`);

    expect(res.status).toBe(404);
  });
});
