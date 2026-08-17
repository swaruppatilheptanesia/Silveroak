import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { AuthorizationError } from '../shared/errors';

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AuthorizationError('Authentication required'));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(
        new AuthorizationError(
          `Role '${req.user.role}' is not allowed to access this resource`,
          'ROLE_NOT_ALLOWED'
        )
      );
      return;
    }

    next();
  };
}
