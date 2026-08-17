import { EligibilityRule, Prisma, UserRole, VerificationStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { NotFoundError, BusinessRuleError } from '../../shared/errors';
import { buildStudentScopeConditions, buildDateRangeCondition } from '../../shared/utils/student-scope-filter';
import { paginate, buildPrismaQuery } from '../../shared/utils/pagination';
import { generateTemporaryPassword, hashPassword } from '../../shared/utils/password';
import type {
  BulkVerifyStudentsInput,
  CreateEligibilityRuleInput,
  CreateUserInput,
  CrmEmployeeParamInput,
  LinkRecruiterToCompanyInput,
  QueryAuditLogsInput,
  QueryCrmDepartmentsInput,
  QueryCrmEmployeesInput,
  QueryInterestRegistrationsInput,
  QueryPortfoliosInput,
  QuerySelectionDatabaseInput,
  QueryStudentsInput,
  QueryUsersInput,
  UpdateEligibilityRuleInput,
  UpdatePermissionInput,
  UpdateStudentProfileBlockInput,
  ReopenPlacementInput,
  UpdateUserInput,
  VerifyStudentInput,
  WithdrawInterestRegistrationInput,
} from './admin.schema';
import { createNotification } from '../notifications/notification.service';

const userListSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  phone: true,
  department: true,
  designation: true,
  crm_employee_code: true,
  institutes: true,
  courses: true,
  branches: true,
  is_active: true,
  last_login_at: true,
  created_at: true,
  recruiter_profile: {
    select: {
      id: true,
      company_id: true,
      verification_status: true,
      company: { select: { id: true, name: true } },
    },
  },
} as const;

const userDetailSelect = {
  ...userListSelect,
  updated_at: true,
} as const;

const adminStudentInclude = {
  academic_profile: true,
  skills_profile: true,
  employments: { orderBy: { created_at: 'desc' as const } },
  projects: { orderBy: { created_at: 'desc' as const } },
  certifications: { orderBy: { created_at: 'desc' as const } },
  resumes: { orderBy: { uploaded_at: 'desc' as const } },
  interest_registrations: {
    select: {
      id: true,
      interest_type: true,
      registered_at: true,
      status: true,
      reviewed_at: true,
      reviewed_by_name: true,
      status_reason: true,
    },
  },
  applications: {
    orderBy: { applied_at: 'desc' as const },
    include: {
      posting: {
        select: {
          id: true,
          title: true,
          role_name: true,
          posting_type_master: { select: { value: true } },
          status: true,
          ctc: true,
          stipend: true,
          company: { select: { id: true, name: true } },
        },
      },
      resume: { select: { id: true, name: true, file_url: true } },
    },
  },
  offers: {
    orderBy: { created_at: 'desc' as const },
    include: {
      company: { select: { id: true, name: true } },
      posting: { select: { id: true, title: true, role_name: true } },
    },
  },
  internships: {
    orderBy: { created_at: 'desc' as const },
    include: {
      issues: { select: { id: true, status: true } },
    },
  },
  noc_requests: { orderBy: { created_at: 'desc' as const } },
  policy_acceptances: {
    orderBy: { accepted_at: 'desc' as const },
    include: {
      policy: { select: { id: true, title: true, version: true, updated_at: true } },
    },
  },
  portfolio: {
    include: {
      projects: { orderBy: { display_order: 'asc' as const } },
      showcases: { orderBy: { created_at: 'desc' as const } },
    },
  },
  no_dues_requests: { orderBy: { created_at: 'desc' as const } },
  posting_type_preferences: {
    where: { interested: false },
    include: { posting_type_master: { select: { value: true } } },
  },
  placement_pref_history: { orderBy: { created_at: 'desc' as const }, take: 100 },
} as const;

type AdminStudentSource = Prisma.StudentGetPayload<{
  include: typeof adminStudentInclude;
}>;

type RuleMatchingStudent = Prisma.StudentGetPayload<{
  include: { academic_profile: true };
}>;

type PortfolioMonitoringStudent = Prisma.StudentGetPayload<{
  include: { portfolio: true };
}>;

type AdminActor = {
  id: string;
  name?: string | null;
};

type SelectionOutcome = 'joined' | 'not_joined' | 'pending';

const INTEREST_LABELS: Record<string, string> = {
  placement: 'Campus Placement',
  summer_internship: 'Summer Internship',
  winter_internship: 'Winter Internship',
  final_semester_internship: 'Final Semester Internship',
  nep_internship: 'NEP Internship (25 Days)',
  stipend_internship: 'Stipend Internship (OJT)',
  dissertation: 'Dissertation',
};

type CrmDepartment = {
  id?: number;
  departmentName?: string;
  DepartmentId?: number;
  DepartmentName?: string;
};

type CrmEmployee = {
  employeeCode?: number;
  employeeName?: string;
  EmployeeCode?: number;
  EmployeeName?: string;
};

type CrmEmployeeDetail = {
  employeeCode?: number;
  employeeName?: string;
  department?: string;
  personalEmail?: string;
  officialEmail?: string;
  mobileNo?: string;
  designation?: string;
  EmployeeCode?: number;
  EmployeeName?: string;
  Department?: string;
  PersonalEmail?: string;
  OfficialEmail?: string;
  MobileNo?: string;
  Designation?: string;
};

function makeCrmUrl(baseUrl: string, query: Record<string, string | number>) {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function pickCrmNumber(value: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const candidate = value[key];
    const parsed = Number(candidate);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return Number.NaN;
}

function pickCrmText(value: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return '';
}

async function fetchCrmArray<T>(url: string): Promise<T[]> {
  if (!env.crmApiKey) {
    throw new BusinessRuleError('CRM API key is not configured', 'CRM_CONFIG_MISSING');
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        'Api-Key': env.crmApiKey,
      },
    });
  } catch (err) {
    logger.error({ err, url }, 'CRM lookup request failed');
    throw new BusinessRuleError('Unable to reach CRM service', 'CRM_LOOKUP_FAILED');
  }

  if (!response.ok) {
    logger.warn({ url, status: response.status }, 'CRM lookup returned non-OK response');
    throw new BusinessRuleError('Unable to fetch CRM data', 'CRM_LOOKUP_FAILED');
  }

  const payload = await response.json().catch(() => null);
  if (!Array.isArray(payload)) {
    throw new BusinessRuleError('CRM returned an invalid response', 'CRM_INVALID_RESPONSE');
  }

  return payload as T[];
}

function normalizeCrmDepartment(item: CrmDepartment) {
  const raw = item as Record<string, unknown>;
  const id = pickCrmNumber(raw, ['id', 'Id', 'departmentId', 'DepartmentId']);
  const departmentName = pickCrmText(raw, ['departmentName', 'DepartmentName']);

  return Number.isFinite(id) && departmentName
    ? { id, departmentName }
    : null;
}

function normalizeCrmEmployee(item: CrmEmployee) {
  const raw = item as Record<string, unknown>;
  const employeeCode = pickCrmNumber(raw, ['employeeCode', 'EmployeeCode']);
  const employeeName = pickCrmText(raw, ['employeeName', 'EmployeeName']);

  return Number.isFinite(employeeCode) && employeeName
    ? { employeeCode, employeeName }
    : null;
}

function normalizeCrmEmployeeDetail(item: CrmEmployeeDetail) {
  const raw = item as Record<string, unknown>;
  const employeeCode = pickCrmNumber(raw, ['employeeCode', 'EmployeeCode']);
  const employeeName = pickCrmText(raw, ['employeeName', 'EmployeeName']);
  const department = pickCrmText(raw, ['department', 'Department']);
  const personalEmail = pickCrmText(raw, ['personalEmail', 'PersonalEmail']) || null;
  const officialEmail = pickCrmText(raw, ['officialEmail', 'OfficialEmail']) || null;
  const mobileNo = pickCrmText(raw, ['mobileNo', 'MobileNo']) || null;
  const designation = pickCrmText(raw, ['designation', 'Designation']) || null;

  return Number.isFinite(employeeCode) && employeeName
    ? {
        employeeCode,
        employeeName,
        department: department || null,
        personalEmail,
        officialEmail,
        mobileNo,
        designation,
      }
    : null;
}

// =========================================================
// User management
// =========================================================

