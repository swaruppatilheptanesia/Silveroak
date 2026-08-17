import crypto from 'crypto';
import { prisma } from '../../config/database';
import { comparePassword, hashPassword } from '../../shared/utils/password';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  getRefreshTokenExpiry,
} from '../../shared/utils/jwt';
import { AuthenticationError, BusinessRuleError, ConflictError, NotFoundError } from '../../shared/errors';
import { logger } from '../../config/logger';
import { ensureTenantRolePermissions } from '../../shared/permissions';
import { env } from '../../config/env';
import type {
  CompleteStudentSignupInput,
  ChangePasswordInput,
  ForgotPasswordInput,
  LoginInput,
  RefreshInput,
  ResetPasswordInput,
  RequestStudentSignupOtpInput,
  VerifyStudentSignupOtpInput,
} from './auth.schema';

type CrmStudentDetail = {
  fullName?: string | null;
  temporaryEnrolmentNo?: string | null;
  enrollmentNo?: string | null;
  birthDate?: string | null;
  gender?: string | null;
  category?: string | null;
  aadhaarNumber?: string | null;
  studentMobileNo?: string | null;
  officialEmail?: string | null;
  personalEmail?: string | null;
  parentName?: string | null;
  parentContactNo?: string | null;
  currentAddress?: string | null;
  permanentAddress?: string | null;
  bloodGroup?: string | null;
  photoUrl?: string | null;
  instituteName?: string | null;
  courseShortName?: string | null;
  courseFullName?: string | null;
  programName?: string | null;
  admissionYear?: number | string | null;
  currentSemester?: string | null;
  currentSemesterSPI?: number | string | null;
  currentSemesterCPI?: number | string | null;
  currentSemesterCGPA?: number | string | null;
  currentBacklog?: number | string | null;
  totalBacklog?: number | string | null;
  examFormStatus?: string | null;
  overallAttendancePercentage?: number | string | null;
  board10?: string | null;
  passingYear10?: number | string | null;
  percentage10?: number | string | null;
  board12OrDiploma?: string | null;
  passingYear12OrDiploma?: number | string | null;
  percentage12OrDiploma?: number | string | null;
};

type SignupSession = {
  enrollmentNo: string;
  tenantId: string;
  tenantSlug: string;
  crmStudent: CrmStudentDetail;
  otp: string;
  expiresAt: number;
  verifiedToken?: string;
};

type PasswordResetSession = {
  userId: string;
  expiresAt: number;
};

type AcademicSeed = {
  cgpa: number | null;
  tenth_percentage: number | null;
  twelfth_percentage: number | null;
  diploma_percentage: number | null;
  backlog_count: number;
  active_backlogs: number;
  semester: number | null;
  year_of_study: number | null;
  course_duration: number | null;
};

const signupSessions = new Map<string, SignupSession>();
const verifiedSignupTokens = new Map<string, string>();
const passwordResetSessions = new Map<string, PasswordResetSession>();
const TOKEN_BYTES = 32;

async function getRolePermissions(tenantId: string, role: string) {
  await ensureTenantRolePermissions(tenantId);

  return prisma.rolePermission.findMany({
    where: {
      tenant_id: tenantId,
      role,
    },
    orderBy: { module: 'asc' },
  });
}

function cleanupSignupSessions() {
  const now = Date.now();
  for (const [signupToken, session] of signupSessions.entries()) {
    if (session.expiresAt > now) continue;
    signupSessions.delete(signupToken);
    if (session.verifiedToken) {
      verifiedSignupTokens.delete(session.verifiedToken);
    }
  }
}

function cleanupPasswordResetSessions() {
  const now = Date.now();
  for (const [resetToken, session] of passwordResetSessions.entries()) {
    if (session.expiresAt > now) continue;
    passwordResetSessions.delete(resetToken);
  }
}

function createOpaqueToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString('base64url');
}

function getSignupTtlMs() {
  return Math.max(1, env.studentSignupSessionTtlMinutes) * 60 * 1000;
}

