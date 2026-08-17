import { apiClient } from './apiClient';
import { parseApiErrorEnvelope, type ApiErrorDetail } from '@/lib/apiError';

// ── Types ──────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
  tenant_slug?: string;
}

export interface StudentSignupRequestOtpRequest {
  enrollment_no: string;
  tenant_slug?: string;
}

export interface StudentSignupRequestOtpResponse {
  signup_token: string;
  enrollment_no: string;
  full_name: string;
  masked_mobile: string | null;
  message: string;
}

export interface StudentSignupVerifyOtpRequest {
  signup_token: string;
  otp: string;
}

export interface StudentSignupVerifyOtpResponse {
  verified_token: string;
  enrollment_no: string;
  message: string;
}

export interface StudentSignupCompleteRequest {
  verified_token: string;
  password: string;
  confirm_password: string;
}

export interface ForgotPasswordRequest {
  email: string;
  tenant_slug?: string;
}

export interface ForgotPasswordResponse {
  message: string;
  reset_token: string;
  expires_in_minutes: number;
}

export interface ResetPasswordRequest {
  token: string;
  new_password: string;
  confirm_new_password: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export interface ChangePasswordRequest {
  current_password: string;
  new_password: string;
  confirm_new_password: string;
}

export interface ChangePasswordResponse {
  message: string;
}

export interface UpdateMeRequest {
  phone?: string | null;
  designation?: string | null;
}

export interface AuthPermission {
  id: string;
  module: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_export: boolean;
  can_approve: boolean;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'tpo_admin' | 'tpo_employee' | 'faculty_coordinator' | 'recruiter' | 'management' | 'super_admin';
  phone?: string;
  department?: string;
  designation?: string;
  crm_employee_code?: string | null;
  tenant_id: string;
  last_login_at?: string;
  created_at?: string;
  permissions: AuthPermission[];
  tenant?: {
    slug: string;
    name: string;
    short_name: string;
    logo_url?: string;
  };
}

export interface LoginResponse {
  token: string;
  refresh_token: string;
  user: AuthUser;
}

export interface RefreshResponse {
  token: string;
  refresh_token: string;
}

export interface AuthError {
  code: string;
  message: string;
}

function throwAuthApiError(res: { data: unknown; error: string | null; status: number }, fallback: string): never {
  const parsed = parseApiErrorEnvelope(res.data, res.error ?? fallback);
  throw new AuthApiError(parsed.message, res.status, parsed.code, parsed.details);
}

// ── Service ────────────────────────────────────────────

class AuthService {
  async login(data: LoginRequest): Promise<LoginResponse> {
    const res = await apiClient.post<LoginResponse>('/auth/login', data);
    if (res.status !== 200 || res.error) {
      throwAuthApiError(res, 'Login failed');
    }
    return res.data;
  }

  async refresh(refreshToken: string): Promise<RefreshResponse> {
    const res = await apiClient.post<RefreshResponse>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    if (res.status !== 200 || res.error) {
      throwAuthApiError(res, 'Token refresh failed');
    }
    return res.data;
  }

  async requestStudentSignupOtp(data: StudentSignupRequestOtpRequest): Promise<StudentSignupRequestOtpResponse> {
    const res = await apiClient.post<StudentSignupRequestOtpResponse>('/auth/student-signup/request-otp', data);
    if (res.status !== 200 || res.error) {
      throwAuthApiError(res, 'Unable to start student signup');
    }
    return res.data;
  }

  async verifyStudentSignupOtp(data: StudentSignupVerifyOtpRequest): Promise<StudentSignupVerifyOtpResponse> {
    const res = await apiClient.post<StudentSignupVerifyOtpResponse>('/auth/student-signup/verify-otp', data);
    if (res.status !== 200 || res.error) {
      throwAuthApiError(res, 'Unable to verify OTP');
    }
    return res.data;
  }

  async completeStudentSignup(data: StudentSignupCompleteRequest): Promise<LoginResponse> {
    const res = await apiClient.post<LoginResponse>('/auth/student-signup/complete', data);
    if (res.status !== 201 || res.error) {
      throwAuthApiError(res, 'Unable to complete signup');
    }
    return res.data;
  }

  async requestForgotPassword(data: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
    const res = await apiClient.post<ForgotPasswordResponse>('/auth/forgot-password', data);
    if (res.status !== 200 || res.error) {
      throwAuthApiError(res, 'Unable to start password reset');
    }
    return res.data;
  }

  async resetPassword(data: ResetPasswordRequest): Promise<ResetPasswordResponse> {
    const res = await apiClient.post<ResetPasswordResponse>('/auth/reset-password', data);
    if (res.status !== 200 || res.error) {
      throwAuthApiError(res, 'Unable to reset password');
    }
    return res.data;
  }

  async logout(refreshToken?: string): Promise<void> {
    await apiClient.post('/auth/logout', refreshToken ? { refresh_token: refreshToken } : {});
  }

  async changePassword(data: ChangePasswordRequest): Promise<ChangePasswordResponse> {
    const res = await apiClient.put<ChangePasswordResponse>('/auth/me/password', data);
    if (res.status !== 200 || res.error) {
      throwAuthApiError(res, 'Unable to change password');
    }
    return res.data;
  }

  async getMe(): Promise<AuthUser> {
    const res = await apiClient.get<AuthUser>('/auth/me');
    if (res.status !== 200 || res.error) {
      throwAuthApiError(res, 'Failed to fetch user');
    }
    return res.data;
  }

  async updateMe(data: UpdateMeRequest): Promise<AuthUser> {
    const res = await apiClient.put<AuthUser>('/auth/me', data);
    if (res.status !== 200 || res.error) {
      throwAuthApiError(res, 'Unable to update profile');
    }
    return res.data;
  }
}

export class AuthApiError extends Error {
  status: number;
  code: string;
  details: ApiErrorDetail[];

  constructor(message: string, status: number, code: string, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const authService = new AuthService();
