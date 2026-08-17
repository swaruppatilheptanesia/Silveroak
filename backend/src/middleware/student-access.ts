import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { AuthorizationError, NotFoundError } from '../shared/errors';

const PROFESSIONAL_PHOTO_MESSAGE = 'Profile photo is required. Please upload a professional photo to continue.';
const PROFILE_BLOCKED_MESSAGE = 'Your Profile is Blocked kindly visit T&P Cell to unblock your profile';

export async function requireStudentProfileAccess(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const isProfileRequest = req.method === 'GET' && req.path === '/me';
    const isProfilePhotoUploadRequest = req.method === 'POST' && req.path === '/me/profile-photo';

    if (isProfileRequest) {
      next();
      return;
    }

    const student = await prisma.student.findUnique({
      where: { user_id: req.user!.id },
      select: {
        id: true,
        profile_photo_url: true,
        profile_blocked: true,
        profile_block_reason: true,
      },
    });

    if (!student) {
      throw new NotFoundError('Student profile');
    }

    if (student.profile_blocked) {
      throw new AuthorizationError(student.profile_block_reason?.trim() || PROFILE_BLOCKED_MESSAGE, 'PROFILE_BLOCKED');
    }

    if (!student.profile_photo_url && !isProfilePhotoUploadRequest) {
      throw new AuthorizationError(PROFESSIONAL_PHOTO_MESSAGE, 'PROFILE_PHOTO_REQUIRED');
    }

    next();
  } catch (err) {
    next(err);
  }
}