// Whitelist of sortable columns → Prisma orderBy. Never inject sort_by raw into Prisma.
function getUserOrderBy(sortBy?: string, sortOrder: 'asc' | 'desc' = 'asc'): Prisma.UserOrderByWithRelationInput {
  switch (sortBy) {
    case 'name': return { name: sortOrder };
    case 'email': return { email: sortOrder };
    case 'role': return { role: sortOrder };
    case 'department': return { department: sortOrder };
    case 'is_active': return { is_active: sortOrder };
    case 'last_login_at': return { last_login_at: sortOrder };
    default: return { name: sortOrder };
  }
}

export async function getUsers(tenantId: string, filters: QueryUsersInput) {
  const { page, limit, role, is_active, search, sort_by, sort_order } = filters;
  const where: Record<string, unknown> = { tenant_id: tenantId };
  if (role) where.role = role;
  if (is_active !== undefined) where.is_active = is_active === 'true';
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { designation: { contains: search, mode: 'insensitive' } },
      { department: { contains: search, mode: 'insensitive' } },
      { crm_employee_code: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      ...buildPrismaQuery(page, limit),
      orderBy: getUserOrderBy(sort_by, sort_order),
      select: userListSelect,
    }),
    prisma.user.count({ where }),
  ]);
  return { data: users, pagination: paginate(page, limit, total) };
}

export async function getUserById(userId: string, tenantId: string) {
  const scopedUser = await prisma.user.findFirst({
    where: { id: userId, tenant_id: tenantId },
    select: userDetailSelect,
  });
  if (!scopedUser) throw new NotFoundError('User');
  return scopedUser;
}

export async function createUser(tenantId: string, data: CreateUserInput, actorUserId?: string) {
  const existing = await prisma.user.findFirst({ where: { tenant_id: tenantId, email: data.email } });
  if (existing) throw new BusinessRuleError('Email already in use', 'EMAIL_EXISTS');

  const crmEmployeeCode = normalizeOptionalText(data.crm_employee_code);
  if (crmEmployeeCode) {
    const existingCrmUser = await prisma.user.findFirst({
      where: { tenant_id: tenantId, crm_employee_code: crmEmployeeCode },
    });
    if (existingCrmUser) {
      throw new BusinessRuleError('CRM employee is already linked to a user', 'CRM_EMPLOYEE_EXISTS');
    }
  }

  if (data.role === 'recruiter') {
    if (!data.company_id) {
      throw new BusinessRuleError('company_id is required when role is recruiter', 'COMPANY_REQUIRED');
    }

    const company = await prisma.company.findFirst({
      where: { id: data.company_id, tenant_id: tenantId },
      select: { id: true },
    });
    if (!company) {
      throw new NotFoundError('Company');
    }

    const existingRecruiter = await prisma.recruiter.findUnique({
      where: { tenant_id_email: { tenant_id: tenantId, email: data.email } },
      select: { id: true, user_id: true },
    });
    if (existingRecruiter && existingRecruiter.user_id) {
      throw new BusinessRuleError(
        'A recruiter with this email is already linked to another user',
        'RECRUITER_ALREADY_LINKED',
      );
    }
  }

  const password_hash = await hashPassword(data.password);
  const department = data.department !== undefined
    ? normalizeOptionalText(data.department) ?? data.branches?.[0] ?? null
    : data.branches?.[0] ?? null;

  const userData = {
    tenant_id: tenantId,
    email: data.email,
    password_hash,
    name: data.name,
    role: data.role as UserRole,
    phone: normalizeOptionalText(data.phone),
    department,
    designation: normalizeOptionalText(data.designation),
    crm_employee_code: crmEmployeeCode,
    institutes: normalizeTextArray(data.institutes),
    courses: normalizeTextArray(data.courses),
    branches: normalizeTextArray(data.branches),
  };

  if (data.role !== 'recruiter') {
    return prisma.user.create({ data: userData, select: userDetailSelect });
  }

  // Recruiter: create User and link/create Recruiter row in a single transaction.
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: userData });

    const existingRecruiter = await tx.recruiter.findUnique({
      where: { tenant_id_email: { tenant_id: tenantId, email: data.email } },
      select: { id: true, user_id: true },
    });

    if (existingRecruiter && !existingRecruiter.user_id) {
      await tx.recruiter.update({
        where: { id: existingRecruiter.id },
        data: {
          user_id: user.id,
          company_id: data.company_id as string,
          name: data.name,
          phone: normalizeOptionalText(data.phone),
          designation: normalizeOptionalText(data.designation),
          verification_status: 'verified',
          verified_by: actorUserId ?? null,
          verified_at: new Date(),
        },
      });
    } else if (!existingRecruiter) {
      await tx.recruiter.create({
        data: {
          tenant_id: tenantId,
          user_id: user.id,
          company_id: data.company_id as string,
          name: data.name,
          email: data.email,
          phone: normalizeOptionalText(data.phone),
          designation: normalizeOptionalText(data.designation),
          verification_status: 'verified',
          verified_by: actorUserId ?? null,
          verified_at: new Date(),
        },
      });
    }

    return tx.user.findUnique({ where: { id: user.id }, select: userDetailSelect });
  });
}

export async function linkRecruiterToCompany(
  userId: string,
  tenantId: string,
  data: LinkRecruiterToCompanyInput,
) {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenant_id: tenantId },
    select: { id: true, email: true, name: true, phone: true, designation: true, role: true },
  });
  if (!user) throw new NotFoundError('User');
  if (user.role !== 'recruiter') {
    throw new BusinessRuleError('User role is not recruiter', 'INVALID_ROLE');
  }

  const company = await prisma.company.findFirst({
    where: { id: data.company_id, tenant_id: tenantId },
    select: { id: true },
  });
  if (!company) throw new NotFoundError('Company');

  const ownRecruiter = await prisma.recruiter.findUnique({
    where: { user_id: userId },
    select: { id: true },
  });

  if (ownRecruiter) {
    await prisma.recruiter.update({
      where: { id: ownRecruiter.id },
      data: { company_id: data.company_id },
    });
  } else {
    const existingByEmail = await prisma.recruiter.findUnique({
      where: { tenant_id_email: { tenant_id: tenantId, email: user.email } },
      select: { id: true, user_id: true },
    });

    if (existingByEmail && existingByEmail.user_id && existingByEmail.user_id !== userId) {
      throw new BusinessRuleError(
        'A recruiter with this email is already linked to another user',
        'RECRUITER_ALREADY_LINKED',
      );
    }

    if (existingByEmail) {
      await prisma.recruiter.update({
        where: { id: existingByEmail.id },
        data: {
          user_id: userId,
          company_id: data.company_id,
          name: user.name,
          phone: user.phone,
          designation: user.designation,
        },
      });
    } else {
      await prisma.recruiter.create({
        data: {
          tenant_id: tenantId,
          user_id: userId,
          company_id: data.company_id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          designation: user.designation,
        },
      });
    }
  }

  return prisma.user.findUnique({ where: { id: userId }, select: userDetailSelect });
}

export async function regenerateUserPassword(userId: string, tenantId: string, actorUserId: string) {
  const user = await prisma.user.findFirst({
    where: { id: userId, tenant_id: tenantId },
    select: { id: true, email: true, name: true, role: true, tenant_id: true },
  });
  if (!user) throw new NotFoundError('User');

  const temporaryPassword = generateTemporaryPassword(16);
  const passwordHash = await hashPassword(temporaryPassword);

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { password_hash: passwordHash },
    select: userDetailSelect,
  });

  prisma.auditLog
    .create({
      data: {
        tenant_id: user.tenant_id,
        user_id: actorUserId,
        user_name: user.email,
        action: 'regenerate_password',
        module: 'auth',
        target_type: 'users',
        target_id: userId,
        details: `Regenerated password for ${user.email}`,
      },
    })
    .catch((err) => logger.error({ err }, 'Failed to write regenerate-password audit log'));

  return { user: updated, temporary_password: temporaryPassword };
}

