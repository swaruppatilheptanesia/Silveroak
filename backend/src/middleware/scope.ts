import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthorizationError } from '../shared/errors';

/**
 * Faculty coordinators can only see/modify records in their department.
 */
export function scopeToDepartment() {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AuthorizationError('Authentication required'));
      return;
    }

    if (!req.scope) req.scope = {};

    if (req.user.role === 'faculty_coordinator') {
      req.scope.department = req.user.department ?? req.user.branches?.[0];
    }

    next();
  };
}

/**
 * Recruiters can only see their own company's data.
 */
export function scopeToCompany() {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AuthorizationError('Authentication required');
      }

      if (!req.scope) req.scope = {};

      if (req.user.role === 'recruiter') {
        const recruiter = await prisma.recruiter.findUnique({
          where: { user_id: req.user.id },
          select: { company_id: true },
        });

        if (!recruiter) {
          throw new AuthorizationError('Recruiter profile not found');
        }

        req.scope.company_id = recruiter.company_id;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Students can only access/modify their own records.
 */
export function scopeToOwn() {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AuthorizationError('Authentication required');
      }

      if (!req.scope) req.scope = {};

      if (req.user.role === 'student') {
        const student = await prisma.student.findUnique({
          where: { user_id: req.user.id },
          select: { id: true },
        });

        if (!student) {
          throw new AuthorizationError('Student profile not found');
        }

        req.scope.student_id = student.id;
        req.scope.user_id = req.user.id;
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
