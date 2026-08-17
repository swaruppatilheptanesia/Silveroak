/**
 * Security Service — users, audit logs, roles/permissions.
 * Re-exports sync data for gradual migration.
 */
import {
  mockSystemUsers,
  mockAuditLogs,
  SYSTEM_ROLE_CONFIG,
  PERMISSION_MATRIX,
  type SystemUser,
  type AuditLogEntry,
  type SystemRole,
} from '@/data/mockSecurityData';

export {
  mockSystemUsers,
  mockAuditLogs,
  SYSTEM_ROLE_CONFIG,
  PERMISSION_MATRIX,
};
export type { SystemUser, AuditLogEntry, SystemRole };

export const securityService = {
  getUsers: async (): Promise<SystemUser[]> => mockSystemUsers,
  getAuditLogs: async (): Promise<AuditLogEntry[]> => mockAuditLogs,
  getRoleConfig: () => SYSTEM_ROLE_CONFIG,
  getPermissionMatrix: () => PERMISSION_MATRIX,
};