export async function updateUser(userId: string, tenantId: string, data: UpdateUserInput) {
  const existing = await prisma.user.findFirst({ where: { id: userId, tenant_id: tenantId } });
  if (!existing) throw new NotFoundError('User');

  const crmEmployeeCode = data.crm_employee_code !== undefined
    ? normalizeOptionalText(data.crm_employee_code)
    : undefined;

  if (crmEmployeeCode) {
    const crmConflict = await prisma.user.findFirst({
      where: {
        tenant_id: tenantId,
        crm_employee_code: crmEmployeeCode,
        id: { not: userId },
      },
    });

    if (crmConflict) {
      throw new BusinessRuleError('CRM employee is already linked to another user', 'CRM_EMPLOYEE_EXISTS');
    }
  }

  const department = data.department !== undefined
    ? normalizeOptionalText(data.department) ?? (data.branches !== undefined ? data.branches[0] ?? null : undefined)
    : data.branches !== undefined
      ? data.branches[0] ?? null
      : undefined;

  // ERP-linked users (synced from the CRM) have immutable ERP-owned identity fields
  // (name, email, phone, department, designation, crm_employee_code). Admins can still
  // change role / scope / active status; the ERP fields are silently dropped from the write.
  const erpLinked = Boolean(existing.crm_employee_code);

  return prisma.user.update({
    where: { id: userId },
    data: {
      role: data.role as UserRole | undefined,
      ...(data.is_active !== undefined ? { is_active: data.is_active } : {}),
      ...(data.institutes !== undefined ? { institutes: normalizeTextArray(data.institutes) } : {}),
      ...(data.courses !== undefined ? { courses: normalizeTextArray(data.courses) } : {}),
      ...(data.branches !== undefined ? { branches: normalizeTextArray(data.branches) } : {}),
      ...(erpLinked
        ? {}
        : {
            ...(data.name !== undefined ? { name: data.name } : {}),
            ...(data.phone !== undefined ? { phone: normalizeOptionalText(data.phone) } : {}),
            ...(department !== undefined ? { department } : {}),
            ...(data.designation !== undefined ? { designation: normalizeOptionalText(data.designation) } : {}),
            ...(crmEmployeeCode !== undefined ? { crm_employee_code: crmEmployeeCode } : {}),
          }),
    },
    select: userDetailSelect,
  });
}

export async function getCrmDepartments(filters: QueryCrmDepartmentsInput) {
  const departments = await fetchCrmArray<CrmDepartment>(
    makeCrmUrl(env.crmDepartmentListUrl, { DepartmentType: filters.department_type }),
  );

  return {
    data: departments.map(normalizeCrmDepartment).filter((item): item is { id: number; departmentName: string } => item !== null),
  };
}

export async function getCrmEmployees(filters: QueryCrmEmployeesInput) {
  const employees = await fetchCrmArray<CrmEmployee>(
    makeCrmUrl(env.crmEmployeeListUrl, {
      DepartmentType: filters.department_type,
      DepartmentId: filters.department_id,
    }),
  );

  return {
    data: employees.map(normalizeCrmEmployee).filter((item): item is { employeeCode: number; employeeName: string } => item !== null),
  };
}

export async function getCrmEmployeeDetail(input: CrmEmployeeParamInput) {
  const employees = await fetchCrmArray<CrmEmployeeDetail>(
    makeCrmUrl(env.crmEmployeeDetailUrl, { EmpId: input.empId }),
  );

  const detail = employees.map(normalizeCrmEmployeeDetail).find(
    (item): item is NonNullable<ReturnType<typeof normalizeCrmEmployeeDetail>> => item !== null,
  );

  if (!detail) {
    throw new NotFoundError('CRM Employee');
  }

  return detail;
}

// =========================================================
// Audit + permissions
// =========================================================

// Whitelist of sortable columns → Prisma orderBy. Never inject sort_by raw into Prisma.
function getAuditLogOrderBy(sortBy?: string, sortOrder: 'asc' | 'desc' = 'asc'): Prisma.AuditLogOrderByWithRelationInput {
  switch (sortBy) {
    case 'created_at': return { created_at: sortOrder };
    case 'user': return { user: { name: sortOrder } };
    case 'action': return { action: sortOrder };
    case 'module': return { module: sortOrder };
    default: return { created_at: sortOrder };
  }
}

export async function getAuditLogs(tenantId: string, filters: QueryAuditLogsInput) {
  const { page, limit, module, action, user_id, role, sort_by, sort_order } = filters;
  const where: Record<string, unknown> = { tenant_id: tenantId };
  if (module) where.module = module;
  if (action) where.action = action;
  if (user_id) where.user_id = user_id;
  if (role) where.user = { role };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      ...buildPrismaQuery(page, limit),
      orderBy: getAuditLogOrderBy(sort_by, sort_order),
      include: { user: { select: { name: true, email: true } } },
    }),
    prisma.auditLog.count({ where }),
  ]);
  return { data: logs, pagination: paginate(page, limit, total) };
}

export async function getPermissions(tenantId: string) {
  return prisma.rolePermission.findMany({
    where: { tenant_id: tenantId },
    orderBy: [{ role: 'asc' }, { module: 'asc' }],
  });
}

export async function updatePermission(permissionId: string, tenantId: string, data: UpdatePermissionInput) {
  const existing = await prisma.rolePermission.findFirst({ where: { id: permissionId, tenant_id: tenantId } });
  if (!existing) throw new NotFoundError('Permission');
  return prisma.rolePermission.update({ where: { id: permissionId }, data });
}

// =========================================================
// Student management
// =========================================================

export async function getStudents(tenantId: string, filters: QueryStudentsInput) {
  const { page, limit, department, batch, verification_status, search, min_cgpa, max_cgpa, posting_type_master_id, sort_by, sort_order,
    institute, course, branch, semester, academic_year, company_id, date_from, date_to } = filters;

  // Resolve the master's value so we can also match students who only registered
  // interest in this posting type (interest_registrations store the value string,
  // not the master id) — pending-verification students typically have no applications.
  let posting_type_value: string | null = null;
  if (posting_type_master_id) {
    const master = await prisma.masterOption.findFirst({
      where: { id: posting_type_master_id, tenant_id: tenantId },
      select: { value: true },
    });
    posting_type_value = master?.value ?? null;
  }

  const where = buildStudentWhere(tenantId, {
    department,
    batch,
    verification_status,
    search,
    min_cgpa,
    max_cgpa,
    posting_type_master_id,
    posting_type_value,
    institute,
    course,
    branch,
    semester,
    academic_year,
    company_id,
    date_from,
    date_to,
  });

  const [students, total] = await Promise.all([
    prisma.student.findMany({
      where,
      include: adminStudentInclude,
      ...buildPrismaQuery(page, limit),
      orderBy: getStudentOrderBy(sort_by, sort_order),
    }),
    prisma.student.count({ where }),
  ]);

  return {
    data: students.map(mapAdminStudent),
    pagination: paginate(page, limit, total),
  };
}

export async function getStudentById(studentId: string, tenantId: string) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, tenant_id: tenantId },
    include: adminStudentInclude,
  });

  if (!student) throw new NotFoundError('Student');
  return mapAdminStudent(student);
}

export async function verifyStudent(studentId: string, tenantId: string, actor: AdminActor, data: VerifyStudentInput) {
  const existing = await prisma.student.findFirst({
    where: { id: studentId, tenant_id: tenantId },
    include: adminStudentInclude,
  });
  if (!existing) throw new NotFoundError('Student');

  const remarks = normalizeOptionalText(data.remarks);
  const now = new Date();
  const updated = await prisma.student.update({
    where: { id: studentId },
    data: {
      verification_status: data.status as VerificationStatus,
      verification_remarks: remarks,
      verified_by: actor.id,
      verified_at: now,
    },
    include: adminStudentInclude,
  });

  await writeAdminAuditLog({
    tenantId,
    actor,
    action: data.status === 'verified' ? 'verify_student' : 'reject_student',
    module: 'student_verification',
    targetType: 'student',
    targetId: studentId,
    details: data.status === 'verified'
      ? `Verified student ${updated.full_name}`
      : `Rejected student ${updated.full_name}${remarks ? `: ${remarks}` : ''}`,
  });

  return mapAdminStudent(updated);
}

export async function updateStudentProfileBlock(
  studentId: string,
  tenantId: string,
  actor: AdminActor,
  data: UpdateStudentProfileBlockInput
) {
  const existing = await prisma.student.findFirst({
    where: { id: studentId, tenant_id: tenantId },
    include: adminStudentInclude,
  });
  if (!existing) throw new NotFoundError('Student');

  const reason = normalizeOptionalText(data.reason);
  const updated = await prisma.student.update({
    where: { id: studentId },
    data: {
      profile_blocked: data.profile_blocked,
      profile_block_reason: data.profile_blocked ? reason : null,
    },
    include: adminStudentInclude,
  });

  await writeAdminAuditLog({
    tenantId,
    actor,
    action: data.profile_blocked ? 'block_student_profile' : 'unblock_student_profile',
    module: 'students',
    targetType: 'student',
    targetId: studentId,
    details: data.profile_blocked
      ? `Blocked student profile ${updated.full_name}${reason ? `: ${reason}` : ''}`
      : `Unblocked student profile ${updated.full_name}`,
  });

  return mapAdminStudent(updated);
}

