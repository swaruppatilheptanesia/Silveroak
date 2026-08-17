import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { BusinessRuleError, NotFoundError } from '../../shared/errors';
import { paginate, buildPrismaQuery } from '../../shared/utils/pagination';
import { notifyManyUsers } from '../notifications/notification.service';
import type {
  CreatePolicyInput,
  QueryBranchesByCourseInput,
  QueryCoursesByInstituteInput,
  QueryPoliciesInput,
  UpdatePolicyInput,
} from './policy.schema';

type AudienceOption = {
  id: number;
  name: string;
};

type CrmInstitute = {
  instituteId?: number;
  instituteName?: string;
  InstituteId?: number;
  InstituteName?: string;
};

type CrmBranch = {
  BranchId?: number;
  BranchName?: string;
  branchId?: number;
  branchName?: string;
};

type CrmCourse = {
  CourseId?: number;
  CourseName?: string;
  courseId?: number;
  courseName?: string;
};

type StudentAudience = {
  studentId: string;
  policyAcceptedAt: Date | null;
  institute: string | null;
  branch: string | null;
  course: string | null;
};

const NO_MATCH = '__policy_no_match__';

function normalizeTargets(values: string[] | undefined | null): string[] | undefined {
  if (!values) return undefined;
  const normalized = values
    .map((value) => value.trim())
    .filter(Boolean);
  return Array.from(new Set(normalized)).slice(0, 1);
}

// '' (form "Global" choice) collapses to null so the column holds a real FK or NULL.
function normalizePostingTypeId(value: string | null | undefined): string | null {
  const trimmed = typeof value === 'string' ? value.trim() : value;
  return trimmed ? trimmed : null;
}

function normalizeCreatePolicyData(data: CreatePolicyInput): CreatePolicyInput {
  return {
    ...data,
    target_institutes: normalizeTargets(data.target_institutes) ?? [],
    target_branches: normalizeTargets(data.target_branches) ?? [],
    target_courses: normalizeTargets(data.target_courses) ?? [],
    posting_type_master_id: normalizePostingTypeId(data.posting_type_master_id),
  };
}

function normalizeUpdatePolicyData(data: UpdatePolicyInput): UpdatePolicyInput {
  return {
    ...data,
    target_institutes: data.target_institutes === undefined ? undefined : normalizeTargets(data.target_institutes) ?? [],
    target_branches: data.target_branches === undefined ? undefined : normalizeTargets(data.target_branches) ?? [],
    target_courses: data.target_courses === undefined ? undefined : normalizeTargets(data.target_courses) ?? [],
    posting_type_master_id: data.posting_type_master_id === undefined
      ? undefined
      : normalizePostingTypeId(data.posting_type_master_id),
  };
}

async function fetchCrmList<T>(url: string): Promise<T[]> {
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
  } catch {
    throw new BusinessRuleError('Unable to reach CRM service', 'CRM_LOOKUP_FAILED');
  }

  if (!response.ok) {
    throw new BusinessRuleError('Unable to fetch CRM audience options', 'CRM_LOOKUP_FAILED');
  }

  const payload = await response.json().catch(() => null);
  if (!Array.isArray(payload)) {
    throw new BusinessRuleError('CRM returned an invalid audience response', 'CRM_INVALID_RESPONSE');
  }

  return payload as T[];
}

function makeUrl(baseUrl: string, query: Record<string, string | number>) {
  const url = new URL(baseUrl);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function filterValidOptions(options: AudienceOption[]) {
  return options.filter((option) => Number.isFinite(option.id) && Boolean(option.name.trim()));
}

function pickNumber(value: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const candidate = value[key];
    const parsed = Number(candidate);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return Number.NaN;
}

function pickText(value: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const candidate = value[key];
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }
  return '';
}

export async function getInstituteOptions() {
  const institutes = await fetchCrmList<CrmInstitute>(env.crmInstituteListUrl);
  return {
    data: filterValidOptions(
      institutes.map((item) => ({
        id: pickNumber(item as Record<string, unknown>, ['instituteId', 'InstituteId']),
        name: pickText(item as Record<string, unknown>, ['instituteName', 'InstituteName']),
      })),
    ),
  };
}

export async function getBranchOptions(input: QueryBranchesByCourseInput) {
  const branches = await fetchCrmList<CrmBranch>(
    makeUrl(env.crmBranchListUrl, { CourseId: input.CourseId }),
  );
  return {
    data: filterValidOptions(
      branches.map((item) => ({
        id: pickNumber(item as Record<string, unknown>, ['BranchId', 'branchId']),
        name: pickText(item as Record<string, unknown>, ['BranchName', 'branchName']),
      })),
    ),
  };
}

