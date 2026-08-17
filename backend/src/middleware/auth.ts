import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../shared/utils/jwt';
import { prisma } from '../config/database';
import { AuthenticationError } from '../shared/errors';

export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw new AuthenticationError('No token provided', 'TOKEN_MISSING');
    }

    const token = authHeader.slice(7);
    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw new AuthenticationError('Invalid or expired token', 'TOKEN_INVALID');
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.user_id },
      select: {
        id: true,
        tenant_id: true,
        role: true,
        email: true,
        name: true,
        department: true,
        institutes: true,
        courses: true,
        branches: true,
        is_active: true,
      },
    });

    if (!user || !user.is_active) {
      throw new AuthenticationError('User not found or deactivated', 'TOKEN_INVALID');
    }

    req.user = {
      id: user.id,
      tenant_id: user.tenant_id,
      role: user.role,
      email: user.email,
      name: user.name,
      department: user.department,
      institutes: user.institutes,
      courses: user.courses,
      branches: user.branches,
    };

    next();
  } catch (err) {
    next(err);
  }
}
