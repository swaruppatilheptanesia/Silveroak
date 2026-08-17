import { MasterCategory, Prisma, User } from '@prisma/client';
import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { ConflictError, NotFoundError } from '../../shared/errors';
import { matchesStudentTargetingForMaster, type StudentTargetContext } from '../../shared/utils/student-targeting';
import type {
  CreateMasterInput,
  QueryAdminMastersInput,
  QueryMastersInput,
  UpdateMasterInput,
} from './masters.schema';

type MasterActor = Pick<User, 'id' | 'name'>;
type MasterOptionWithTargets = {
  id: string;
  tenant_id: string;
  category: MasterCategory;
  value: string;
  normalized_value: string;
  target_institutes: string[];
  target_courses: string[];
  target_branches: string[];
  target_semesters: string[];
  target_academic_years: string[];
  is_active: boolean;
  accepting_applications: boolean;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
};

const ensuredTenantMasterSeeds = new Set<string>();
const ensuredTenantPolicyCategorySeedVersions = new Map<string, number>();
const ensuredTenantNocTypeSeedVersions = new Map<string, number>();
const ensuredTenantEventTypeSeedVersions = new Map<string, number>();
const pendingTenantMasterSeeds = new Map<string, Promise<void>>();
const POLICY_CATEGORY_MASTER_SEED_VERSION = 1;
const NOC_TYPE_MASTER_SEED_VERSION = 1;
const EVENT_TYPE_MASTER_SEED_VERSION = 1;
const DEFAULT_POLICY_CATEGORY_VALUES = [
  'placement_policy',
  'mou_template',
  'code_of_conduct',
  'internship_guidelines',
  'compliance',
  'institutional',
] as const;
const DEFAULT_NOC_TYPE_VALUES = [
  'internship',
  'training',
  'project',
] as const;
const DEFAULT_EVENT_TYPE_VALUES = [
  'campus_drive',
  'ppt',
  'test_assessment',
  'internship_drive',
  'workshop',
] as const;