export async function getCourseOptions(input: QueryCoursesByInstituteInput) {
  const courses = await fetchCrmList<CrmCourse>(
    makeUrl(env.crmCourseListUrl, { InstituteId: input.InstituteId }),
  );
  return {
    data: filterValidOptions(
      courses.map((item) => ({
        id: pickNumber(item as Record<string, unknown>, ['CourseId', 'courseId']),
        name: pickText(item as Record<string, unknown>, ['CourseName', 'courseName']),
      })),
    ),
  };
}

async function getStudentAudience(tenantId: string, userId: string): Promise<StudentAudience> {
  const student = await prisma.student.findFirst({
    where: { tenant_id: tenantId, user_id: userId },
    select: {
      id: true,
      policy_accepted_at: true,
      institute: true,
      department: true,
      course: true,
    },
  });

  if (!student) {
    throw new NotFoundError('Student profile');
  }

  return {
    studentId: student.id,
    policyAcceptedAt: student.policy_accepted_at,
    institute: student.institute,
    branch: student.department,
    course: student.course,
  };
}

function isPolicyAcceptedCurrent(
  policy: { id: string; updated_at: Date; posting_type_master_id: string | null },
  acceptances: Array<{ policy_id: string | null; policy_updated_at: Date | null; accepted_at: Date }>,
  legacyAcceptedAt: Date | null
) {
  const currentAcceptance = acceptances.find((acceptance) => {
    return acceptance.policy_id === policy.id
      && acceptance.policy_updated_at?.getTime() === policy.updated_at.getTime();
  });

  if (currentAcceptance) {
    return { accepted_current: true, accepted_at: currentAcceptance.accepted_at };
  }

  // `legacyAcceptedAt` is Student.policy_accepted_at, which is written ONLY when a GLOBAL policy is
  // accepted (student.service.acceptPolicy skips it for linked ones). Honouring it for a
  // posting-type-LINKED policy silently marks a policy the student has never seen as accepted, which
  // both hides the gate modal and disables enforcement — so it applies to global policies only.
  const isGlobalPolicy = policy.posting_type_master_id === null;
  if (isGlobalPolicy && legacyAcceptedAt && legacyAcceptedAt.getTime() >= policy.updated_at.getTime()) {
    return { accepted_current: true, accepted_at: legacyAcceptedAt };
  }

  return { accepted_current: false, accepted_at: null };
}

async function attachStudentAcceptanceStatus<
  T extends { id: string; updated_at: Date; posting_type_master_id: string | null },
>(
  policies: T[],
  audience: StudentAudience
) {
  if (policies.length === 0) return policies;

  const acceptances = await prisma.policyAcceptance.findMany({
    where: {
      student_id: audience.studentId,
      policy_id: { in: policies.map((policy) => policy.id) },
    },
    select: {
      policy_id: true,
      policy_updated_at: true,
      accepted_at: true,
    },
    orderBy: { accepted_at: 'desc' },
  });

  return policies.map((policy) => ({
    ...policy,
    ...isPolicyAcceptedCurrent(policy, acceptances, audience.policyAcceptedAt),
  }));
}

function buildStudentAudienceWhere(policy: { target_institutes: string[]; target_branches: string[]; target_courses: string[] }): Prisma.StudentWhereInput {
  const conditions: Prisma.StudentWhereInput[] = [];

  if (policy.target_institutes.length > 0) {
    conditions.push({ institute: { in: policy.target_institutes } });
  }
  if (policy.target_branches.length > 0) {
    conditions.push({ department: { in: policy.target_branches } });
  }
  if (policy.target_courses.length > 0) {
    conditions.push({ course: { in: policy.target_courses } });
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}

function buildPolicyAudienceWhere(audience: StudentAudience): Prisma.PolicyWhereInput {
  return {
    AND: [
      {
        OR: [
          { target_institutes: { isEmpty: true } },
          { target_institutes: { has: audience.institute ?? NO_MATCH } },
        ],
      },
      {
        OR: [
          { target_branches: { isEmpty: true } },
          { target_branches: { has: audience.branch ?? NO_MATCH } },
        ],
      },
      {
        OR: [
          { target_courses: { isEmpty: true } },
          { target_courses: { has: audience.course ?? NO_MATCH } },
        ],
      },
    ],
  };
}

async function buildPolicyWhere(tenantId: string, filters: QueryPoliciesInput, user: Express.AuthUser): Promise<Prisma.PolicyWhereInput> {
  const { category, global, posting_type_master_id } = filters;
  const where: Prisma.PolicyWhereInput = { tenant_id: tenantId };
  if (category) where.category = category;

  // When a specific posting type is requested, return that type's linked policies (for
  // students too — this is the posting-type policy they must accept before apply/interest).
  // Otherwise students (and ?global=true callers) see only GLOBAL policies (no posting-type
  // link) — mixing linked policies into the global gate would deadlock it.
  if (posting_type_master_id) {
    where.posting_type_master_id = posting_type_master_id;
  } else if (user.role === 'student' || global) {
    where.posting_type_master_id = null;
  }

  if (user.role === 'student') {
    const audience = await getStudentAudience(tenantId, user.id);
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : []),
      buildPolicyAudienceWhere(audience),
    ];
  }

  return where;
}

