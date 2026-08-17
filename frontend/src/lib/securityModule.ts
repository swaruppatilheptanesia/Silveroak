import type { ApiAuditLog, ApiPermission, ApiUserListItem, UserRole } from '@/types/admin';

export const SYSTEM_ROLE_CONFIG: Record<UserRole, { label: string; color: string }> = {
  student: { label: 'Student', color: 'text-blue-600 bg-blue-500/10 border-blue-500/20' },
  recruiter: { label: 'Recruiter', color: 'text-orange-600 bg-orange-500/10 border-orange-500/20' },
  faculty_coordinator: { label: 'Faculty Coordinator', color: 'text-purple-600 bg-purple-500/10 border-purple-500/20' },
  tpo_employee: { label: 'TPO Employee', color: 'text-cyan-600 bg-cyan-500/10 border-cyan-500/20' },
  tpo_admin: { label: 'TPO Admin', color: 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20' },
  management: { label: 'Management', color: 'text-amber-600 bg-amber-500/10 border-amber-500/20' },
  super_admin: { label: 'Super Admin', color: 'text-red-600 bg-red-500/10 border-red-500/20' },
};

export const SYSTEM_ROLE_ORDER: UserRole[] = [
  'student',
  'recruiter',
  'faculty_coordinator',
  'tpo_employee',
  'tpo_admin',
  'management',
  'super_admin',
];

export const PERMISSION_FIELD_CONFIG = [
  { key: 'can_view', label: 'V', title: 'View', color: 'bg-blue-500/20 text-blue-700 dark:text-blue-400', activeColor: 'bg-blue-500 text-white' },
  { key: 'can_create', label: 'C', title: 'Create', color: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400', activeColor: 'bg-emerald-500 text-white' },
  { key: 'can_edit', label: 'E', title: 'Edit', color: 'bg-amber-500/20 text-amber-700 dark:text-amber-400', activeColor: 'bg-amber-500 text-white' },
  { key: 'can_delete', label: 'D', title: 'Delete', color: 'bg-red-500/20 text-red-700 dark:text-red-400', activeColor: 'bg-red-500 text-white' },
  { key: 'can_approve', label: 'A', title: 'Approve', color: 'bg-purple-500/20 text-purple-700 dark:text-purple-400', activeColor: 'bg-purple-500 text-white' },
  { key: 'can_export', label: 'Ex', title: 'Export', color: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-400', activeColor: 'bg-cyan-500 text-white' },
] as const;

export type PermissionFieldKey = typeof PERMISSION_FIELD_CONFIG[number]['key'];

export function getSecurityErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

export function getUserStatusLabel(user: Pick<ApiUserListItem, 'is_active'>) {
  return user.is_active ? 'Active' : 'Inactive';
}

export function getUserStatusVariant(user: Pick<ApiUserListItem, 'is_active'>) {
  return user.is_active ? 'default' : 'secondary';
}

export function getAuditActionMeta(action: ApiAuditLog['action']) {
  const normalized = action.toLowerCase();

  switch (normalized) {
    case 'create':
      return { label: 'Create', color: 'text-emerald-600 bg-emerald-500/10' };
    case 'update':
    case 'publish':
      return { label: normalized === 'publish' ? 'Publish' : 'Update', color: 'text-blue-600 bg-blue-500/10' };
    case 'delete':
      return { label: 'Delete', color: 'text-red-600 bg-red-500/10' };
    case 'status_change':
    case 'status update':
      return { label: 'Status Change', color: 'text-amber-600 bg-amber-500/10' };
    case 'login':
      return { label: 'Login', color: 'text-purple-600 bg-purple-500/10' };
    case 'logout':
      return { label: 'Logout', color: 'text-muted-foreground bg-muted/50' };
    default:
      return {
        label: action.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
        color: 'text-muted-foreground bg-muted/50',
      };
  }
}

export function getAuditModules(logs: ApiAuditLog[]) {
  return [...new Set(logs.map((log) => log.module))].sort((left, right) => left.localeCompare(right));
}

export function getPermissionModules(permissions: ApiPermission[]) {
  return [...new Set(permissions.map((permission) => permission.module))].sort((left, right) => left.localeCompare(right));
}

export function getPermissionLabel(module: string) {
  return module
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export function getActivePermissionKeys(permission: ApiPermission) {
  return PERMISSION_FIELD_CONFIG
    .filter((field) => permission[field.key])
    .map((field) => field.key);
}