/**
 * Reopen a student's placement (TPO-admin only). Students can opt out themselves but cannot
 * re-enable — only the T&P office can. Scope 'global' clears the overall opt-out; scope
 * 'posting_type' re-enables a single posting type. Each reopen appends an "enabled" history row.
 */
export async function reopenStudentPlacement(
  studentId: string,
  tenantId: string,
  actor: AdminActor,
  data: ReopenPlacementInput
) {
  const student = await prisma.student.findFirst({
    where: { id: studentId, tenant_id: tenantId },
    select: { id: true, full_name: true },
  });
  if (!student) throw new NotFoundError('Student');

  if (data.scope === 'global') {
    await prisma.$transaction([
      prisma.student.update({
        where: { id: student.id },
        data: {
          placement_opt_out: false,
          placement_opt_out_reason: null,
          placement_opt_out_at: null,
        },
      }),
      prisma.studentPlacementPreferenceHistory.create({
        data: {
          tenant_id: tenantId,
          student_id: student.id,
          scope: 'global',
          interested: true,
          reason: null,
        },
      }),
    ]);
  } else {
    const master = await prisma.masterOption.findFirst({
      where: { id: data.posting_type_master_id!, tenant_id: tenantId, category: 'posting_type' },
      select: { id: true, value: true },
    });
    if (!master) throw new NotFoundError('Posting type');

    await prisma.$transaction([
      prisma.studentPostingTypePreference.upsert({
        where: {
          student_id_posting_type_master_id: { student_id: student.id, posting_type_master_id: master.id },
        },
        create: { student_id: student.id, posting_type_master_id: master.id, interested: true, reason: null },
        update: { interested: true, reason: null },
      }),
      prisma.studentPlacementPreferenceHistory.create({
        data: {
          tenant_id: tenantId,
          student_id: student.id,
          scope: 'posting_type',
          posting_type_master_id: master.id,
          posting_type_label: master.value,
          interested: true,
          reason: null,
        },
      }),
    ]);
  }

  await writeAdminAuditLog({
    tenantId,
    actor,
    action: 'placement_reopen',
    module: 'students',
    targetType: 'student',
    targetId: studentId,
    details: data.scope === 'global'
      ? `Reopened placement for ${student.full_name}`
      : `Reopened posting type for ${student.full_name}`,
  });

  return getStudentById(studentId, tenantId);
}

export async function bulkVerifyStudents(tenantId: string, actor: AdminActor, data: BulkVerifyStudentsInput) {
  const now = new Date();
  const remarks = normalizeOptionalText(data.remarks);
  const result = await prisma.student.updateMany({
    where: {
      tenant_id: tenantId,
      id: { in: data.student_ids },
      verification_status: 'pending',
    },
    data: {
      verification_status: 'verified',
      verification_remarks: remarks,
      verified_by: actor.id,
      verified_at: now,
    },
  });

  if (result.count === 0) {
    throw new BusinessRuleError('No pending students found for bulk verification', 'NO_PENDING_STUDENTS');
  }

  await writeAdminAuditLog({
    tenantId,
    actor,
    action: 'bulk_verify_students',
    module: 'student_verification',
    details: `Bulk verified ${result.count} students`,
  });

  return {
    updated_count: result.count,
    message: `${result.count} students verified successfully`,
  };
}

// =========================================================
// Eligibility rules
// =========================================================

export async function getEligibilityRules(tenantId: string) {
  const [rules, students] = await Promise.all([
    prisma.eligibilityRule.findMany({
      where: { tenant_id: tenantId },
      orderBy: { updated_at: 'desc' },
    }),
    getStudentsForRuleMatching(tenantId),
  ]);

  return {
    data: rules.map((rule) => mapEligibilityRule(rule, countEligibleStudents(rule, students))),
  };
}

export async function createEligibilityRule(tenantId: string, actor: AdminActor, data: CreateEligibilityRuleInput) {
  const rule = await prisma.eligibilityRule.create({
    data: {
      tenant_id: tenantId,
      rule_name: data.rule_name,
      company_name: normalizeOptionalText(data.company_name),
      min_cgpa: data.min_cgpa,
      max_backlogs: data.max_backlogs,
      eligible_branches: data.required_branches,
      eligible_batches: data.eligible_batches,
      min_tenth: data.min_tenth_percentage,
      min_twelfth: data.min_twelfth_percentage,
      additional_criteria: normalizeOptionalText(data.additional_criteria),
      is_active: data.is_active,
    },
  });

  await writeAdminAuditLog({
    tenantId,
    actor,
    action: 'create_eligibility_rule',
    module: 'eligibility_rules',
    targetType: 'eligibility_rule',
    targetId: rule.id,
    details: `Created eligibility rule ${rule.rule_name}`,
  });

  const students = await getStudentsForRuleMatching(tenantId);
  return mapEligibilityRule(rule, countEligibleStudents(rule, students));
}

export async function updateEligibilityRule(ruleId: string, tenantId: string, actor: AdminActor, data: UpdateEligibilityRuleInput) {
  const existing = await prisma.eligibilityRule.findFirst({
    where: { id: ruleId, tenant_id: tenantId },
  });
  if (!existing) throw new NotFoundError('Eligibility Rule');

  const rule = await prisma.eligibilityRule.update({
    where: { id: ruleId },
    data: {
      ...(data.rule_name !== undefined ? { rule_name: data.rule_name } : {}),
      ...(data.company_name !== undefined ? { company_name: normalizeOptionalText(data.company_name) } : {}),
      ...(data.min_cgpa !== undefined ? { min_cgpa: data.min_cgpa } : {}),
      ...(data.max_backlogs !== undefined ? { max_backlogs: data.max_backlogs } : {}),
      ...(data.required_branches !== undefined ? { eligible_branches: data.required_branches } : {}),
      ...(data.eligible_batches !== undefined ? { eligible_batches: data.eligible_batches } : {}),
      ...(data.min_tenth_percentage !== undefined ? { min_tenth: data.min_tenth_percentage } : {}),
      ...(data.min_twelfth_percentage !== undefined ? { min_twelfth: data.min_twelfth_percentage } : {}),
      ...(data.additional_criteria !== undefined ? { additional_criteria: normalizeOptionalText(data.additional_criteria) } : {}),
      ...(data.is_active !== undefined ? { is_active: data.is_active } : {}),
    },
  });

  await writeAdminAuditLog({
    tenantId,
    actor,
    action: 'update_eligibility_rule',
    module: 'eligibility_rules',
    targetType: 'eligibility_rule',
    targetId: rule.id,
    details: `Updated eligibility rule ${rule.rule_name}`,
  });

  const students = await getStudentsForRuleMatching(tenantId);
  return mapEligibilityRule(rule, countEligibleStudents(rule, students));
}

export async function deleteEligibilityRule(ruleId: string, tenantId: string, actor: AdminActor) {
  const existing = await prisma.eligibilityRule.findFirst({
    where: { id: ruleId, tenant_id: tenantId },
  });
  if (!existing) throw new NotFoundError('Eligibility Rule');

  await prisma.eligibilityRule.delete({ where: { id: ruleId } });

  await writeAdminAuditLog({
    tenantId,
    actor,
    action: 'delete_eligibility_rule',
    module: 'eligibility_rules',
    targetType: 'eligibility_rule',
    targetId: ruleId,
    details: `Deleted eligibility rule ${existing.rule_name}`,
  });

  return { message: 'Eligibility rule deleted successfully' };
}

// =========================================================
// Portfolio monitoring
// =========================================================

export async function getPortfolios(tenantId: string, filters: QueryPortfoliosInput) {
  const where = buildPortfolioMonitoringStudentWhere(tenantId, filters);

  const [students, totalStudents, publishedCount, withProjectsCount, projectSums] = await Promise.all([
    prisma.student.findMany({
      where,
      include: { portfolio: true },
      orderBy: { full_name: 'asc' },
    }),
    prisma.student.count({ where: { tenant_id: tenantId } }),
    prisma.student.count({
      where: {
        tenant_id: tenantId,
        portfolio: { is: { status: 'published' } },
      },
    }),
    prisma.student.count({
      where: {
        tenant_id: tenantId,
        portfolio: { is: { project_count: { gt: 0 } } },
      },
    }),
    prisma.portfolio.aggregate({
      where: {
        student: {
          is: {
            tenant_id: tenantId,
          },
        },
      },
      _sum: { project_count: true },
    }),
  ]);

  const stats = {
    total: totalStudents,
    published: publishedCount,
    draft: Math.max(totalStudents - publishedCount, 0),
    withProjects: withProjectsCount,
    avgProjects: totalStudents === 0
      ? 0
      : Number((((projectSums._sum.project_count ?? 0) as number) / totalStudents).toFixed(1)),
  };

  return {
    data: students.map(mapPortfolioMonitoringStudent),
    stats,
  };
}