export async function getPolicies(tenantId: string, filters: QueryPoliciesInput, user: Express.AuthUser) {
  const { page, limit, sort_by, sort_order } = filters;
  const where = await buildPolicyWhere(tenantId, filters, user);
  const audience = user.role === 'student' ? await getStudentAudience(tenantId, user.id) : null;

  const [policies, total] = await Promise.all([
    prisma.policy.findMany({
      where, ...buildPrismaQuery(page, limit),
      orderBy: { [sort_by || 'created_at']: sort_order || 'desc' },
      include: { posting_type_master: { select: { id: true, value: true } } },
    }),
    prisma.policy.count({ where }),
  ]);
  const data = audience ? await attachStudentAcceptanceStatus(policies, audience) : policies;
  return { data, pagination: paginate(page, limit, total) };
}

export async function getPolicyById(id: string, tenantId: string, user: Express.AuthUser) {
  const where: Prisma.PolicyWhereInput = { id, tenant_id: tenantId };
  if (user.role === 'student') {
    // Students may read any audience-visible policy — global OR posting-type-linked
    // (they must be able to read the linked policy content they're asked to accept).
    const audience = await getStudentAudience(tenantId, user.id);
    where.AND = [buildPolicyAudienceWhere(audience)];
  }

  const policy = await prisma.policy.findFirst({
    where,
    include: { posting_type_master: { select: { id: true, value: true } } },
  });
  if (!policy) throw new NotFoundError('Policy');
  if (user.role === 'student') {
    const audience = await getStudentAudience(tenantId, user.id);
    const [annotatedPolicy] = await attachStudentAcceptanceStatus([policy], audience);
    return annotatedPolicy;
  }
  return policy;
}

export async function createPolicy(tenantId: string, data: CreatePolicyInput, userName: string) {
  const policy = await prisma.policy.create({
    data: { tenant_id: tenantId, ...normalizeCreatePolicyData(data), updated_by: userName },
  });

  try {
    const tenantStudents = await prisma.user.findMany({
      where: { tenant_id: tenantId, role: 'student', is_active: true },
      select: { id: true },
    });
    if (tenantStudents.length > 0) {
      void notifyManyUsers({
        tenantId,
        type: 'policy',
        title: `New placement policy: ${policy.title}`,
        description: 'Review and accept to remain eligible for placements.',
        priority: 'medium',
        actionUrl: '/policy',
        payload: { policy_id: policy.id },
        userIds: tenantStudents.map((u) => u.id),
      });
    }
  } catch (err) {
    // swallow
  }

  return policy;
}

export async function updatePolicy(id: string, tenantId: string, data: UpdatePolicyInput, userName: string) {
  const existing = await prisma.policy.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Policy');
  if (existing.tenant_id !== tenantId) throw new NotFoundError('Policy');
  const updatedPolicy = await prisma.policy.update({ where: { id }, data: { ...normalizeUpdatePolicyData(data), updated_by: userName } });
  await prisma.student.updateMany({
    where: {
      tenant_id: tenantId,
      ...buildStudentAudienceWhere(updatedPolicy),
    },
    data: {
      policy_accepted: false,
      policy_accepted_at: null,
    },
  });
  return updatedPolicy;
}

export async function deletePolicy(id: string, tenantId: string) {
  const existing = await prisma.policy.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError('Policy');
  if (existing.tenant_id !== tenantId) throw new NotFoundError('Policy');
  await prisma.policy.delete({ where: { id } });
}
