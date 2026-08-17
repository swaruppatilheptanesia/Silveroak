import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthorizationError } from '../shared/errors';
import { ensureTenantRolePermissions } from '../shared/permissions';

type PermissionAction = 'view' | 'create' | 'edit' | 'delete' | 'export' | 'approve';

const ACTION_COLUMN_MAP: Record<PermissionAction, string> = {
  view: 'can_view',
  create: 'can_create',
  edit: 'can_edit',
  delete: 'can_delete',
  export: 'can_export',
  approve: 'can_approve',
};

export function requirePermission(module: string, action: PermissionAction) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AuthorizationError('Authentication required');
      }

      // Super admin bypasses permission checks
      if (req.user.role === 'super_admin') {
        return next();
      }

      await ensureTenantRolePermissions(req.user.tenant_id);

      const permission = await prisma.rolePermission.findUnique({
        where: {
          tenant_id_role_module: {
            tenant_id: req.user.tenant_id,
            role: req.user.role,
            module,
          },
        },
      });

      if (!permission) {
        throw new AuthorizationError(
          `No permissions configured for role '${req.user.role}' on module '${module}'`,
          'INSUFFICIENT_PERMISSIONS'
        );
      }

      const column = ACTION_COLUMN_MAP[action] as keyof typeof permission;
      if (!permission[column]) {
        throw new AuthorizationError(
          `Role '${req.user.role}' cannot ${action} on '${module}'`,
          'INSUFFICIENT_PERMISSIONS'
        );
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
