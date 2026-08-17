import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { focusFirstFormError } from '@/lib/formErrors';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getPasswordPolicyError, PASSWORD_POLICY_HINT } from '@/lib/passwordPolicy';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/config/tenant';
import { authService, AuthApiError, type AuthUser } from '@/services/authService';
import { getDefaultRouteForUser } from '@/lib/permissionModule';
import { Button } from '@/components/ui/button';
import { RequiredLabel } from '@/components/shared/RequiredLabel';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2, Eye, EyeOff } from 'lucide-react';

// ── Validation Schema ──────────────────────────────────

const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupStep = 'login' | 'enrollment' | 'otp' | 'password';

// ── Role-based redirect helper ─────────────────────────

function getDashboardPath(user: AuthUser): string {
  if (user.role === 'student') {
    // Policy gate first; it self-forwards to the photo gate → dashboard when nothing is pending.
    return '/student/policy-gate';
  }

  return getDefaultRouteForUser(user);
}

// ── Error message mapping ──────────────────────────────

function getErrorMessage(err: unknown): string {
  if (err instanceof AuthApiError) {
    switch (err.code) {
      case 'VALIDATION_ERROR':
        return 'Please check your email and password.';
      case 'INVALID_CREDENTIALS':
        return 'Invalid email or password. Please try again.';
      case 'TENANT_INACTIVE':
        return 'Your institution account is currently inactive. Please contact your administrator.';
      case 'CRM_STUDENT_NOT_FOUND':
        return 'No student record was found for this enrollment number.';
      case 'STUDENT_ALREADY_REGISTERED':
        return 'An account already exists for this enrollment number. Please sign in instead.';
      case 'EMAIL_EXISTS':
        return 'An account already exists for this email. Please sign in instead.';
      case 'STUDENT_EMAIL_MISSING':
        return 'Your CRM record does not have an email address. Please contact the placement office.';
      case 'STUDENT_MOBILE_MISSING':
        return 'Your CRM record does not have a mobile number. Please contact the placement office.';
      case 'INVALID_OTP':
        return 'The OTP is incorrect. For now, please use 000000.';
      case 'SIGNUP_SESSION_EXPIRED':
      case 'SIGNUP_VERIFICATION_EXPIRED':
        return 'This signup session expired. Please start again.';
      case 'PASSWORD_RESET_USER_NOT_FOUND':
        return 'We could not find an active account for this email address.';
      case 'PASSWORD_RESET_TOKEN_EXPIRED':
        return 'This password reset session expired. Please start again.';
      default:
        if (err.status === 429) {
          return 'Too many login attempts. Please wait a moment and try again.';
        }
        return err.message || 'An unexpected error occurred. Please try again.';
    }
  }
  return 'Unable to connect to the server. Please check your connection and try again.';
}

// ── Component ──────────────────────────────────────────

