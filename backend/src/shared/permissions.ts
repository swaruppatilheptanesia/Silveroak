import { UserRole } from '@prisma/client';
import { prisma } from '../config/database';

export interface PermissionFlags {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
  can_approve: boolean;
}

export const PERMISSION_MODULES = [
  'masters',
  'students',
  'student_verification',
  'eligibility_rules',
  'portfolios',
  'selection_database',
  'interest_lists',
  'companies',
  'recruiters',
  'postings',
  'applications',
  'offers',
  'events',
  'noc_requests',
  'internships',
  'announcements',
  'circulars',
  'no_dues',
  'policies',
  'reports',
  'users',
  'audit_logs',
  'permissions',
] as const;

export type PermissionModule = typeof PERMISSION_MODULES[number];

export const PERMISSION_ROLES: UserRole[] = [
  'student',
  'recruiter',
  'faculty_coordinator',
  'tpo_employee',
  'tpo_admin',
  'management',
  'super_admin',
];

const NO_ACCESS: PermissionFlags = {
  can_view: false,
  can_create: false,
  can_edit: false,
  can_delete: false,
  can_export: false,
  can_approve: false,
};

function flags(overrides: Partial<PermissionFlags>): PermissionFlags {
  return { ...NO_ACCESS, ...overrides };
}

const ROLE_MODULE_DEFAULTS: Record<UserRole, Partial<Record<PermissionModule, PermissionFlags>>> = {
  super_admin: Object.fromEntries(
    PERMISSION_MODULES.map((module) => [
      module,
      flags({
        can_view: true,
        can_create: true,
        can_edit: true,
        can_delete: true,
        can_export: true,
        can_approve: true,
      }),
    ]),
  ) as Record<PermissionModule, PermissionFlags>,
  tpo_admin: {
    masters: flags({ can_view: true, can_create: true, can_edit: true, can_delete: true }),
    students: flags({ can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true }),
    student_verification: flags({ can_view: true, can_export: true, can_approve: true }),
    eligibility_rules: flags({ can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true }),
    portfolios: flags({ can_view: true, can_export: true }),
    selection_database: flags({ can_view: true, can_export: true }),
    interest_lists: flags({ can_view: true, can_export: true, can_approve: true }),
    companies: flags({ can_view: true, can_create: true, can_edit: true, can_export: true }),
    recruiters: flags({ can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true, can_approve: true }),
    postings: flags({ can_view: true, can_create: true, can_edit: true, can_export: true, can_approve: true }),
    applications: flags({ can_view: true, can_edit: true, can_export: true, can_approve: true }),
    offers: flags({ can_view: true, can_create: true, can_edit: true, can_export: true, can_approve: true }),
    events: flags({ can_view: true, can_create: true, can_edit: true, can_export: true, can_approve: true }),
    noc_requests: flags({ can_view: true, can_edit: true, can_export: true, can_approve: true }),
    internships: flags({ can_view: true, can_create: true, can_edit: true, can_export: true, can_approve: true }),
    announcements: flags({ can_view: true, can_create: true, can_edit: true, can_export: true, can_approve: true }),
    circulars: flags({ can_view: true, can_create: true, can_edit: true, can_export: true, can_approve: true }),
    no_dues: flags({ can_view: true, can_edit: true, can_export: true, can_approve: true }),
    policies: flags({ can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true }),
    reports: flags({ can_view: true, can_export: true }),
    users: flags({ can_view: true, can_create: true, can_edit: true }),
    audit_logs: flags({ can_view: true }),
  },
  tpo_employee: {
    masters: flags({ can_view: true }),
    companies: flags({ can_view: true, can_create: true, can_edit: true, can_export: true }),
    recruiters: flags({ can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true, can_approve: true }),
    postings: flags({ can_view: true, can_create: true, can_edit: true, can_export: true, can_approve: true }),
    applications: flags({ can_view: true, can_edit: true, can_export: true, can_approve: true }),
    offers: flags({ can_view: true, can_create: true, can_edit: true, can_export: true, can_approve: true }),
    events: flags({ can_view: true, can_create: true, can_edit: true, can_export: true, can_approve: true }),
    noc_requests: flags({ can_view: true, can_edit: true, can_export: true, can_approve: true }),
    internships: flags({ can_view: true, can_create: true, can_edit: true, can_export: true, can_approve: true }),
    announcements: flags({ can_view: true, can_create: true, can_edit: true, can_export: true, can_approve: true }),
    circulars: flags({ can_view: true, can_create: true, can_edit: true, can_export: true, can_approve: true }),
    no_dues: flags({ can_view: true, can_edit: true, can_export: true, can_approve: true }),
    reports: flags({ can_view: true, can_export: true }),
  },
  faculty_coordinator: {
    students: flags({ can_view: true, can_export: true }),
    companies: flags({ can_view: true }),
    offers: flags({ can_view: true }),
    events: flags({ can_view: true, can_approve: true }),
    noc_requests: flags({ can_view: true, can_approve: true }),
    internships: flags({ can_view: true }),
    announcements: flags({ can_view: true }),
    circulars: flags({ can_view: true }),
  },
  recruiter: {
    postings: flags({ can_view: true }),
    applications: flags({ can_view: true }),
    events: flags({ can_view: true }),
    internships: flags({ can_view: true }),
  },
  management: {
    reports: flags({ can_view: true, can_export: true }),
  },
  student: {
    students: flags({ can_view: true, can_create: true, can_edit: true, can_delete: true }),
    portfolios: flags({ can_view: true, can_create: true, can_edit: true, can_delete: true }),
    postings: flags({ can_view: true }),
    applications: flags({ can_view: true, can_create: true, can_delete: true }),
    offers: flags({ can_view: true, can_edit: true }),
    events: flags({ can_view: true }),
    noc_requests: flags({ can_view: true, can_create: true }),
    internships: flags({ can_view: true, can_create: true, can_edit: true }),
    announcements: flags({ can_view: true, can_edit: true }),
    no_dues: flags({ can_view: true, can_create: true }),
    policies: flags({ can_view: true }),
  },
};

