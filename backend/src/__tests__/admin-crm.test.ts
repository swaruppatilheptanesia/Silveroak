import request from 'supertest';
import app from '../app';
import { prisma } from '../config/database';

let superAdminToken: string;
const createdUserIds: string[] = [];
let fetchSpy: jest.SpyInstance;

beforeAll(async () => {
  await prisma.user.deleteMany({
    where: {
      email: {
        in: ['crm.faculty@silveroakuni.ac.in', 'crm.tpo@silveroakuni.ac.in', 'duplicate.crm@silveroakuni.ac.in'],
      },
    },
  });

  const login = await request(app)
    .post('/api/auth/login')
    .send({ email: 'superadmin@silveroak.ac.in', password: 'Password@123' });

  superAdminToken = login.body.token;
});

beforeEach(() => {
  fetchSpy = jest.spyOn(global, 'fetch').mockImplementation(async (input: any) => {
    const url = String(input);

    if (url.includes('GetAllDepartments')) {
      const payload = url.includes('DepartmentType=2')
        ? [
            { id: 11, departmentName: 'DEPARTMENT OF HUMAN RESOURCES' },
            { id: 12, departmentName: 'DEPARTMENT OF TALENT ACQUISITION' },
          ]
        : [
            { id: 1, departmentName: 'DEPARTMENT OF AERONAUTICAL ENGINEERING' },
            { id: 2, departmentName: 'DEPARTMENT OF CHEMICAL ENGINEERING' },
          ];

      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }) as unknown as Response;
    }

    if (url.includes('GetEmployeesList')) {
      const payload = url.includes('DepartmentType=2')
        ? [{ employeeCode: 2244, employeeName: 'ANITA SHAH' }]
        : [{ employeeCode: 1137, employeeName: 'RUSHIL VIJAYBHAI SHAH' }];

      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }) as unknown as Response;
    }

    if (url.includes('GetEmployeeDetail')) {
      const payload = url.includes('EmpId=2244')
        ? [{
            employeeCode: 2244,
            employeeName: 'ANITA SHAH',
            department: 'DEPARTMENT OF HUMAN RESOURCES',
            personalEmail: 'anita.personal@example.com',
            officialEmail: 'anita.hr@socet.edu.in',
            mobileNo: '9876500002',
            designation: 'HR MANAGER',
          }]
        : [{
            employeeCode: 1137,
            employeeName: 'RUSHIL VIJAYBHAI SHAH',
            department: 'DEPARTMENT OF AERONAUTICAL ENGINEERING',
            personalEmail: 'rushil@gmail.com',
            officialEmail: 'rushil.me@socet.edu.in',
            mobileNo: '9876500001',
            designation: 'HEAD OF DEPARTMENT',
          }];

      return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }) as unknown as Response;
    }

    return new Response(JSON.stringify([]), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    }) as unknown as Response;
  });
});

afterEach(() => {
  fetchSpy.mockRestore();
});

afterAll(async () => {
  if (createdUserIds.length > 0) {
    await prisma.user.deleteMany({
      where: { id: { in: createdUserIds } },
    });
  }

  await prisma.refreshToken.deleteMany({});
  await prisma.$disconnect();
});

describe('Admin CRM lookups', () => {
  it('should fetch academic and HR departments from CRM', async () => {
    const academicRes = await request(app)
      .get('/api/admin/crm/departments')
      .query({ department_type: 1 })
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(academicRes.status).toBe(200);
    expect(academicRes.body.data).toHaveLength(2);
    expect(academicRes.body.data[0]).toEqual({
      id: 1,
      departmentName: 'DEPARTMENT OF AERONAUTICAL ENGINEERING',
    });

    const hrRes = await request(app)
      .get('/api/admin/crm/departments')
      .query({ department_type: 2 })
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(hrRes.status).toBe(200);
    expect(hrRes.body.data).toHaveLength(2);
    expect(hrRes.body.data[0].departmentName).toBe('DEPARTMENT OF HUMAN RESOURCES');
  });

  it('should fetch CRM employees and employee detail', async () => {
    const employeesRes = await request(app)
      .get('/api/admin/crm/employees')
      .query({ department_type: 1, department_id: 1 })
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(employeesRes.status).toBe(200);
    expect(employeesRes.body.data).toEqual([
      {
        employeeCode: 1137,
        employeeName: 'RUSHIL VIJAYBHAI SHAH',
      },
    ]);

    const detailRes = await request(app)
      .get('/api/admin/crm/employees/1137')
      .set('Authorization', `Bearer ${superAdminToken}`);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.officialEmail).toBe('rushil.me@socet.edu.in');
    expect(detailRes.body.mobileNo).toBe('9876500001');
    expect(detailRes.body.designation).toBe('HEAD OF DEPARTMENT');
  });

  it('should create faculty and tpo admin users from CRM data', async () => {
    const facultyRes = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        email: 'crm.faculty@silveroakuni.ac.in',
        password: 'Password@123',
        name: 'RUSHIL VIJAYBHAI SHAH',
        role: 'faculty_coordinator',
        phone: '9876500001',
        department: 'DEPARTMENT OF AERONAUTICAL ENGINEERING',
        designation: 'HEAD OF DEPARTMENT',
        crm_employee_code: '1137',
      });

    expect(facultyRes.status).toBe(201);
    expect(facultyRes.body.phone).toBe('9876500001');
    expect(facultyRes.body.designation).toBe('HEAD OF DEPARTMENT');
    expect(facultyRes.body.crm_employee_code).toBe('1137');
    createdUserIds.push(facultyRes.body.id);

    const tpoRes = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        email: 'crm.tpo@silveroakuni.ac.in',
        password: 'Password@123',
        name: 'ANITA SHAH',
        role: 'tpo_admin',
        phone: '9876500002',
        department: 'DEPARTMENT OF HUMAN RESOURCES',
        designation: 'HR MANAGER',
        crm_employee_code: '2244',
      });

    expect(tpoRes.status).toBe(201);
    expect(tpoRes.body.phone).toBe('9876500002');
    expect(tpoRes.body.designation).toBe('HR MANAGER');
    expect(tpoRes.body.crm_employee_code).toBe('2244');
    createdUserIds.push(tpoRes.body.id);

    const persistedFaculty = await prisma.user.findUnique({
      where: { id: facultyRes.body.id },
    });
    expect(persistedFaculty?.crm_employee_code).toBe('1137');
    expect(persistedFaculty?.phone).toBe('9876500001');

    const persistedTpo = await prisma.user.findUnique({
      where: { id: tpoRes.body.id },
    });
    expect(persistedTpo?.crm_employee_code).toBe('2244');
    expect(persistedTpo?.designation).toBe('HR MANAGER');
  });

  it('should reject duplicate CRM employee mapping', async () => {
    const res = await request(app)
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${superAdminToken}`)
      .send({
        email: 'duplicate.crm@silveroakuni.ac.in',
        password: 'Password@123',
        name: 'Duplicate CRM',
        role: 'tpo_admin',
        phone: '9876509999',
        department: 'DEPARTMENT OF HUMAN RESOURCES',
        designation: 'HR EXECUTIVE',
        crm_employee_code: '1137',
      });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('CRM_EMPLOYEE_EXISTS');
  });
});