export default function Login() {
  const navigate = useNavigate();
  const { login, completeStudentSignup } = useAuth();
  const tenant = useTenant();
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [signupStep, setSignupStep] = useState<SignupStep>('login');
  const [signupEnrollment, setSignupEnrollment] = useState('');
  const [signupOtp, setSignupOtp] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [signupToken, setSignupToken] = useState<string | null>(null);
  const [verifiedToken, setVerifiedToken] = useState<string | null>(null);
  const [signupName, setSignupName] = useState<string | null>(null);
  const [maskedMobile, setMaskedMobile] = useState<string | null>(null);
  const [isSignupSubmitting, setIsSignupSubmitting] = useState(false);
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<'email' | 'reset'>('email');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotResetToken, setForgotResetToken] = useState<string | null>(null);
  const [forgotPassword, setForgotPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    try {
      const user = await login({
        email: data.email,
        password: data.password,
        tenant_slug: tenant.slug,
      });
      navigate(getDashboardPath(user), { replace: true });
    } catch (err) {
      setServerError(getErrorMessage(err));
    }
  };

  const showSignup = () => {
    setServerError(null);
    setSignupError(null);
    setSignupStep('enrollment');
  };

  const showLogin = () => {
    setServerError(null);
    setSignupError(null);
    setSignupStep('login');
    setSignupOtp('');
    setSignupPassword('');
    setSignupConfirmPassword('');
  };

  const openForgotPassword = () => {
    setForgotPasswordOpen(true);
    setForgotStep('email');
    setForgotError(null);
    setForgotSuccess(null);
    setForgotPassword('');
    setForgotConfirmPassword('');
    setForgotResetToken(null);
  };

  const closeForgotPassword = () => {
    setForgotPasswordOpen(false);
    setForgotStep('email');
    setForgotError(null);
    setForgotPassword('');
    setForgotConfirmPassword('');
    setForgotResetToken(null);
  };

  const handleEnrollmentSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const enrollmentNo = signupEnrollment.trim();
    if (!enrollmentNo) {
      setSignupError('Please enter your enrollment number.');
      return;
    }

    setSignupError(null);
    setIsSignupSubmitting(true);
    try {
      const result = await authService.requestStudentSignupOtp({
        enrollment_no: enrollmentNo,
        tenant_slug: tenant.slug,
      });
      setSignupToken(result.signup_token);
      setSignupName(result.full_name);
      setMaskedMobile(result.masked_mobile);
      setSignupOtp('');
      setSignupStep('otp');
    } catch (err) {
      setSignupError(getErrorMessage(err));
    } finally {
      setIsSignupSubmitting(false);
    }
  };

  const handleOtpSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!signupToken) {
      setSignupError('Please start signup again.');
      setSignupStep('enrollment');
      return;
    }

    if (!/^\d{6}$/.test(signupOtp)) {
      setSignupError('Please enter the 6 digit OTP.');
      return;
    }

    setSignupError(null);
    setIsSignupSubmitting(true);
    try {
      const result = await authService.verifyStudentSignupOtp({
        signup_token: signupToken,
        otp: signupOtp,
      });
      setVerifiedToken(result.verified_token);
      setSignupStep('password');
    } catch (err) {
      setSignupError(getErrorMessage(err));
    } finally {
      setIsSignupSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!verifiedToken) {
      setSignupError('Please verify OTP again.');
      setSignupStep('otp');
      return;
    }

    const signupPolicyError = getPasswordPolicyError(signupPassword);
    if (signupPolicyError) {
      setSignupError(signupPolicyError);
      return;
    }

    if (signupPassword !== signupConfirmPassword) {
      setSignupError('Passwords do not match.');
      return;
    }

    setSignupError(null);
    setIsSignupSubmitting(true);
    try {
      const user = await completeStudentSignup({
        verified_token: verifiedToken,
        password: signupPassword,
        confirm_password: signupConfirmPassword,
      });
      navigate(getDashboardPath(user), { replace: true });
    } catch (err) {
      setSignupError(getErrorMessage(err));
    } finally {
      setIsSignupSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const email = forgotEmail.trim();

    if (!email) {
      setForgotError('Please enter your email address.');
      return;
    }

    setForgotError(null);
    setForgotSuccess(null);
    setIsForgotSubmitting(true);

    try {
      const result = await authService.requestForgotPassword({
        email,
        tenant_slug: tenant.slug,
      });
      setForgotResetToken(result.reset_token);
      setForgotStep('reset');
      setForgotSuccess('Reset started. Set your new password below.');
    } catch (err) {
      setForgotError(getErrorMessage(err));
    } finally {
      setIsForgotSubmitting(false);
    }
  };

  const handleResetPasswordSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!forgotResetToken) {
      setForgotError('Please start the password reset again.');
      setForgotStep('email');
      return;
    }

    const forgotPolicyError = getPasswordPolicyError(forgotPassword);
    if (forgotPolicyError) {
      setForgotError(forgotPolicyError);
      return;
    }

    if (forgotPassword !== forgotConfirmPassword) {
      setForgotError('Passwords do not match.');
      return;
    }

    setForgotError(null);
    setIsForgotSubmitting(true);

    try {
      await authService.resetPassword({
        token: forgotResetToken,
        new_password: forgotPassword,
        confirm_new_password: forgotConfirmPassword,
      });
      closeForgotPassword();
      setServerError(null);
      setForgotSuccess(null);
    } catch (err) {
      setForgotError(getErrorMessage(err));
    } finally {
      setIsForgotSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          {tenant.branding.logoUrl && (
            <div className="flex justify-center">
              <img
                src={tenant.branding.logoUrl}
                alt={tenant.branding.universityName}
                className="h-16 w-auto"
              />
            </div>
          )}
          <CardTitle className="text-2xl font-bold">
            {signupStep === 'login' ? tenant.branding.tagline : 'Student Sign Up'}
          </CardTitle>
          <CardDescription>
            {signupStep === 'login'
              ? tenant.branding.universityName
              : 'Create your student account using your enrollment number'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {signupStep === 'login' ? (
            <form onSubmit={handleSubmit(onSubmit, focusFirstFormError)} className="space-y-4">
              {serverError && (
                <Alert variant="destructive">
                  <AlertDescription>{serverError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">
                  <RequiredLabel>Email</RequiredLabel>
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@university.ac.in"
                  autoComplete="email"
                  disabled={isSubmitting}
                  {...register('email')}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="password">
                    <RequiredLabel>Password</RequiredLabel>
                  </Label>
                  <Button
                    type="button"
                    variant="link"
                    className="h-auto p-0 text-sm"
                    onClick={openForgotPassword}
                    disabled={isSubmitting}
                  >
                    Forgot password?
                  </Button>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={isSubmitting}
                    {...register('password')}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>

              <div className="space-y-3 pt-2 text-center">
                <p className="text-sm text-muted-foreground">New student?</p>
                <Button type="button" variant="outline" className="w-full" onClick={showSignup}>
                  Student Sign Up
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {signupError && (
                <Alert variant="destructive">
                  <AlertDescription>{signupError}</AlertDescription>
                </Alert>
              )}

              {signupStep === 'enrollment' && (
                <form onSubmit={handleEnrollmentSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-enrollment">
                      <RequiredLabel>Enrollment Number</RequiredLabel>
                    </Label>
                    <Input
                      id="signup-enrollment"
                      value={signupEnrollment}
                      onChange={(event) => setSignupEnrollment(event.target.value)}
                      placeholder="2204030100554"
                      autoComplete="off"
                      disabled={isSignupSubmitting}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSignupSubmitting}>
                    {isSignupSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Fetching details...
                      </>
                    ) : (
                      'Continue'
                    )}
                  </Button>
                </form>
              )}

              {signupStep === 'otp' && (
                <form onSubmit={handleOtpSubmit} className="space-y-4">
                  <div className="rounded-md border bg-muted/30 p-3 text-sm">
                    <p className="font-medium">{signupName}</p>
                    <p className="text-muted-foreground">
                      OTP sent to mobile {maskedMobile || 'on record'}. Use 000000 for now.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-otp">
                      <RequiredLabel>OTP</RequiredLabel>
                    </Label>
                    <Input
                      id="signup-otp"
                      value={signupOtp}
                      onChange={(event) => setSignupOtp(event.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="000000"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      disabled={isSignupSubmitting}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSignupSubmitting}>
                    {isSignupSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Verify OTP'
                    )}
                  </Button>
                </form>
              )}

              {signupStep === 'password' && (
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  <div className="rounded-md border bg-muted/30 p-3 text-sm">
                    <p className="font-medium">{signupName}</p>
                    <p className="text-muted-foreground">Set your password to finish signup.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">
                      <RequiredLabel>Password</RequiredLabel>
                    </Label>
                    <div className="relative">
                      <Input
                        id="signup-password"
                        type={showSignupPassword ? 'text' : 'password'}
                        value={signupPassword}
                        onChange={(event) => setSignupPassword(event.target.value)}
                        placeholder="Create a password"
                        autoComplete="new-password"
                        disabled={isSignupSubmitting}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                        onClick={() => setShowSignupPassword((v) => !v)}
                        tabIndex={-1}
                      >
                        {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">{PASSWORD_POLICY_HINT}</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-confirm-password">
                      <RequiredLabel>Confirm Password</RequiredLabel>
                    </Label>
                    <Input
                      id="signup-confirm-password"
                      type={showSignupPassword ? 'text' : 'password'}
                      value={signupConfirmPassword}
                      onChange={(event) => setSignupConfirmPassword(event.target.value)}
                      placeholder="Confirm your password"
                      autoComplete="new-password"
                      disabled={isSignupSubmitting}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSignupSubmitting}>
                    {isSignupSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      'Create Account'
                    )}
                  </Button>
                </form>
              )}

              <Button type="button" variant="ghost" className="w-full" onClick={showLogin} disabled={isSignupSubmitting}>
                Back to Sign In
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={forgotPasswordOpen} onOpenChange={(open) => (open ? setForgotPasswordOpen(true) : closeForgotPassword())}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Forgot Password</DialogTitle>
            <DialogDescription>
              {forgotStep === 'email'
                ? 'Enter your registered email to start resetting your password.'
                : 'Set a new password for your account.'}
            </DialogDescription>
          </DialogHeader>

          {forgotError ? (
            <Alert variant="destructive">
              <AlertDescription>{forgotError}</AlertDescription>
            </Alert>
          ) : null}

          {forgotSuccess ? (
            <Alert>
              <AlertDescription>{forgotSuccess}</AlertDescription>
            </Alert>
          ) : null}

          {forgotStep === 'email' ? (
            <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">
                  <RequiredLabel>Email</RequiredLabel>
                </Label>
                <Input
                  id="forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(event) => setForgotEmail(event.target.value)}
                  placeholder="you@university.ac.in"
                  autoComplete="email"
                  disabled={isForgotSubmitting}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isForgotSubmitting}>
                {isForgotSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Starting reset...
                  </>
                ) : (
                  'Continue'
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-password">
                  <RequiredLabel>New Password</RequiredLabel>
                </Label>
                <Input
                  id="forgot-password"
                  type="password"
                  value={forgotPassword}
                  onChange={(event) => setForgotPassword(event.target.value)}
                  placeholder="Enter a new password"
                  autoComplete="new-password"
                  disabled={isForgotSubmitting}
                />
                <p className="text-xs text-muted-foreground">{PASSWORD_POLICY_HINT}</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="forgot-confirm-password">
                  <RequiredLabel>Confirm New Password</RequiredLabel>
                </Label>
                <Input
                  id="forgot-confirm-password"
                  type="password"
                  value={forgotConfirmPassword}
                  onChange={(event) => setForgotConfirmPassword(event.target.value)}
                  placeholder="Confirm the new password"
                  autoComplete="new-password"
                  disabled={isForgotSubmitting}
                />
              </div>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setForgotStep('email');
                    setForgotError(null);
                    setForgotSuccess(null);
                    setForgotPassword('');
                    setForgotConfirmPassword('');
                  }}
                  disabled={isForgotSubmitting}
                >
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={isForgotSubmitting}>
                  {isForgotSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    'Reset Password'
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