// =========================================================
// Selection database
// =========================================================

function selectionStudentFields(student: {
  institute: string | null;
  course: string | null;
  current_semester: string | null;
  gender: string | null;
  email: string;
  mobile: string | null;
  academic_profile: { cgpa: Prisma.Decimal | null; tenth_percentage: Prisma.Decimal | null; twelfth_percentage: Prisma.Decimal | null; backlog_count: number } | null;
}) {
  return {
    institute: student.institute,
    course: student.course,
    semester: student.current_semester,
    gender: student.gender ? student.gender.toLowerCase() : null,
    email: student.email,
    mobile: student.mobile,
    cgpa: decimalToNumber(student.academic_profile?.cgpa),
    tenth_percentage: decimalToNumber(student.academic_profile?.tenth_percentage),
    twelfth_percentage: decimalToNumber(student.academic_profile?.twelfth_percentage),
    backlog_count: student.academic_profile?.backlog_count ?? 0,
  };
}

export async function getSelectionDatabase(tenantId: string, filters: QuerySelectionDatabaseInput) {
  const [offers, internships] = await Promise.all([
    prisma.offer.findMany({
      where: {
        tenant_id: tenantId,
        type: 'job',
        // All RELEASED offers (any non-rejected status). A released offer starts as
        // pending_student_action; previously only accepted/joined offers showed, so
        // released-but-not-yet-accepted placements were missing.
        status: { notIn: ['rejected_by_admin', 'rejected_by_student'] },
      },
      include: {
        student: {
          select: {
            id: true,
            full_name: true,
            enrollment_number: true,
            department: true,
            batch: true,
            institute: true,
            course: true,
            current_semester: true,
            gender: true,
            email: true,
            mobile: true,
            academic_profile: { select: { cgpa: true, tenth_percentage: true, twelfth_percentage: true, backlog_count: true } },
          },
        },
        company: {
          select: {
            name: true,
          },
        },
        posting: {
          select: {
            posting_type_master: { select: { value: true } },
          },
        },
        created_by_user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { offer_date: 'desc' },
    }),
    prisma.internship.findMany({
      where: { tenant_id: tenantId },
      include: {
        student: {
          select: {
            id: true,
            full_name: true,
            enrollment_number: true,
            department: true,
            batch: true,
            institute: true,
            course: true,
            current_semester: true,
            gender: true,
            email: true,
            mobile: true,
            academic_profile: { select: { cgpa: true, tenth_percentage: true, twelfth_percentage: true, backlog_count: true } },
          },
        },
        company: {
          select: {
            name: true,
          },
        },
        offer: {
          include: {
            posting: {
              select: {
                posting_type_master: { select: { value: true } },
              },
            },
            created_by_user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: { start_date: 'desc' },
    }),
  ]);

  // NOC status per student: 'issued' when the student has an issued NOC, else 'pending'.
  const recordStudentIds = Array.from(
    new Set([
      ...offers.map((offer) => offer.student.id),
      ...internships.map((internship) => internship.student.id),
    ])
  );
  const issuedNocs = recordStudentIds.length
    ? await prisma.nocRequest.findMany({
        where: { tenant_id: tenantId, status: 'issued', student_id: { in: recordStudentIds } },
        select: { student_id: true },
      })
    : [];
  const issuedNocStudentIds = new Set(issuedNocs.map((noc) => noc.student_id));

  const placementRecords = offers.map((offer) => ({
    id: offer.id,
    student_name: offer.student.full_name,
    enrollment_number: offer.student.enrollment_number,
    department: offer.student.department,
    batch: offer.student.batch,
    ...selectionStudentFields(offer.student),
    company_name: offer.company.name,
    role: offer.role,
    type: 'placement' as const,
    posting_type: offer.posting.posting_type_master?.value ?? null,
    selection_date: offer.offer_date.toISOString(),
    outcome: mapPlacementOutcome(offer.joining_status),
    joining_date: offer.joining_date?.toISOString() ?? null,
    finalized_by: offer.created_by_user?.name ?? null,
    is_locked: offer.is_locked,
    noc_status: (issuedNocStudentIds.has(offer.student.id) ? 'issued' : 'pending') as 'issued' | 'pending',
  }));

  const internshipRecords = internships.map((internship) => ({
    id: internship.id,
    student_name: internship.student.full_name,
    enrollment_number: internship.student.enrollment_number,
    department: internship.student.department,
    batch: internship.student.batch,
    ...selectionStudentFields(internship.student),
    company_name: internship.company?.name ?? internship.company_name,
    role: internship.role,
    type: 'internship' as const,
    posting_type: internship.offer?.posting?.posting_type_master?.value ?? null,
    selection_date: internship.start_date.toISOString(),
    outcome: mapInternshipOutcome(internship.status),
    joining_date: internship.start_date.toISOString(),
    finalized_by: internship.offer?.created_by_user?.name ?? null,
    is_locked: internship.status === 'completed' || internship.status === 'discontinued',
    noc_status: (issuedNocStudentIds.has(internship.student.id) ? 'issued' : 'pending') as 'issued' | 'pending',
  }));

  const allRecords = [...placementRecords, ...internshipRecords];
  const filtered = applySelectionFilters(allRecords, filters);

  return {
    data: filtered,
    counts: {
      placements: placementRecords.length,
      internships: internshipRecords.length,
    },
    stats: {
      total: filtered.length,
      joined: filtered.filter((record) => record.outcome === 'joined').length,
      not_joined: filtered.filter((record) => record.outcome === 'not_joined').length,
      pending: filtered.filter((record) => record.outcome === 'pending').length,
      locked: filtered.filter((record) => record.is_locked).length,
    },
  };
}

// =========================================================
// Interest lists
// =========================================================

export async function getInterestSummary(tenantId: string) {
  const registrations = await prisma.interestRegistration.findMany({
    where: {
      // Withdrawn registrations are not counted as active enrollments.
      status: { not: 'withdrawn' },
      student: {
        is: {
          tenant_id: tenantId,
          // Keep counts consistent with the list — exclude rejected students.
          verification_status: { not: VerificationStatus.rejected },
        },
      },
    },
    select: {
      interest_type: true,
    },
  });

  const counts = new Map<string, number>();
  registrations.forEach((registration) => {
    counts.set(registration.interest_type, (counts.get(registration.interest_type) ?? 0) + 1);
  });

  const academicYear = getAcademicYearLabel(new Date());
  return {
    summary: Array.from(counts.entries()).map(([interestType, count]) => ({
      interest_type: interestType,
      label: INTEREST_LABELS[interestType] ?? interestType,
      count,
      academic_year: academicYear,
    })),
  };
}

export async function getInterestRegistrations(tenantId: string, filters: QueryInterestRegistrationsInput) {
  const requestedInterestType = filters.interest_type?.trim() || filters.posting_type?.trim() || null;
  const interestTypeFilter = requestedInterestType
    ? { equals: requestedInterestType, mode: 'insensitive' as const }
    : null;

  if (interestTypeFilter === null) {
    return {
      data: [],
      total: 0,
    };
  }

  // Default view shows ALL statuses (incl. withdrawn) so a withdrawn student stays visible with a
  // Withdrawn badge + audit; an explicit status filter narrows to one. (Summary counts still exclude
  // withdrawn — see getInterestSummary.)
  const statusFilter: Prisma.EnumInterestRegistrationStatusFilter | undefined = filters.status
    ? { equals: filters.status }
    : undefined;

  // FILTER COUNTER EXPORT — the date range filters the matching REGISTRATION's created_at.
  const registrationDateRange = buildDateRangeCondition(filters.date_from, filters.date_to);
  const registrationSome: Prisma.InterestRegistrationWhereInput = {
    interest_type: interestTypeFilter,
    status: statusFilter,
    ...(registrationDateRange ? { created_at: registrationDateRange } : {}),
  };

  const conditions: Prisma.StudentWhereInput[] = [
    { tenant_id: tenantId },
    // Rejected students must not appear in the posting-type (interest) listing.
    { verification_status: { not: VerificationStatus.rejected } },
    { interest_registrations: { some: registrationSome } },
    // Student-scope filters (institute/course/branch(=department)/semester/academic_year(=batch)).
    ...buildStudentScopeConditions({
      institute: filters.institute,
      course: filters.course,
      branch: filters.branch,
      semester: filters.semester,
      academic_year: filters.academic_year,
    }),
  ];

  if (filters.department) {
    conditions.push({ department: filters.department });
  }

  if (filters.search) {
    conditions.push({
      OR: [
        { full_name: { contains: filters.search, mode: 'insensitive' } },
        { enrollment_number: { contains: filters.search, mode: 'insensitive' } },
        { roll_number: { contains: filters.search, mode: 'insensitive' } },
      ],
    });
  }

  const students = await prisma.student.findMany({
    where: { AND: conditions },
    include: adminStudentInclude,
    orderBy: { full_name: 'asc' },
  });

  return {
    data: students.map(mapAdminStudent),
    total: students.length,
  };
}

/**
 * The N most recent interest-registration RECORDS across the tenant (newest first), for the TPO
 * Admin dashboard. Returns light registration rows (not the full student payload). All statuses are
 * included so the dashboard can badge Pending/Withdrawn.
 */
export async function getRecentInterestRegistrations(tenantId: string, limit = 10) {
  const rows = await prisma.interestRegistration.findMany({
    where: { student: { is: { tenant_id: tenantId } } },
    orderBy: { registered_at: 'desc' },
    take: limit,
    include: {
      student: { select: { full_name: true, enrollment_number: true, department: true } },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    student_name: row.student.full_name,
    enrollment_number: row.student.enrollment_number,
    department: row.student.department,
    interest_type: row.interest_type,
    status: row.status,
    registered_at: row.registered_at,
  }));
}

async function loadInterestRegistrationForReview(id: string, tenantId: string) {
  const registration = await prisma.interestRegistration.findFirst({
    where: { id, student: { is: { tenant_id: tenantId } } },
    include: { student: { select: { user_id: true } } },
  });
  if (!registration) throw new NotFoundError('Interest registration');
  return registration;
}

function notifyStudentOfInterestReview(params: {
  id: string;
  studentUserId: string | null;
  interestType: string;
  tenantId: string;
  status: 'approved' | 'withdrawn';
  reason?: string | null;
}) {
  const { id, studentUserId, interestType, tenantId, status, reason } = params;
  if (!studentUserId) return;
  const label = INTEREST_LABELS[interestType] ?? interestType;
  try {
    void createNotification({
      userId: studentUserId,
      tenantId,
      type: 'interest',
      title:
        status === 'approved'
          ? 'Your program registration was approved'
          : 'Your program registration was withdrawn',
      description:
        status === 'approved'
          ? `You can now apply to ${label} postings.`
          : reason || `Your registration for ${label} was withdrawn by the TPO cell.`,
      priority: 'medium',
      actionUrl: status === 'approved' ? '/opportunities' : '/',
      payload: { interest_registration_id: id, interest_type: interestType, status },
    });
  } catch (err) {
    // best-effort — a notification failure must not break the review action
  }
}

export async function approveInterestRegistration(id: string, tenantId: string, userId: string, userName: string) {
  const registration = await loadInterestRegistrationForReview(id, tenantId);

  const updated = await prisma.interestRegistration.update({
    where: { id },
    data: { status: 'approved', reviewed_by: userId, reviewed_by_name: userName, reviewed_at: new Date(), status_reason: null },
  });

  notifyStudentOfInterestReview({
    id,
    studentUserId: registration.student.user_id,
    interestType: registration.interest_type,
    tenantId,
    status: 'approved',
  });
  return updated;
}

export async function withdrawInterestRegistration(
  id: string,
  tenantId: string,
  userId: string,
  userName: string,
  data: WithdrawInterestRegistrationInput,
) {
  const registration = await loadInterestRegistrationForReview(id, tenantId);
  const reason = data.reason?.trim() || null;

  const updated = await prisma.interestRegistration.update({
    where: { id },
    data: { status: 'withdrawn', reviewed_by: userId, reviewed_by_name: userName, reviewed_at: new Date(), status_reason: reason },
  });

  notifyStudentOfInterestReview({
    id,
    studentUserId: registration.student.user_id,
    interestType: registration.interest_type,
    tenantId,
    status: 'withdrawn',
    reason,
  });
  return updated;
}

// =========================================================
// Helpers
// =========================================================

function decimalToNumber(value: Prisma.Decimal | null | undefined) {
  return value == null ? null : Number(value);
}

function normalizeOptionalText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeTextArray(values: string[] | undefined | null) {
  if (!values) {
    return [];
  }

  return Array.from(
    new Set(
      values
        .map((value) => value.trim())
        .filter((value) => value.length > 0),
    ),
  );
}

function getStudentOrderBy(sortBy?: string, sortOrder: 'asc' | 'desc' = 'asc'): Prisma.StudentOrderByWithRelationInput {
  switch (sortBy) {
    case 'department':
      return { department: sortOrder };
    case 'batch':
      return { batch: sortOrder };
    case 'verification_status':
      return { verification_status: sortOrder };
    case 'profile_completion_percentage':
      return { profile_completion_percentage: sortOrder };
    case 'created_at':
      return { created_at: sortOrder };
    case 'updated_at':
      return { updated_at: sortOrder };
    default:
      return { full_name: sortOrder };
  }
}

function buildStudentWhere(
  tenantId: string,
  filters: Pick<QueryStudentsInput, 'department' | 'batch' | 'verification_status' | 'search' | 'min_cgpa' | 'max_cgpa' | 'posting_type_master_id'
    | 'institute' | 'course' | 'branch' | 'semester' | 'academic_year' | 'company_id' | 'date_from' | 'date_to'>
    & { posting_type_value?: string | null }
): Prisma.StudentWhereInput {
  const conditions: Prisma.StudentWhereInput[] = [{ tenant_id: tenantId }];

  if (filters.department) conditions.push({ department: filters.department });
  if (filters.batch) conditions.push({ batch: filters.batch });

  // Shared scope filters (institute/course/branch/semester/academic_year → batch).
  conditions.push(...buildStudentScopeConditions({
    institute: filters.institute,
    course: filters.course,
    branch: filters.branch,
    semester: filters.semester,
    academic_year: filters.academic_year,
  }));

  const createdRange = buildDateRangeCondition(filters.date_from, filters.date_to);
  if (createdRange) conditions.push({ created_at: createdRange });

  if (filters.company_id) {
    conditions.push({
      OR: [
        { applications: { some: { posting: { company_id: filters.company_id } } } },
        { offers: { some: { company_id: filters.company_id } } },
      ],
    });
  }
  if (filters.verification_status) {
    conditions.push({ verification_status: filters.verification_status as VerificationStatus });
  }
  if (filters.posting_type_master_id) {
    // Match students who applied to this posting type OR registered interest in it
    // (interest_type stores the master value string). Inclusive so pending-verification
    // students — who have interests but no applications yet — are also filtered correctly.
    conditions.push({
      OR: [
        { applications: { some: { posting: { posting_type_master_id: filters.posting_type_master_id } } } },
        ...(filters.posting_type_value
          ? [{ interest_registrations: { some: { interest_type: { equals: filters.posting_type_value, mode: 'insensitive' as const } } } }]
          : []),
      ],
    });
  }
  if (filters.search) {
    conditions.push({
      OR: [
        { full_name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { enrollment_number: { contains: filters.search, mode: 'insensitive' } },
        { roll_number: { contains: filters.search, mode: 'insensitive' } },
      ],
    });
  }
  if (filters.min_cgpa !== undefined || filters.max_cgpa !== undefined) {
    conditions.push({
      academic_profile: {
        is: {
          cgpa: {
            ...(filters.min_cgpa !== undefined ? { gte: filters.min_cgpa } : {}),
            ...(filters.max_cgpa !== undefined ? { lte: filters.max_cgpa } : {}),
          },
        },
      },
    });
  }

  return { AND: conditions };
}

function mapAcademicProfile(studentId: string, academic: AdminStudentSource['academic_profile']) {
  return {
    student_id: studentId,
    cgpa: decimalToNumber(academic?.cgpa),
    tenth_percentage: decimalToNumber(academic?.tenth_percentage),
    twelfth_percentage: decimalToNumber(academic?.twelfth_percentage),
    diploma_percentage: decimalToNumber(academic?.diploma_percentage),
    backlog_count: academic?.backlog_count ?? 0,
    backlog_history: [] as string[],
    semester: academic?.semester ?? null,
    year: academic?.year_of_study ?? null,
    year_of_study: academic?.year_of_study ?? null,
    active_backlogs: academic?.active_backlogs ?? 0,
    course_duration: academic?.course_duration ?? null,
    certifications: [] as string[],
  };
}

function toIso(value: Date | null | undefined) {
  return value ? value.toISOString() : null;
}

function mapAdminStudent(student: AdminStudentSource) {
  const academicProfile = mapAcademicProfile(student.id, student.academic_profile);

  return {
    student_id: student.id,
    user_id: student.user_id,
    enrollment_number: student.enrollment_number,
    roll_number: student.roll_number ?? student.enrollment_number,
    full_name: student.full_name,
    email: student.email,
    mobile: student.mobile,
    alternate_phone: student.alternate_phone,
    institute_name: student.institute,
    course_name: student.course,
    department: student.department,
    batch_year: student.batch,
    date_of_birth: student.date_of_birth?.toISOString() ?? null,
    profile_photo_url: student.profile_photo_url,
    linkedin_url: student.linkedin_url,
    gender: student.gender ? student.gender.toLowerCase() : null,
    category: student.category,
    aadhaar_number: student.aadhaar_number,
    parent_name: student.parent_name,
    parent_contact_no: student.parent_contact_no,
    blood_group: student.blood_group,
    program_name: student.program_name,
    admission_year: student.admission_year,
    current_semester: student.current_semester,
    overall_attendance_percentage: decimalToNumber(student.overall_attendance_percentage),
    permanent_address: student.permanent_address,
    current_address: student.residential_address,
    residential_address: student.residential_address,
    profile_completion_percentage: student.profile_completion_percentage,
    policy_accepted: student.policy_accepted,
    policy_accepted_at: student.policy_accepted_at?.toISOString() ?? null,
    no_dues_enabled: student.no_dues_enabled,
    profile_blocked: student.profile_blocked,
    profile_block_reason: student.profile_block_reason,
    placement: {
      opted_out: student.placement_opt_out,
      reason: student.placement_opt_out_reason,
      opted_out_at: student.placement_opt_out_at?.toISOString() ?? null,
    },
    posting_type_opt_outs: student.posting_type_preferences.map((pref) => ({
      posting_type_master_id: pref.posting_type_master_id,
      label: pref.posting_type_master?.value ?? '',
      reason: pref.reason,
      updated_at: pref.updated_at.toISOString(),
    })),
    placement_pref_history: student.placement_pref_history.map((entry) => ({
      id: entry.id,
      scope: entry.scope,
      posting_type_master_id: entry.posting_type_master_id,
      posting_type_label: entry.posting_type_label,
      interested: entry.interested,
      reason: entry.reason,
      created_at: entry.created_at.toISOString(),
    })),
    verificationStatus: student.verification_status,
    verification_remarks: student.verification_remarks,
    verified_at: student.verified_at?.toISOString() ?? null,
    created_at: student.created_at.toISOString(),
    updated_at: student.updated_at.toISOString(),
    academicProfile,
    interests: student.interest_registrations.map((interest) => ({
      id: interest.id,
      interest_type: interest.interest_type,
      registered_at: interest.registered_at.toISOString(),
      label: INTEREST_LABELS[interest.interest_type] ?? interest.interest_type,
      status: interest.status,
      reviewed_at: interest.reviewed_at ? interest.reviewed_at.toISOString() : null,
      reviewed_by_name: interest.reviewed_by_name ?? null,
      status_reason: interest.status_reason ?? null,
    })),
    skills: student.skills_profile
      ? {
          technical_skills: student.skills_profile.technical_skills,
          domain_interests: student.skills_profile.domain_interests,
          preferred_locations: student.skills_profile.preferred_locations,
        }
      : null,
    employments: student.employments.map((employment) => ({
      id: employment.id,
      is_currently_working: employment.is_currently_working,
      employment_type: employment.employment_type,
      company_name: employment.company_name,
      designation: employment.designation,
      package_lpa: decimalToNumber(employment.package_lpa),
      status: employment.status,
      closed_at: employment.closed_at ? employment.closed_at.toISOString() : null,
      offer_letter_url: employment.offer_letter_url,
      completion_proof_url: employment.completion_proof_url,
      completion_proof_name: employment.completion_proof_name,
      updated_at: employment.updated_at.toISOString(),
    })),
    projects: student.projects.map((project) => ({
      id: project.id,
      title: project.title,
      description: project.description,
      technologies: project.technologies,
      github_url: project.github_url,
      demo_url: project.demo_url,
      start_date: toIso(project.start_date),
      end_date: toIso(project.end_date),
      is_ongoing: project.is_ongoing,
      created_at: project.created_at.toISOString(),
    })),
    certifications: student.certifications.map((certification) => ({
      id: certification.id,
      name: certification.name,
      issuer: certification.issuer,
      issue_date: toIso(certification.issue_date),
      credential_url: certification.credential_url,
      document_url: certification.document_url,
      document_name: certification.document_name,
      document_mime_type: certification.document_mime_type,
      document_size: certification.document_size,
      created_at: certification.created_at.toISOString(),
    })),
    resumes: student.resumes.map((resume) => ({
      id: resume.id,
      name: resume.name,
      file_url: resume.file_url,
      file_size: resume.file_size,
      mime_type: resume.mime_type,
      is_default: resume.is_default,
      ai_score: resume.ai_score,
      uploaded_at: resume.uploaded_at.toISOString(),
    })),
    applications: student.applications.map((application) => ({
      id: application.id,
      current_stage: application.current_stage,
      applied_at: application.applied_at.toISOString(),
      updated_at: application.updated_at.toISOString(),
      posting: {
        id: application.posting.id,
        title: application.posting.title,
        role_name: application.posting.role_name,
        type: application.posting.posting_type_master?.value ?? '',
        status: application.posting.status,
        ctc: application.posting.ctc,
        stipend: application.posting.stipend,
        company_name: application.posting.company.name,
      },
      resume: application.resume
        ? {
            id: application.resume.id,
            name: application.resume.name,
            file_url: application.resume.file_url,
          }
        : null,
    })),
    offers: student.offers.map((offer) => ({
      id: offer.id,
      type: offer.type,
      role: offer.role,
      ctc: offer.ctc,
      stipend: offer.stipend,
      location: offer.location,
      offer_date: offer.offer_date.toISOString(),
      status: offer.status,
      accepted_at: toIso(offer.accepted_at),
      joining_status: offer.joining_status,
      joining_date: toIso(offer.joining_date),
      company_name: offer.company.name,
      posting_title: offer.posting.title,
    })),
    internships: student.internships.map((internship) => ({
      id: internship.id,
      company_name: internship.company_name,
      role: internship.role,
      internship_type: internship.internship_type,
      status: internship.status,
      start_date: internship.start_date.toISOString(),
      end_date: toIso(internship.end_date),
      stipend_amount: decimalToNumber(internship.stipend_amount),
      stipend_frequency: internship.stipend_frequency,
      is_receiving_stipend: internship.is_receiving_stipend,
      certificate_uploaded: internship.certificate_uploaded,
      certificate_url: internship.certificate_url,
      issue_count: internship.issues.length,
      open_issue_count: internship.issues.filter((issue) => issue.status === 'open').length,
      created_at: internship.created_at.toISOString(),
    })),
    noc_requests: student.noc_requests.map((noc) => ({
      id: noc.id,
      noc_type: noc.noc_type,
      program: noc.program,
      placement_source: noc.placement_source,
      company_name: noc.company_name,
      role_title: noc.role_title,
      stipend_amount: decimalToNumber(noc.stipend_amount),
      start_date: noc.start_date.toISOString(),
      end_date: noc.end_date ? noc.end_date.toISOString() : null,
      offer_letter_url: noc.offer_letter_url,
      status: noc.status,
      noc_number: noc.noc_number,
      certificate_url: noc.certificate_url,
      created_at: noc.created_at.toISOString(),
    })),
    policy_acceptances: student.policy_acceptances.map((acceptance) => ({
      id: acceptance.id,
      policy_id: acceptance.policy_id,
      policy_title: acceptance.policy?.title ?? null,
      policy_version: acceptance.policy_version,
      policy_updated_at: toIso(acceptance.policy_updated_at),
      accepted_at: acceptance.accepted_at.toISOString(),
    })),
    portfolio: student.portfolio
      ? {
          id: student.portfolio.id,
          status: student.portfolio.status,
          project_count: student.portfolio.project_count,
          internship_count: student.portfolio.internship_count,
          updated_at: student.portfolio.updated_at.toISOString(),
          projects: student.portfolio.projects.map((project) => ({
            id: project.id,
            title: project.title,
            description: project.description,
            role: project.role,
            technologies: project.technologies,
            keywords: project.keywords,
            github_url: project.github_url,
            live_url: project.live_url,
            start_date: toIso(project.start_date),
            end_date: toIso(project.end_date),
            is_ongoing: project.is_ongoing,
          })),
          showcases: student.portfolio.showcases.map((showcase) => ({
            id: showcase.id,
            company_name: showcase.company_name,
            role: showcase.role,
            duration_months: showcase.duration_months,
            start_date: toIso(showcase.start_date),
            end_date: toIso(showcase.end_date),
            key_outcomes: showcase.key_outcomes,
            proof_url: showcase.proof_url,
            is_verified: showcase.is_verified,
            linked_internship_id: showcase.linked_internship_id,
          })),
        }
      : null,
    no_dues_requests: student.no_dues_requests.map((request) => ({
      id: request.id,
      exit_reason: request.exit_reason,
      company_name: request.company_name,
      designation: request.designation,
      package_lpa: decimalToNumber(request.package_lpa),
      status: request.status,
      ndc_number: request.ndc_number,
      certificate_url: request.certificate_url,
      created_at: request.created_at.toISOString(),
    })),
  };
}

async function getStudentsForRuleMatching(tenantId: string) {
  return prisma.student.findMany({
    where: { tenant_id: tenantId },
    include: {
      academic_profile: true,
    },
  });
}

function countEligibleStudents(rule: EligibilityRule, students: RuleMatchingStudent[]) {
  return students.filter((student) => matchesEligibilityRule(student, rule)).length;
}

function matchesEligibilityRule(student: RuleMatchingStudent, rule: EligibilityRule) {
  const cgpa = decimalToNumber(student.academic_profile?.cgpa);
  const tenth = decimalToNumber(student.academic_profile?.tenth_percentage);
  const twelfth = decimalToNumber(student.academic_profile?.twelfth_percentage);
  const backlogCount = student.academic_profile?.backlog_count ?? 0;

  if (rule.is_active === false) return false;
  if (rule.eligible_branches.length > 0 && !rule.eligible_branches.includes(student.department)) return false;
  if (rule.eligible_batches.length > 0 && !rule.eligible_batches.includes(student.batch)) return false;
  if (cgpa == null || cgpa < decimalToNumber(rule.min_cgpa)!) return false;
  if (backlogCount > rule.max_backlogs) return false;
  if (rule.min_tenth != null && (tenth == null || tenth < decimalToNumber(rule.min_tenth)!)) return false;
  if (rule.min_twelfth != null && (twelfth == null || twelfth < decimalToNumber(rule.min_twelfth)!)) return false;

  return true;
}

function mapEligibilityRule(rule: EligibilityRule, eligibleStudentsCount: number) {
  return {
    id: rule.id,
    rule_name: rule.rule_name,
    company_name: rule.company_name,
    min_cgpa: decimalToNumber(rule.min_cgpa),
    max_backlogs: rule.max_backlogs,
    required_branches: rule.eligible_branches,
    eligible_batches: rule.eligible_batches,
    min_tenth_percentage: decimalToNumber(rule.min_tenth),
    min_twelfth_percentage: decimalToNumber(rule.min_twelfth),
    additional_criteria: rule.additional_criteria,
    is_active: rule.is_active,
    eligible_students_count: eligibleStudentsCount,
    created_at: rule.created_at.toISOString(),
    updated_at: rule.updated_at.toISOString(),
  };
}

function buildPortfolioMonitoringStudentWhere(tenantId: string, filters: QueryPortfoliosInput): Prisma.StudentWhereInput {
  const conditions: Prisma.StudentWhereInput[] = [{ tenant_id: tenantId }];

  if (filters.department) {
    conditions.push({ department: filters.department });
  }

  conditions.push(...buildStudentScopeConditions({
    institute: filters.institute,
    course: filters.course,
    branch: filters.branch,
    semester: filters.semester,
  }));

  if (filters.search) {
    conditions.push({
      OR: [
        { full_name: { contains: filters.search, mode: 'insensitive' } },
        { enrollment_number: { contains: filters.search, mode: 'insensitive' } },
        { roll_number: { contains: filters.search, mode: 'insensitive' } },
      ],
    });
  }

  if (filters.status === 'published') {
    conditions.push({
      portfolio: {
        is: {
          status: 'published',
        },
      },
    });
  } else if (filters.status === 'draft') {
    conditions.push({
      OR: [
        { portfolio: { is: null } },
        { portfolio: { is: { status: 'draft' } } },
      ],
    });
  }

  return { AND: conditions };
}

function mapPortfolioMonitoringStudent(student: PortfolioMonitoringStudent) {
  const portfolio = student.portfolio;

  return {
    id: portfolio?.id ?? student.id,
    student_id: student.id,
    student_name: student.full_name,
    enrollment_number: student.enrollment_number,
    department: student.department,
    batch: student.batch,
    status: portfolio?.status ?? 'draft',
    project_count: portfolio?.project_count ?? 0,
    internship_count: portfolio?.internship_count ?? 0,
    last_updated: (portfolio?.updated_at ?? student.updated_at).toISOString(),
    created_at: (portfolio?.created_at ?? student.created_at).toISOString(),
  };
}

function mapPlacementOutcome(joiningStatus: string): SelectionOutcome {
  if (joiningStatus === 'joined') return 'joined';
  if (joiningStatus === 'did_not_join') return 'not_joined';
  return 'pending';
}

function mapInternshipOutcome(status: string): SelectionOutcome {
  if (status === 'completed') return 'joined';
  if (status === 'discontinued') return 'not_joined';
  return 'pending';
}

function applySelectionFilters(
  records: Array<{
    id: string;
    student_name: string;
    enrollment_number: string;
    department: string;
    batch: string;
    institute: string | null;
    course: string | null;
    semester: string | null;
    company_name: string;
    role: string;
    type: 'placement' | 'internship';
    posting_type: string | null;
    selection_date: string;
    outcome: SelectionOutcome;
    joining_date: string | null;
    finalized_by: string | null;
    is_locked: boolean;
    noc_status: 'issued' | 'pending';
  }>,
  filters: QuerySelectionDatabaseInput
) {
  const ciEquals = (value: string | null, filter?: string) => !filter || (value ?? '').toLowerCase() === filter.toLowerCase();
  const ciContains = (value: string | null, filter?: string) => !filter || (value ?? '').toLowerCase().includes(filter.toLowerCase());
  return records.filter((record) => {
    if (filters.type && record.type !== filters.type) return false;
    if (filters.posting_type && record.posting_type !== filters.posting_type) return false;
    if (filters.department && record.department !== filters.department) return false;
    if (filters.batch && record.batch !== filters.batch) return false;
    if (filters.company && record.company_name !== filters.company) return false;
    if (filters.outcome && record.outcome !== filters.outcome) return false;
    if (!ciContains(record.institute, filters.institute)) return false;
    if (!ciContains(record.course, filters.course)) return false;
    if (!ciContains(record.department, filters.branch)) return false;
    if (!ciEquals(record.semester, filters.semester)) return false;
    if (!ciContains(record.batch, filters.academic_year)) return false;

    if (filters.search) {
      const query = filters.search.toLowerCase();
      const matchesSearch = [
        record.student_name,
        record.enrollment_number,
        record.company_name,
        record.role,
      ].some((field) => field.toLowerCase().includes(query));
      if (!matchesSearch) return false;
    }

    const selectionDate = new Date(record.selection_date);
    if (filters.date_from && selectionDate < filters.date_from) return false;
    if (filters.date_to && selectionDate > filters.date_to) return false;

    return true;
  });
}

function getAcademicYearLabel(date: Date) {
  const startYear = date.getMonth() >= 5 ? date.getFullYear() : date.getFullYear() - 1;
  const endYear = String((startYear + 1) % 100).padStart(2, '0');
  return `${startYear}-${endYear}`;
}

async function writeAdminAuditLog(args: {
  tenantId: string;
  actor: AdminActor;
  action: string;
  module: string;
  targetType?: string;
  targetId?: string;
  details?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        tenant_id: args.tenantId,
        user_id: args.actor.id,
        user_name: args.actor.name ?? undefined,
        action: args.action,
        module: args.module,
        target_type: args.targetType,
        target_id: args.targetId,
        details: args.details,
      },
    });
  } catch (err) {
    logger.error({ err }, 'Failed to write admin audit log');
  }
}
