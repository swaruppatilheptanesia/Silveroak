import { MasterCategory, Prisma, User } from '@prisma/client';
import { prisma } from '../../config/database';
import { logger } from '../../config/logger';
import { ConflictError, NotFoundError } from '../../shared/errors';
import { matchesStudentTargeting, type StudentTargetContext } from '../../shared/utils/student-targeting';
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
  is_active: boolean;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
};

const ensuredTenantMasterSeeds = new Set<string>();
const ensuredTenantPolicyCategorySeedVersions = new Map<string, number>();
const ensuredTenantNocTypeSeedVersions = new Map<string, number>();
const pendingTenantMasterSeeds = new Map<string, Promise<void>>();
const POLICY_CATEGORY_MASTER_SEED_VERSION = 1;
const NOC_TYPE_MASTER_SEED_VERSION = 1;
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

function mapMasterOption(masterOption: MasterOptionWithTargets) {
  return {
    id: masterOption.id,
    category: masterOption.category,
    value: masterOption.value,
    is_active: masterOption.is_active,
    target_institutes: masterOption.target_institutes,
    target_courses: masterOption.target_courses,
    target_branches: masterOption.target_branches,
    target_semesters: masterOption.target_semesters,
    created_at: masterOption.created_at,
    updated_at: masterOption.updated_at,
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

  const studentTargetContext = role === 'student' && userId
    ? await getStudentTargetContext(userId)
    : null;

  return {
    data: masters
      .filter((master) => (
        studentTargetContext
          ? matchesStudentTargeting(master, studentTargetContext)
          : true
      ))
      .map(mapMasterOption),
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

  return {
    data: masters.map(mapMasterOption),
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
      is_active: data.is_active ?? true,
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
      ...(data.is_active !== undefined ? { is_active: data.is_active } : {}),
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