function cleanMasterValue(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeMasterValue(value: string) {
  return cleanMasterValue(value).toLowerCase();
}

function uniqueNormalizedValues(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const uniqueValues: string[] = [];

  for (const rawValue of values) {
    if (!rawValue) continue;

    const cleanedValue = cleanMasterValue(rawValue);
    if (!cleanedValue) continue;

    const normalizedValue = normalizeMasterValue(cleanedValue);
    if (seen.has(normalizedValue)) continue;

    seen.add(normalizedValue);
    uniqueValues.push(cleanedValue);
  }

  return uniqueValues;
}

async function ensureTenantPolicyCategorySeeded(tenantId: string) {
  if (ensuredTenantPolicyCategorySeedVersions.get(tenantId) === POLICY_CATEGORY_MASTER_SEED_VERSION) {
    return;
  }

  const policyCategoryRecords = uniqueNormalizedValues([...DEFAULT_POLICY_CATEGORY_VALUES]).map((value) => ({
    tenant_id: tenantId,
    category: 'policy_category' as const,
    value,
    normalized_value: normalizeMasterValue(value),
  }));

  if (policyCategoryRecords.length > 0) {
    await prisma.masterOption.createMany({
      data: policyCategoryRecords,
      skipDuplicates: true,
    });
  }

  ensuredTenantPolicyCategorySeedVersions.set(tenantId, POLICY_CATEGORY_MASTER_SEED_VERSION);
}

async function ensureTenantNocTypeSeeded(tenantId: string) {
  if (ensuredTenantNocTypeSeedVersions.get(tenantId) === NOC_TYPE_MASTER_SEED_VERSION) {
    return;
  }

  const nocTypeRecords = uniqueNormalizedValues([...DEFAULT_NOC_TYPE_VALUES]).map((value) => ({
    tenant_id: tenantId,
    category: 'noc_type' as const,
    value,
    normalized_value: normalizeMasterValue(value),
  }));

  if (nocTypeRecords.length > 0) {
    await prisma.masterOption.createMany({
      data: nocTypeRecords,
      skipDuplicates: true,
    });
  }

  ensuredTenantNocTypeSeedVersions.set(tenantId, NOC_TYPE_MASTER_SEED_VERSION);
}

async function ensureTenantEventTypeSeeded(tenantId: string) {
  if (ensuredTenantEventTypeSeedVersions.get(tenantId) === EVENT_TYPE_MASTER_SEED_VERSION) {
    return;
  }

  const eventTypeRecords = uniqueNormalizedValues([...DEFAULT_EVENT_TYPE_VALUES]).map((value) => ({
    tenant_id: tenantId,
    category: 'event_type' as const,
    value,
    normalized_value: normalizeMasterValue(value),
  }));

  if (eventTypeRecords.length > 0) {
    await prisma.masterOption.createMany({
      data: eventTypeRecords,
      skipDuplicates: true,
    });
  }

  ensuredTenantEventTypeSeedVersions.set(tenantId, EVENT_TYPE_MASTER_SEED_VERSION);
}

/**
 * Dependent-record counts for a posting_type master. Drives the admin delete confirmation:
 * `postings` blocks the delete (FK is onDelete: Restrict), the rest are silent side effects
 * (NOC templates + student preferences cascade-delete; linked policies fall back to global).
 */
export interface MasterOptionUsage {
  postings: number;
  noc_templates: number;
  student_preferences: number;
  policies: number;
}

const EMPTY_MASTER_USAGE: MasterOptionUsage = {
  postings: 0,
  noc_templates: 0,
  student_preferences: 0,
  policies: 0,
};

function mapMasterOption(
  masterOption: MasterOptionWithTargets,
  companies?: Array<{ id: string; name: string }>,
  usage?: MasterOptionUsage,
) {
  return {
    id: masterOption.id,
    category: masterOption.category,
    value: masterOption.value,
    is_active: masterOption.is_active,
    target_institutes: masterOption.target_institutes,
    target_courses: masterOption.target_courses,
    target_branches: masterOption.target_branches,
    target_semesters: masterOption.target_semesters,
    target_academic_years: masterOption.target_academic_years,
    created_at: masterOption.created_at,
    updated_at: masterOption.updated_at,
    // Only posting_type options carry the list of companies that have used the type.
    ...(masterOption.category === 'posting_type' ? { companies: companies ?? [] } : {}),
    // posting_type only: Application Receiving toggle (visible-but-blocked when false).
    ...(masterOption.category === 'posting_type'
      ? { accepting_applications: masterOption.accepting_applications }
      : {}),
    // Admin-only dependent counts (omitted on the student-facing getMasters path).
    ...(masterOption.category === 'posting_type' && usage ? { usage } : {}),
  };
}

async function getStudentTargetContext(userId: string): Promise<StudentTargetContext> {
  const student = await prisma.student.findUnique({
    where: { user_id: userId },
    select: {
      institute: true,
      course: true,
      department: true,
      academic_profile: {
        select: {
          semester: true,
        },
      },
    },
  });

  if (!student) {
    throw new NotFoundError('Student profile');
  }

  return {
    institute: student.institute ?? null,
    course: student.course ?? null,
    branch: student.department ?? null,
    semester: student.academic_profile?.semester ?? null,
  };
}

function invalidateTenantMasterSeedCache(tenantId: string) {
  ensuredTenantMasterSeeds.delete(tenantId);
}

async function writeMasterAuditLog(args: {
  tenantId: string;
  actor: MasterActor;
  action: string;
  targetId?: string;
  details: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        tenant_id: args.tenantId,
        user_id: args.actor.id,
        user_name: args.actor.name ?? undefined,
        action: args.action,
        module: 'masters',
        target_type: 'master_option',
        target_id: args.targetId,
        details: args.details,
      },
    });
  } catch (err) {
    logger.error({ err }, 'Failed to write master audit log');
  }
}

