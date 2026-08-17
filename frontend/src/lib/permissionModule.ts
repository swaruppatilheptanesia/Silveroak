import type { AuthPermission, AuthUser } from '@/services/authService';

export type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'approve';

export interface PermissionRequirement {
  module: string;
  action: PermissionAction;
}

const ACTION_FIELD_MAP: Record<PermissionAction, keyof AuthPermission> = {
  view: 'can_view',
  create: 'can_create',
  edit: 'can_edit',
  delete: 'can_delete',
  export: 'can_export',
  approve: 'can_approve',
};

const TPO_EMPLOYEE_FALLBACKS: PermissionRequirement[] = [
  { module: 'companies', action: 'view' },
  { module: 'recruiters', action: 'view' },
  { module: 'postings', action: 'view' },
  { module: 'applications', action: 'view' },
  { module: 'offers', action: 'view' },
  { module: 'events', action: 'view' },
  { module: 'internships', action: 'view' },
  { module: 'announcements', action: 'view' },
  { module: 'circulars', action: 'view' },
  { module: 'no_dues', action: 'view' },
  { module: 'reports', action: 'view' },
];

const TPO_EMPLOYEE_ROUTE_MAP: Record<string, string> = {
  companies: '/admin/employers?tab=companies',
  recruiters: '/admin/employers?tab=recruiters',
  postings: '/admin/postings',
  applications: '/admin/applications',
  offers: '/admin/offers',
  events: '/admin/drives',
  internships: '/admin/internships',
  announcements: '/admin/announcements',
  circulars: '/admin/circulars',
  no_dues: '/admin/no-dues',
  reports: '/admin/reports',
};

export function hasPermission(
  permissions: AuthPermission[] | undefined,
  requirement: PermissionRequirement,
  role?: AuthUser['role'],
) {
  if (role === 'super_admin') {
    return true;
  }

  if (!permissions || permissions.length === 0) {
    return false;
  }

  const field = ACTION_FIELD_MAP[requirement.action];
  return permissions.some((permission) => permission.module === requirement.module && permission[field]);
}

export function hasAnyPermission(
  permissions: AuthPermission[] | undefined,
  requirements: PermissionRequirement[],
  role?: AuthUser['role'],
) {
  return requirements.some((requirement) => hasPermission(permissions, requirement, role));
}

// Human-readable label per role, for the top-bar user chip and anywhere a role is displayed.
export const ROLE_LABELS: Record<AuthUser['role'], string> = {
  student: 'Student',
  tpo_admin: 'TPO Admin',
  tpo_employee: 'TPO Staff',
  faculty_coordinator: 'Faculty Coordinator',
  recruiter: 'Recruiter',
  management: 'Management',
  super_admin: 'Super Admin',
};

export function getRoleLabel(role: AuthUser['role'] | null | undefined): string {
  if (!role) return 'User';
  return ROLE_LABELS[role] ?? 'User';
}

export function getDefaultRouteForUser(user: Pick<AuthUser, 'role' | 'permissions'> | null) {
  if (!user) {
    return '/';
  }

  switch (user.role) {
    case 'super_admin':
      return '/super-admin';
    case 'tpo_admin':
      return '/admin';
    case 'tpo_employee': {
      const requirement = TPO_EMPLOYEE_FALLBACKS.find((entry) =>
        hasPermission(user.permissions, entry, user.role),
      );

      if (requirement) {
        return TPO_EMPLOYEE_ROUTE_MAP[requirement.module] ?? '/admin/employers';
      }

      return '/admin/employers';
    }
    case 'faculty_coordinator':
      return '/faculty';
    case 'recruiter':
      return '/recruiter';
    case 'management':
      return '/management/profile';
    case 'student':
    default:
      return '/';
  }
}
