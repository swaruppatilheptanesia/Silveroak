import { Router } from 'express';
import * as authController from './auth.controller';
import { validate } from '../../middleware/validate';
import { authenticate } from '../../middleware/auth';
import { resolveTenant } from '../../middleware/tenant';
import { authLimiter } from '../../middleware/rate-limiter';
import {
  changePasswordSchema,
  completeStudentSignupSchema,
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  resetPasswordSchema,
  requestStudentSignupOtpSchema,
  updateMeSchema,
  verifyStudentSignupOtpSchema,
} from './auth.schema';

const router = Router();

// Public routes (rate limited)
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post(
  '/student-signup/request-otp',
  authLimiter,
  validate(requestStudentSignupOtpSchema),
  authController.requestStudentSignupOtp
);
router.post(
  '/student-signup/verify-otp',
  authLimiter,
  validate(verifyStudentSignupOtpSchema),
  authController.verifyStudentSignupOtp
);
router.post(
  '/student-signup/complete',
  authLimiter,
  validate(completeStudentSignupSchema),
  authController.completeStudentSignup
);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), authController.requestPasswordReset);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), authController.resetPassword);

// Protected routes
router.post('/logout', authenticate, authController.logout);
router.put('/me/password', authenticate, validate(changePasswordSchema), authController.changePassword);
router.put('/me', authenticate, resolveTenant, validate(updateMeSchema), authController.updateMe);
router.get('/me', authenticate, resolveTenant, authController.getMe);

export default router;