export async function ensureTenantMastersSeeded(tenantId: string) {
  await ensureTenantPolicyCategorySeeded(tenantId);
  await ensureTenantNocTypeSeeded(tenantId);
  await ensureTenantEventTypeSeeded(tenantId);

  if (ensuredTenantMasterSeeds.has(tenantId)) {
    return;
  }

  const pendingSeed = pendingTenantMasterSeeds.get(tenantId);
  if (pendingSeed) {
    await pendingSeed;
    return;
  }

  const seedPromise = (async () => {
    const [
      skillProfiles,
      studentProjects,
      students,
      postings,
      eligibilityRules,
      announcements,
      internships,
      engagements,
    ] = await Promise.all([
      prisma.skillsProfile.findMany({
        where: { student: { tenant_id: tenantId } },
        select: { technical_skills: true, domain_interests: true },
      }),
      prisma.studentProject.findMany({
        where: { student: { tenant_id: tenantId } },
        select: { technologies: true },
      }),
      prisma.student.findMany({
        where: { tenant_id: tenantId },
        select: { department: true },
      }),
      prisma.posting.findMany({
        where: { tenant_id: tenantId },
        select: { eligible_branches: true, academic_year: true },
      }),
      prisma.eligibilityRule.findMany({
        where: { tenant_id: tenantId },
        select: { eligible_branches: true },
      }),
      prisma.announcement.findMany({
        where: { tenant_id: tenantId },
        select: { target_departments: true },
      }),
      prisma.internship.findMany({
        where: { tenant_id: tenantId },
        select: { department: true },
      }),
      prisma.companyEngagement.findMany({
        where: { tenant_id: tenantId },
        select: { academic_year: true },
      }),
    ]);

    const masterRecords = [
      ...uniqueNormalizedValues(skillProfiles.flatMap((profile) => profile.technical_skills)).map((value) => ({
        tenant_id: tenantId,
        category: 'skill' as const,
        value,
        normalized_value: normalizeMasterValue(value),
      })),
      ...uniqueNormalizedValues(skillProfiles.flatMap((profile) => profile.domain_interests)).map((value) => ({
        tenant_id: tenantId,
        category: 'interest' as const,
        value,
        normalized_value: normalizeMasterValue(value),
      })),
      ...uniqueNormalizedValues([
        ...studentProjects.flatMap((project) => project.technologies),
      ]).map((value) => ({
        tenant_id: tenantId,
        category: 'technology' as const,
        value,
        normalized_value: normalizeMasterValue(value),
      })),
      ...uniqueNormalizedValues([
        ...students.map((student) => student.department),
        ...postings.flatMap((posting) => posting.eligible_branches),
        ...eligibilityRules.flatMap((rule) => rule.eligible_branches),
        ...announcements.flatMap((announcement) => announcement.target_departments),
        ...internships.map((internship) => internship.department),
      ]).map((value) => ({
        tenant_id: tenantId,
        category: 'branch' as const,
        value,
        normalized_value: normalizeMasterValue(value),
      })),
      ...uniqueNormalizedValues([
        ...postings.map((posting) => posting.academic_year),
        ...engagements.map((engagement) => engagement.academic_year),
      ]).map((value) => ({
        tenant_id: tenantId,
        category: 'academic_year' as const,
        value,
        normalized_value: normalizeMasterValue(value),
      })),
    ];

    if (masterRecords.length > 0) {
      await prisma.masterOption.createMany({
        data: masterRecords,
        skipDuplicates: true,
      });
    }

    ensuredTenantMasterSeeds.add(tenantId);
  })().finally(() => {
    pendingTenantMasterSeeds.delete(tenantId);
  });

  pendingTenantMasterSeeds.set(tenantId, seedPromise);
  await seedPromise;
}

export async function getMasters(tenantId: string, query: QueryMastersInput, userId?: string, role?: User['role']) {
  await ensureTenantMastersSeeded(tenantId);

  const masters = (await prisma.masterOption.findMany({
    where: {
      tenant_id: tenantId,
      is_active: true,
      ...(query.category ? { category: query.category } : {}),
    },
    orderBy: [{ category: 'asc' }, { value: 'asc' }],
  })) as MasterOptionWithTargets[];

  // Students are normally scoped by posting-type targeting; `all_targets=true` opts out (NOC wizard's
  // Self-Sourced program list, where a placed student may need a posting type not targeted to them).
  const applyTargeting = role === 'student' && !!userId && !query.all_targets;
  const studentTargetContext = applyTargeting
    ? await getStudentTargetContext(userId!)
    : null;

  return {
    data: masters
      .filter((master) => (
        studentTargetContext
          ? matchesStudentTargetingForMaster(master, studentTargetContext)
          : true
      ))
      .map((master) => mapMasterOption(master)),
  };
}