const ensuredTenantIds = new Set<string>();
const pendingTenantEnsures = new Map<string, Promise<void>>();

export function getDefaultPermissionFlags(role: string, module: string): PermissionFlags {
  if (!PERMISSION_MODULES.includes(module as PermissionModule)) {
    return { ...NO_ACCESS };
  }

  if (!PERMISSION_ROLES.includes(role as UserRole)) {
    return { ...NO_ACCESS };
  }

  const defaults = ROLE_MODULE_DEFAULTS[role as UserRole]?.[module as PermissionModule];
  return defaults ? { ...defaults } : { ...NO_ACCESS };
}

export function invalidateTenantPermissionCache(tenantId: string) {
  ensuredTenantIds.delete(tenantId);
}

export async function ensureTenantRolePermissions(tenantId: string) {
  if (ensuredTenantIds.has(tenantId)) {
    return;
  }

  const pendingEnsure = pendingTenantEnsures.get(tenantId);
  if (pendingEnsure) {
    await pendingEnsure;
    return;
  }

  const ensurePromise = (async () => {
    const existingPermissions = await prisma.rolePermission.findMany({
      where: { tenant_id: tenantId },
      select: { role: true, module: true },
    });
    const existingKeys = new Set(
      existingPermissions.map((permission) => `${permission.role}:${permission.module}`),
    );

    const missingPermissions = PERMISSION_ROLES.flatMap((role) =>
      PERMISSION_MODULES.flatMap((module) => {
        const key = `${role}:${module}`;
        if (existingKeys.has(key)) {
          return [];
        }

        return {
          tenant_id: tenantId,
          role,
          module,
          ...getDefaultPermissionFlags(role, module),
        };
      }),
    );

    if (missingPermissions.length > 0) {
      await prisma.rolePermission.createMany({
        data: missingPermissions,
        skipDuplicates: true,
      });
    }

    ensuredTenantIds.add(tenantId);
  })().finally(() => {
    pendingTenantEnsures.delete(tenantId);
  });

  pendingTenantEnsures.set(tenantId, ensurePromise);
  await ensurePromise;
}
