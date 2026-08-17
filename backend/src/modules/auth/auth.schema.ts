import { z } from 'zod';
import { strongPasswordSchema } from '../../shared/schemas/common';

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required'),
  tenant_slug: z.string().optional(),
});

export const refreshSchema = z.object({
  refresh_token: z.string().min(1, 'Refresh token is required'),
});

export const requestStudentSignupOtpSchema = z.object({
  enrollment_no: z.string().trim().min(1, 'Enrollment number is required').max(50),
  tenant_slug: z.string().trim().min(1).optional(),
});

export const verifyStudentSignupOtpSchema = z.object({
  signup_token: z.string().min(1, 'Signup token is required'),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be 6 digits'),
});

export const completeStudentSignupSchema = z.object({
  verified_token: z.string().min(1, 'Verified token is required'),
  password: strongPasswordSchema,
  confirm_password: z.string().min(1, 'Please confirm your password'),
}).superRefine((value, ctx) => {
  if (value.password !== value.confirm_password) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Passwords do not match',
      path: ['confirm_password'],
    });
  }
});

export const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
  tenant_slug: z.string().trim().min(1).optional(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  new_password: strongPasswordSchema,
  confirm_new_password: z.string().min(1, 'Please confirm your password'),
}).superRefine((value, ctx) => {
  if (value.new_password !== value.confirm_new_password) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Passwords do not match',
      path: ['confirm_new_password'],
    });
  }
});

export const updateMeSchema = z
  .object({
    phone: z
      .string()
      .trim()
      .max(20, 'Phone must be 20 characters or less')
      .regex(/^\+?[\d\s-]{7,20}$/u, 'Enter a valid phone number')
      .or(z.literal(''))
      .nullable()
      .optional(),
    designation: z
      .string()
      .trim()
      .min(1, 'Designation cannot be empty')
      .max(100, 'Designation must be 100 characters or less')
      .nullable()
      .optional(),
  })
  .refine((value) => value.phone !== undefined || value.designation !== undefined, {
    message: 'At least one field (phone or designation) must be provided',
  });

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: strongPasswordSchema,
  confirm_new_password: z.string().min(1, 'Please confirm your password'),
}).superRefine((value, ctx) => {
  if (value.new_password !== value.confirm_new_password) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Passwords do not match',
      path: ['confirm_new_password'],
    });
  }
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
export type RequestStudentSignupOtpInput = z.infer<typeof requestStudentSignupOtpSchema>;
export type VerifyStudentSignupOtpInput = z.infer<typeof verifyStudentSignupOtpSchema>;
export type CompleteStudentSignupInput = z.infer<typeof completeStudentSignupSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
