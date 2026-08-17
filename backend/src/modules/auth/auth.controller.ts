import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import type {
  CompleteStudentSignupInput,
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RefreshInput,
  ResetPasswordInput,
  RequestStudentSignupOtpInput,
  UpdateMeInput,
  VerifyStudentSignupOtpInput,
} from './auth.schema';

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.login(req.validated!.body as LoginInput);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.refreshTokens(req.validated!.body as RefreshInput);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function requestStudentSignupOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.requestStudentSignupOtp(req.validated!.body as RequestStudentSignupOtpInput);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function verifyStudentSignupOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.verifyStudentSignupOtp(req.validated!.body as VerifyStudentSignupOtpInput);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function completeStudentSignup(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.completeStudentSignup(req.validated!.body as CompleteStudentSignupInput);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function requestPasswordReset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.requestPasswordReset(req.validated!.body as ForgotPasswordInput);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.resetPassword(req.validated!.body as ResetPasswordInput);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const refreshToken = req.body?.refresh_token as string | undefined;
    const result = await authService.logout(req.user!.id, refreshToken);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await authService.changePassword(req.user!.id, req.validated!.body as ChangePasswordInput);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.getMe(req.user!.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
}

export async function updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.updateMe(req.user!.id, req.validated!.body as UpdateMeInput);
    res.json(user);
  } catch (err) {
    next(err);
  }
}