export async function getAdminMasters(tenantId: string, query: QueryAdminMastersInput) {
  await ensureTenantMastersSeeded(tenantId);

  const masters = (await prisma.masterOption.findMany({
    where: {
      tenant_id: tenantId,
      ...(query.category ? { category: query.category } : {}),
      ...(query.include_inactive ? {} : { is_active: true }),
    },
    orderBy: [{ category: 'asc' }, { value: 'asc' }],
  })) as MasterOptionWithTargets[];

  // For posting_type options, attach the distinct companies that have had a
  // published/closed posting of that type (one extra query, only when relevant).
  const postingTypeIds = masters.filter((m) => m.category === 'posting_type').map((m) => m.id);
  const companiesByType = new Map<string, Array<{ id: string; name: string }>>();
  if (postingTypeIds.length > 0) {
    const rows = await prisma.posting.findMany({
      where: {
        tenant_id: tenantId,
        posting_type_master_id: { in: postingTypeIds },
        status: { in: ['published', 'closed'] },
      },
      select: { posting_type_master_id: true, company: { select: { id: true, name: true } } },
      distinct: ['posting_type_master_id', 'company_id'],
      orderBy: { company: { name: 'asc' } },
    });
    for (const row of rows) {
      const list = companiesByType.get(row.posting_type_master_id) ?? [];
      list.push({ id: row.company.id, name: row.company.name });
      companiesByType.set(row.posting_type_master_id, list);
    }
  }

  // Dependent-record counts per posting type, for the admin delete confirmation. Scoped to the
  // posting-type ids (never a per-row _count over every category) — mirrors the companies pass.
  const usageByType = new Map<string, MasterOptionUsage>();
  if (postingTypeIds.length > 0) {
    const scope = { posting_type_master_id: { in: postingTypeIds } };
    const [postingGroups, templateGroups, preferenceGroups, policyGroups] = await Promise.all([
      prisma.posting.groupBy({
        by: ['posting_type_master_id'],
        where: { tenant_id: tenantId, ...scope },
        _count: { _all: true },
      }),
      prisma.nocTemplate.groupBy({
        by: ['posting_type_master_id'],
        where: { tenant_id: tenantId, ...scope },
        _count: { _all: true },
      }),
      prisma.studentPostingTypePreference.groupBy({
        by: ['posting_type_master_id'],
        where: scope,
        _count: { _all: true },
      }),
      prisma.policy.groupBy({
        by: ['posting_type_master_id'],
        where: { tenant_id: tenantId, ...scope },
        _count: { _all: true },
      }),
    ]);

    function applyCounts(
      groups: Array<{ posting_type_master_id: string | null; _count: { _all: number } }>,
      key: keyof MasterOptionUsage,
    ) {
      for (const group of groups) {
        const masterId = group.posting_type_master_id;
        if (!masterId) continue;
        const current = usageByType.get(masterId) ?? { ...EMPTY_MASTER_USAGE };
        current[key] = group._count._all;
        usageByType.set(masterId, current);
      }
    }

    applyCounts(postingGroups, 'postings');
    applyCounts(templateGroups, 'noc_templates');
    applyCounts(preferenceGroups, 'student_preferences');
    applyCounts(policyGroups, 'policies');
  }

  return {
    data: masters.map((master) =>
      mapMasterOption(
        master,
        companiesByType.get(master.id),
        master.category === 'posting_type'
          ? usageByType.get(master.id) ?? { ...EMPTY_MASTER_USAGE }
          : undefined,
      ),
    ),
  };
}

export async function createMaster(tenantId: string, actor: MasterActor, data: CreateMasterInput) {
  const cleanedValue = cleanMasterValue(data.value);
  const normalizedValue = normalizeMasterValue(cleanedValue);

  const existing = await prisma.masterOption.findFirst({
    where: {
      tenant_id: tenantId,
      category: data.category,
      normalized_value: normalizedValue,
    },
  });

  if (existing) {
    throw new ConflictError('This master value already exists in the selected category', 'MASTER_OPTION_EXISTS');
  }

  const created = await prisma.masterOption.create({
    data: {
      tenant_id: tenantId,
      category: data.category,
      value: cleanedValue,
      normalized_value: normalizedValue,
      target_institutes: data.target_institutes ? uniqueNormalizedValues(data.target_institutes) : [],
      target_courses: data.target_courses ? uniqueNormalizedValues(data.target_courses) : [],
      target_branches: data.target_branches ? uniqueNormalizedValues(data.target_branches) : [],
      target_semesters: data.target_semesters ? uniqueNormalizedValues(data.target_semesters) : [],
      target_academic_years: data.target_academic_years ? uniqueNormalizedValues(data.target_academic_years) : [],
      is_active: data.is_active ?? true,
      accepting_applications: data.accepting_applications ?? true,
      created_by: actor.id,
    } as Prisma.MasterOptionUncheckedCreateInput,
  });

  invalidateTenantMasterSeedCache(tenantId);
  ensuredTenantMasterSeeds.add(tenantId);
  await writeMasterAuditLog({
    tenantId,
    actor,
    action: 'create',
    targetId: created.id,
    details: `Created ${created.category} master option "${created.value}"`,
  });

  return mapMasterOption(created as MasterOptionWithTargets);
}

