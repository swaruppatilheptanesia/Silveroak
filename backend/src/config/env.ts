import dotenv from 'dotenv';
import path from 'path';

const projectRoot = path.resolve(__dirname, '../..');
dotenv.config({ path: path.resolve(projectRoot, '.env') });

const rawUploadDir = process.env.UPLOAD_DIR || './uploads';
const resolvedUploadDir = path.isAbsolute(rawUploadDir)
  ? rawUploadDir
  : path.resolve(projectRoot, rawUploadDir);

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  databaseUrl: process.env.DATABASE_URL!,
  jwtSecret: process.env.JWT_SECRET!,
  jwtExpiry: process.env.JWT_EXPIRY || '15m',
  refreshTokenExpiryDays: parseInt(process.env.REFRESH_TOKEN_EXPIRY_DAYS || '7', 10),
  uploadDir: resolvedUploadDir,
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB || '5', 10),
  logLevel: process.env.LOG_LEVEL || 'info',
  rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
  rateLimitMaxRequests: parseInt(
    process.env.RATE_LIMIT_MAX_REQUESTS || (process.env.NODE_ENV === 'development' ? '10000' : '100'),
    10
  ),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  defaultTenantSlug: process.env.DEFAULT_TENANT_SLUG || 'silver-oak-university',
  crmStudentDetailUrl:
    process.env.CRM_STUDENT_DETAIL_URL ||
    'http://115.244.149.106:44325/api/CRMAPIStudent/GetStudentDetailByEnrollmentNo',
  crmInstituteListUrl:
    process.env.CRM_INSTITUTE_LIST_URL ||
    'http://115.244.149.106:44325/api/CRMAPIStudent/GetInstituteList',
  crmCourseListUrl:
    process.env.CRM_COURSE_LIST_URL ||
    'http://115.244.149.106:44325/api/CRMAPIStudent/GetCourseList',
  crmBranchListUrl:
    process.env.CRM_BRANCH_LIST_URL ||
    'http://115.244.149.106:44325/api/CRMAPIStudent/GetBranchList',
  crmDepartmentListUrl:
    process.env.CRM_DEPARTMENT_LIST_URL ||
    'http://115.244.149.106:44325/api/CRMAPIStudent/GetAllDepartments',
  crmEmployeeListUrl:
    process.env.CRM_EMPLOYEE_LIST_URL ||
    'http://115.244.149.106:44325/api/CRMAPIStudent/GetEmployeesList',
  crmEmployeeDetailUrl:
    process.env.CRM_EMPLOYEE_DETAIL_URL ||
    'http://115.244.149.106:44325/api/CRMAPIStudent/GetEmployeeDetail',
  crmApiKey: process.env.CRM_API_KEY || 'slkdjfiok;dfposdjfpkjoidshd -123',
  studentSignupOtp: process.env.STUDENT_SIGNUP_OTP || '000000',
  studentSignupSessionTtlMinutes: parseInt(process.env.STUDENT_SIGNUP_SESSION_TTL_MINUTES || '10', 10),

  get isDevelopment() {
    return this.nodeEnv === 'development';
  },
  get isProduction() {
    return this.nodeEnv === 'production';
  },
  get isTest() {
    return this.nodeEnv === 'test';
  },
};

export function validateEnv(): void {
  const required = ['DATABASE_URL', 'JWT_SECRET'];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