function getPasswordResetTtlMs() {
  return Math.max(1, env.studentSignupSessionTtlMinutes) * 60 * 1000;
}

function cleanString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function cleanEmail(value: unknown): string | null {
  return cleanString(value)?.toLowerCase() ?? null;
}

function getPreferredStudentEmail(student: CrmStudentDetail): string | null {
  return cleanEmail(student.officialEmail) ?? cleanEmail(student.personalEmail);
}

function getStudentFullName(student: CrmStudentDetail): string {
  return cleanString(student.fullName) ?? 'Student';
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function parseInteger(value: unknown): number | null {
  const parsed = parseNumber(value);
  return parsed == null ? null : Math.trunc(parsed);
}

function parseDate(value: unknown): Date | null {
  const raw = cleanString(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function maskMobile(mobile: string | null): string | null {
  if (!mobile) return null;
  const digits = mobile.replace(/\D/g, '');
  if (digits.length <= 4) return mobile;
  return `${'X'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

function extractStartYear(enrollmentNo: string, yearOfStudy: number | null): number {
  const prefix = enrollmentNo.match(/^(\d{2})/)?.[1];
  if (prefix) {
    const year = 2000 + Number(prefix);
    const currentYear = new Date().getFullYear();
    if (year >= 2000 && year <= currentYear + 1) {
      return year;
    }
  }

  if (yearOfStudy && yearOfStudy > 0) {
    return new Date().getFullYear() - yearOfStudy + 1;
  }

  return new Date().getFullYear();
}

function deriveCourseDuration(student: CrmStudentDetail): number | null {
  const course = `${student.courseShortName ?? ''} ${student.courseFullName ?? ''} ${student.programName ?? ''}`.toUpperCase();
  if (!course.trim()) return null;
  if (/\b(B\.?TECH|B\.?E\.?|BACHELOR OF TECHNOLOGY|BACHELOR OF ENGINEERING)\b/.test(course)) return 4;
  if (/\b(BCA|BBA|BCOM|B\.?COM|BSC|B\.?SC|BA|B\.?A\.?)\b/.test(course)) return 3;
  if (/\b(DIPLOMA)\b/.test(course)) return 3;
  if (/\b(M\.?TECH|M\.?E\.?|MBA|MCA|MASTER)\b/.test(course)) return 2;
  return null;
}

function deriveBatch(enrollmentNo: string, student: CrmStudentDetail): string {
  const yearOfStudy = parseInteger(student.admissionYear);
  const startYear = extractStartYear(enrollmentNo, yearOfStudy);
  const duration = deriveCourseDuration(student);
  if (!duration) return String(startYear);
  return `${startYear}-${String(startYear + duration).slice(-2)}`;
}

function deriveDepartment(student: CrmStudentDetail): string {
  return cleanString(student.courseShortName) ?? cleanString(student.courseFullName) ?? 'Unassigned';
}

function parseRomanNumeral(value: string): number | null {
  const romanMap: Record<string, number> = { I: 1, V: 5, X: 10, L: 50 };
  let total = 0;
  let previous = 0;

  for (const char of value.toUpperCase().split('').reverse()) {
    const current = romanMap[char];
    if (!current) return null;
    if (current < previous) {
      total -= current;
    } else {
      total += current;
      previous = current;
    }
  }

  return total > 0 ? total : null;
}

function parseSemester(value: string | null | undefined): number | null {
  const raw = cleanString(value);
  if (!raw) return null;

  const digit = raw.match(/\d+/)?.[0];
  if (digit) return Number(digit);

  const roman = raw.match(/\b[IVXLCDM]+\b/i)?.[0];
  return roman ? parseRomanNumeral(roman) : null;
}

function buildAcademicSeed(student: CrmStudentDetail): AcademicSeed {
  const board12OrDiploma = cleanString(student.board12OrDiploma)?.toLowerCase() ?? '';
  const secondaryPercentage = parseNumber(student.percentage12OrDiploma);
  const isDiploma = board12OrDiploma.includes('diploma');
  const duration = deriveCourseDuration(student);

  return {
    cgpa: parseNumber(student.currentSemesterCGPA) ?? parseNumber(student.currentSemesterCPI) ?? 0,
    tenth_percentage: parseNumber(student.percentage10),
    twelfth_percentage: isDiploma ? null : secondaryPercentage,
    diploma_percentage: isDiploma ? secondaryPercentage : null,
    backlog_count: parseInteger(student.totalBacklog) ?? 0,
    active_backlogs: parseInteger(student.currentBacklog) ?? 0,
    semester: parseSemester(student.currentSemester),
    year_of_study: parseInteger(student.admissionYear),
    course_duration: duration,
  };
}

function calculateInitialProfileCompletion(student: CrmStudentDetail, department: string, batch: string, academic: AcademicSeed): number {
  const baseFields = [
    { filled: Boolean(cleanString(student.fullName)), weight: 10 },
    { filled: Boolean(cleanString(student.studentMobileNo)), weight: 5 },
    { filled: Boolean(parseDate(student.birthDate)), weight: 5 },
    { filled: Boolean(cleanString(student.gender)), weight: 5 },
    { filled: Boolean(department), weight: 5 },
    { filled: Boolean(batch), weight: 5 },
    { filled: false, weight: 5 },
    { filled: Boolean(cleanString(student.photoUrl)), weight: 5 },
    { filled: Boolean(cleanString(student.currentAddress)), weight: 5 },
  ];

  const filledWeight = baseFields.reduce((sum, field) => sum + (field.filled ? field.weight : 0), 0);
  const totalWeight = baseFields.reduce((sum, field) => sum + field.weight, 0);
  let completion = Math.round((filledWeight / totalWeight) * 55);

  if (academic.cgpa != null || academic.tenth_percentage != null || academic.twelfth_percentage != null) {
    completion += 20;
  }

  return Math.min(100, completion);
}

async function fetchStudentFromCrm(enrollmentNo: string): Promise<CrmStudentDetail> {
  if (!env.crmApiKey) {
    throw new BusinessRuleError('CRM API key is not configured', 'CRM_CONFIG_MISSING');
  }

  const url = new URL(env.crmStudentDetailUrl);
  url.searchParams.set('EnrollmentNo', enrollmentNo);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        'Api-Key': env.crmApiKey,
      },
    });
  } catch (err) {
    logger.error({ err, enrollmentNo }, 'CRM student lookup request failed');
    throw new BusinessRuleError('Unable to reach student CRM service', 'CRM_LOOKUP_FAILED');
  }

  if (!response.ok) {
    logger.warn({ status: response.status, enrollmentNo }, 'CRM student lookup returned non-OK response');
    throw new BusinessRuleError('Unable to fetch student details from CRM', 'CRM_LOOKUP_FAILED');
  }

  const payload = await response.json().catch(() => null);
  if (!Array.isArray(payload) || payload.length === 0) {
    throw new NotFoundError('Student', 'CRM_STUDENT_NOT_FOUND');
  }

  const student = payload[0] as CrmStudentDetail;
  const crmEnrollmentNo = cleanString(student.enrollmentNo);
  if (crmEnrollmentNo && crmEnrollmentNo !== enrollmentNo) {
    throw new BusinessRuleError('CRM returned a different enrollment number', 'CRM_ENROLLMENT_MISMATCH');
  }

  return student;
}

async function getTenantBySlug(tenantSlug?: string) {
  const slug = tenantSlug || env.defaultTenantSlug;
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant || !tenant.is_active) {
    throw new AuthenticationError('Invalid tenant', 'TENANT_INVALID');
  }
  return tenant;
}

function getSignupSession(signupToken: string): SignupSession {
  cleanupSignupSessions();
  const session = signupSessions.get(signupToken);
  if (!session || session.expiresAt < Date.now()) {
    throw new AuthenticationError('Signup session expired', 'SIGNUP_SESSION_EXPIRED');
  }
  return session;
}

function getVerifiedSignupSession(verifiedToken: string): { signupToken: string; session: SignupSession } {
  cleanupSignupSessions();
  const signupToken = verifiedSignupTokens.get(verifiedToken);
  if (!signupToken) {
    throw new AuthenticationError('OTP verification expired', 'SIGNUP_VERIFICATION_EXPIRED');
  }

  const session = getSignupSession(signupToken);
  if (session.verifiedToken !== verifiedToken) {
    throw new AuthenticationError('OTP verification expired', 'SIGNUP_VERIFICATION_EXPIRED');
  }

  return { signupToken, session };
}

function getPasswordResetSession(resetToken: string): PasswordResetSession {
  cleanupPasswordResetSessions();
  const session = passwordResetSessions.get(resetToken);
  if (!session || session.expiresAt < Date.now()) {
    throw new AuthenticationError('Password reset token expired', 'PASSWORD_RESET_TOKEN_EXPIRED');
  }
  return session;
}

async function assertStudentCanSignup(tenantId: string, enrollmentNo: string, email: string) {
  const [existingStudent, existingUser] = await Promise.all([
    prisma.student.findFirst({ where: { tenant_id: tenantId, enrollment_number: enrollmentNo } }),
    prisma.user.findFirst({ where: { tenant_id: tenantId, email } }),
  ]);

  if (existingStudent) {
    throw new ConflictError('Student account already exists for this enrollment number', 'STUDENT_ALREADY_REGISTERED');
  }

  if (existingUser) {
    throw new ConflictError('Email already in use', 'EMAIL_EXISTS');
  }
}

export async function requestStudentSignupOtp(input: RequestStudentSignupOtpInput) {
  const enrollmentNo = input.enrollment_no;
  const tenant = await getTenantBySlug(input.tenant_slug);
  const crmStudent = await fetchStudentFromCrm(enrollmentNo);
  const email = getPreferredStudentEmail(crmStudent);
  const mobile = cleanString(crmStudent.studentMobileNo);

  if (!email) {
    throw new BusinessRuleError('Student CRM record does not include an email address', 'STUDENT_EMAIL_MISSING');
  }

  if (!mobile) {
    throw new BusinessRuleError('Student CRM record does not include a mobile number', 'STUDENT_MOBILE_MISSING');
  }

  await assertStudentCanSignup(tenant.id, enrollmentNo, email);

  const signupToken = createOpaqueToken();
  signupSessions.set(signupToken, {
    enrollmentNo,
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    crmStudent,
    otp: env.studentSignupOtp,
    expiresAt: Date.now() + getSignupTtlMs(),
  });

  logger.info({ enrollmentNo, mobile: maskMobile(mobile) }, 'Student signup OTP generated');

  return {
    signup_token: signupToken,
    enrollment_no: enrollmentNo,
    full_name: getStudentFullName(crmStudent),
    masked_mobile: maskMobile(mobile),
    message: 'OTP sent successfully',
  };
}

export async function verifyStudentSignupOtp(input: VerifyStudentSignupOtpInput) {
  const session = getSignupSession(input.signup_token);
  if (input.otp !== session.otp) {
    throw new AuthenticationError('Invalid OTP', 'INVALID_OTP');
  }

  if (session.verifiedToken) {
    verifiedSignupTokens.delete(session.verifiedToken);
  }

  const verifiedToken = createOpaqueToken();
  session.verifiedToken = verifiedToken;
  verifiedSignupTokens.set(verifiedToken, input.signup_token);

  return {
    verified_token: verifiedToken,
    enrollment_no: session.enrollmentNo,
    message: 'OTP verified successfully',
  };
}

export async function completeStudentSignup(input: CompleteStudentSignupInput) {
  const { signupToken, session } = getVerifiedSignupSession(input.verified_token);
  const student = session.crmStudent;
  const email = getPreferredStudentEmail(student);

  if (!email) {
    throw new BusinessRuleError('Student CRM record does not include an email address', 'STUDENT_EMAIL_MISSING');
  }

  await assertStudentCanSignup(session.tenantId, session.enrollmentNo, email);

  const password_hash = await hashPassword(input.password);
  const department = deriveDepartment(student);
  const batch = deriveBatch(session.enrollmentNo, student);
  const academic = buildAcademicSeed(student);
  const profileCompletion = calculateInitialProfileCompletion(student, department, batch, academic);
  const mobile = cleanString(student.studentMobileNo);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        tenant_id: session.tenantId,
        email,
        password_hash,
        role: 'student',
        name: getStudentFullName(student),
        phone: mobile,
        department,
      },
    });

    const createdStudent = await tx.student.create({
      data: {
        user_id: user.id,
        tenant_id: session.tenantId,
        enrollment_number: session.enrollmentNo,
        roll_number: cleanString(student.temporaryEnrolmentNo),
        full_name: getStudentFullName(student),
        email,
        mobile,
        date_of_birth: parseDate(student.birthDate),
        gender: cleanString(student.gender),
        category: cleanString(student.category),
        aadhaar_number: cleanString(student.aadhaarNumber),
        department,
        batch,
        course: cleanString(student.courseFullName) ?? cleanString(student.courseShortName),
        institute: cleanString(student.instituteName),
        temporary_enrolment_no: cleanString(student.temporaryEnrolmentNo),
        parent_name: cleanString(student.parentName),
        parent_contact_no: cleanString(student.parentContactNo),
        blood_group: cleanString(student.bloodGroup),
        program_name: cleanString(student.programName),
        admission_year: parseInteger(student.admissionYear),
        current_semester: cleanString(student.currentSemester),
        current_semester_spi: parseNumber(student.currentSemesterSPI),
        current_semester_cpi: parseNumber(student.currentSemesterCPI),
        current_semester_cgpa: parseNumber(student.currentSemesterCGPA),
        exam_form_status: cleanString(student.examFormStatus),
        overall_attendance_percentage: parseNumber(student.overallAttendancePercentage),
        board10: cleanString(student.board10),
        passing_year10: parseInteger(student.passingYear10),
        board12_or_diploma: cleanString(student.board12OrDiploma),
        passing_year12_or_diploma: parseInteger(student.passingYear12OrDiploma),
        residential_address: cleanString(student.currentAddress),
        permanent_address: cleanString(student.permanentAddress),
        profile_photo_url: cleanString(student.photoUrl),
        profile_completion_percentage: profileCompletion,
        verification_status: 'pending',
      },
    });

    await tx.academicProfile.create({
      data: {
        student_id: createdStudent.id,
        ...academic,
      },
    });

    await tx.portfolio.create({
      data: {
        student_id: createdStudent.id,
      },
    });
  });

  signupSessions.delete(signupToken);
  verifiedSignupTokens.delete(input.verified_token);

  return login({
    email,
    password: input.password,
    tenant_slug: session.tenantSlug,
  });
}

export async function requestPasswordReset(input: ForgotPasswordInput) {
  const whereClause: Record<string, unknown> = {
    email: input.email.toLowerCase(),
  };

  if (input.tenant_slug) {
    const tenant = await prisma.tenant.findUnique({ where: { slug: input.tenant_slug } });
    if (!tenant) {
      throw new NotFoundError('User', 'PASSWORD_RESET_USER_NOT_FOUND');
    }
    whereClause.tenant_id = tenant.id;
  }

  const user = await prisma.user.findFirst({
    where: whereClause,
    select: { id: true, email: true, is_active: true },
  });

  if (!user || !user.is_active) {
    throw new NotFoundError('User', 'PASSWORD_RESET_USER_NOT_FOUND');
  }

  const resetToken = createOpaqueToken();
  passwordResetSessions.set(resetToken, {
    userId: user.id,
    expiresAt: Date.now() + getPasswordResetTtlMs(),
  });

  logger.info({ email: user.email }, 'Password reset requested');

  return {
    message: 'Reset link sent',
    reset_token: resetToken,
    expires_in_minutes: env.studentSignupSessionTtlMinutes,
  };
}

export async function resetPassword(input: ResetPasswordInput) {
  const session = getPasswordResetSession(input.token);
  const passwordHash = await hashPassword(input.new_password);

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: session.userId },
      data: { password_hash: passwordHash },
    });

    await tx.refreshToken.deleteMany({
      where: { user_id: session.userId },
    });
  });

  passwordResetSessions.delete(input.token);

  return {
    message: 'Password reset successful',
  };
}

export async function login(input: LoginInput) {
  const { email, password, tenant_slug } = input;

  // Find user by email (optionally scoped to tenant)
  const whereClause: Record<string, unknown> = { email };
  if (tenant_slug) {
    const tenant = await prisma.tenant.findUnique({ where: { slug: tenant_slug } });
    if (!tenant || !tenant.is_active) {
      throw new AuthenticationError('Invalid credentials', 'INVALID_CREDENTIALS');
    }
    whereClause.tenant_id = tenant.id;
  }

  const user = await prisma.user.findFirst({
    where: whereClause,
    include: { tenant: { select: { slug: true, name: true, is_active: true } } },
  });

  if (!user || !user.is_active) {
    throw new AuthenticationError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  if (!user.tenant.is_active) {
    throw new AuthenticationError('Tenant is inactive', 'TENANT_INACTIVE');
  }

  const passwordValid = await comparePassword(password, user.password_hash);
  if (!passwordValid) {
    throw new AuthenticationError('Invalid email or password', 'INVALID_CREDENTIALS');
  }

  // Generate tokens
  const accessToken = generateAccessToken({
    user_id: user.id,
    tenant_id: user.tenant_id,
    role: user.role,
    email: user.email,
    department: user.department,
  });

  const refreshToken = generateRefreshToken({ user_id: user.id });

  // Store refresh token
  await prisma.refreshToken.create({
    data: {
      user_id: user.id,
      token: refreshToken,
      expires_at: getRefreshTokenExpiry(),
    },
  });

  // Update last login
  await prisma.user.update({
    where: { id: user.id },
    data: { last_login_at: new Date() },
  });

  // Audit log (fire and forget)
  prisma.auditLog
    .create({
      data: {
        tenant_id: user.tenant_id,
        user_id: user.id,
        user_name: user.name,
        action: 'login',
        module: 'auth',
        details: 'User logged in',
      },
    })
    .catch((err) => logger.error({ err }, 'Failed to write login audit log'));

  const permissions = await getRolePermissions(user.tenant_id, user.role);

  return {
    token: accessToken,
    refresh_token: refreshToken,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      tenant_id: user.tenant_id,
      permissions,
    },
  };
}

export async function refreshTokens(input: RefreshInput) {
  const { refresh_token } = input;

  // Find the stored refresh token
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: refresh_token },
    include: { user: { select: { id: true, tenant_id: true, role: true, email: true, department: true, is_active: true } } },
  });

  if (!storedToken || storedToken.revoked || storedToken.expires_at < new Date()) {
    // If token was already used (revoked), revoke ALL tokens for this user (token reuse detection)
    if (storedToken?.revoked) {
      await prisma.refreshToken.updateMany({
        where: { user_id: storedToken.user_id },
        data: { revoked: true },
      });
      logger.warn({ user_id: storedToken.user_id }, 'Refresh token reuse detected - all tokens revoked');
    }
    throw new AuthenticationError('Invalid or expired refresh token', 'REFRESH_TOKEN_INVALID');
  }

  if (!storedToken.user.is_active) {
    throw new AuthenticationError('User account is deactivated', 'TOKEN_INVALID');
  }

  // Revoke old refresh token (rotation)
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revoked: true },
  });

  // Generate new token pair
  const newAccessToken = generateAccessToken({
    user_id: storedToken.user.id,
    tenant_id: storedToken.user.tenant_id,
    role: storedToken.user.role,
    email: storedToken.user.email,
    department: storedToken.user.department,
  });

  const newRefreshToken = generateRefreshToken({ user_id: storedToken.user.id });

  await prisma.refreshToken.create({
    data: {
      user_id: storedToken.user.id,
      token: newRefreshToken,
      expires_at: getRefreshTokenExpiry(),
    },
  });

  return {
    token: newAccessToken,
    refresh_token: newRefreshToken,
  };
}

export async function logout(userId: string, refreshToken?: string) {
  if (refreshToken) {
    // Revoke specific token
    await prisma.refreshToken.updateMany({
      where: { user_id: userId, token: refreshToken },
      data: { revoked: true },
    });
  } else {
    // Revoke all tokens for user
    await prisma.refreshToken.updateMany({
      where: { user_id: userId },
      data: { revoked: true },
    });
  }

  return { message: 'Logged out successfully' };
}

export async function changePassword(userId: string, input: ChangePasswordInput) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      tenant_id: true,
      role: true,
      email: true,
      password_hash: true,
      is_active: true,
    },
  });

  if (!user || !user.is_active) {
    throw new AuthenticationError('User not found', 'TOKEN_INVALID');
  }

  const currentPasswordValid = await comparePassword(input.current_password, user.password_hash);
  if (!currentPasswordValid) {
    throw new AuthenticationError('Current password is incorrect', 'INVALID_CURRENT_PASSWORD');
  }

  const password_hash = await hashPassword(input.new_password);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { password_hash },
    }),
    prisma.refreshToken.updateMany({
      where: { user_id: user.id },
      data: { revoked: true },
    }),
  ]);

  prisma.auditLog.create({
    data: {
      tenant_id: user.tenant_id,
      user_id: user.id,
      user_name: user.email,
      action: 'update',
      module: 'auth',
      details: 'Password changed',
    },
  }).catch((err) => logger.error({ err }, 'Failed to write password change audit log'));

  return { message: 'Password updated successfully' };
}

const meSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  phone: true,
  department: true,
  institutes: true,
  courses: true,
  branches: true,
  designation: true,
  crm_employee_code: true,
  tenant_id: true,
  last_login_at: true,
  created_at: true,
  tenant: { select: { slug: true, name: true, short_name: true, logo_url: true } },
} as const;

export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: meSelect,
  });

  if (!user) {
    throw new AuthenticationError('User not found', 'TOKEN_INVALID');
  }

  return {
    ...user,
    permissions: await getRolePermissions(user.tenant_id, user.role),
  };
}

export async function updateMe(
  userId: string,
  input: { phone?: string | null; designation?: string | null },
) {
  // ERP-linked users (synced from the CRM) cannot edit their own ERP-owned fields
  // (phone/designation are both ERP-fetched for CRM staff).
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { crm_employee_code: true },
  });
  if (existing?.crm_employee_code) {
    throw new BusinessRuleError(
      'Profile fields are managed by the ERP and cannot be edited',
      'ERP_MANAGED_FIELD',
    );
  }

  const data: { phone?: string | null; designation?: string | null } = {};
  if (input.phone !== undefined) {
    const trimmed = input.phone?.trim();
    data.phone = trimmed ? trimmed : null;
  }
  if (input.designation !== undefined) {
    const trimmed = input.designation?.trim();
    data.designation = trimmed ? trimmed : null;
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: meSelect,
  });

  prisma.auditLog
    .create({
      data: {
        tenant_id: user.tenant_id,
        user_id: user.id,
        user_name: user.email,
        action: 'update',
        module: 'auth',
        details: 'Self profile updated',
      },
    })
    .catch((err) => logger.error({ err }, 'Failed to write self-profile update audit log'));

  return {
    ...user,
    permissions: await getRolePermissions(user.tenant_id, user.role),
  };
}