export async function updateMaster(masterId: string, tenantId: string, actor: MasterActor, data: UpdateMasterInput) {
  const existing = await prisma.masterOption.findFirst({
    where: { id: masterId, tenant_id: tenantId },
  });

  if (!existing) {
    throw new NotFoundError('Master option');
  }

  const nextValue = data.value !== undefined ? cleanMasterValue(data.value) : existing.value;
  const nextNormalizedValue = data.value !== undefined ? normalizeMasterValue(data.value) : existing.normalized_value;

  if (nextNormalizedValue !== existing.normalized_value) {
    const duplicate = await prisma.masterOption.findFirst({
      where: {
        tenant_id: tenantId,
        category: existing.category,
        normalized_value: nextNormalizedValue,
        id: { not: masterId },
      },
    });

    if (duplicate) {
      throw new ConflictError('This master value already exists in the selected category', 'MASTER_OPTION_EXISTS');
    }
  }

  const updated = await prisma.masterOption.update({
    where: { id: masterId },
    data: {
      ...(data.value !== undefined
        ? {
            value: nextValue,
            normalized_value: nextNormalizedValue,
          }
        : {}),
      ...(data.target_institutes !== undefined
        ? { target_institutes: uniqueNormalizedValues(data.target_institutes) }
        : {}),
      ...(data.target_courses !== undefined
        ? { target_courses: uniqueNormalizedValues(data.target_courses) }
        : {}),
      ...(data.target_branches !== undefined
        ? { target_branches: uniqueNormalizedValues(data.target_branches) }
        : {}),
      ...(data.target_semesters !== undefined
        ? { target_semesters: uniqueNormalizedValues(data.target_semesters) }
        : {}),
      ...(data.target_academic_years !== undefined
        ? { target_academic_years: uniqueNormalizedValues(data.target_academic_years) }
        : {}),
      ...(data.is_active !== undefined ? { is_active: data.is_active } : {}),
      ...(data.accepting_applications !== undefined
        ? { accepting_applications: data.accepting_applications }
        : {}),
    } as Prisma.MasterOptionUncheckedUpdateInput,
  });

  invalidateTenantMasterSeedCache(tenantId);
  ensuredTenantMasterSeeds.add(tenantId);
  await writeMasterAuditLog({
    tenantId,
    actor,
    action: 'update',
    targetId: updated.id,
    details: `Updated ${updated.category} master option "${updated.value}"`,
  });

  return mapMasterOption(updated as MasterOptionWithTargets);
}

export async function deleteMaster(masterId: string, tenantId: string, actor: MasterActor) {
  const existing = await prisma.masterOption.findFirst({
    where: { id: masterId, tenant_id: tenantId },
  });

  if (!existing) {
    throw new NotFoundError('Master option');
  }

  // Posting.posting_type_master_id is onDelete: Restrict, so the DB refuses the delete while any
  // posting (any status) still references this type. Catch it here so the admin gets an actionable
  // message instead of the generic Prisma P2003 ("foreign key violation") envelope.
  if (existing.category === 'posting_type') {
    const postingsUsingType = await prisma.posting.count({
      where: { tenant_id: tenantId, posting_type_master_id: masterId },
    });

    if (postingsUsingType > 0) {
      throw new ConflictError(
        `Cannot delete posting type "${existing.value}" — ${postingsUsingType} posting${
          postingsUsingType === 1 ? '' : 's'
        } still use${postingsUsingType === 1 ? 's' : ''} it. Delete or reassign those postings first, `
          + 'or deactivate this posting type to hide it from new forms.',
        'MASTER_OPTION_IN_USE',
      );
    }
  }

  await prisma.masterOption.delete({
    where: { id: masterId },
  });

  invalidateTenantMasterSeedCache(tenantId);
  ensuredTenantMasterSeeds.add(tenantId);
  await writeMasterAuditLog({
    tenantId,
    actor,
    action: 'delete',
    targetId: existing.id,
    details: `Deleted ${existing.category} master option "${existing.value}"`,
  });

  return { message: 'Master option deleted successfully' };
}
