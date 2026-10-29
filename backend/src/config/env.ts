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
  // CORS accepts a comma-separated list so the existing portal frontend, the new PlaceReady web
  // console, and dev origins can all be allowed. A single value stays a single-item array.
  // (Native/Flutter clients don't send an Origin, so CORS never gates them.)
  corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  // Public base URL of this API, used for the OpenAPI `servers` entry (Flutter/codegen point here).
  apiPublicUrl: process.env.API_PUBLIC_URL || `http://localhost:${parseInt(process.env.PORT || '3000', 10)}`,
  defaultTenantSlug: process.env.DEFAULT_TENANT_SLUG || 'silver-oak-university',
  crmStudentDetailUrl:
    process.env.CRM_STUDENT_DETAIL_URL ||
    'http://115.244.149.106:44326/api/CRMAPIStudent/GetStudentDetailByEnrollmentNo',
  crmInstituteListUrl:
    process.env.CRM_INSTITUTE_LIST_URL ||
    'http://115.244.149.106:44326/api/CRMAPIStudent/GetInstituteList',
  crmCourseListUrl:
    process.env.CRM_COURSE_LIST_URL ||
    'http://115.244.149.106:44326/api/CRMAPIStudent/GetCourseList',
  crmBranchListUrl:
    process.env.CRM_BRANCH_LIST_URL ||
    'http://115.244.149.106:44326/api/CRMAPIStudent/GetBranchList',
  crmDepartmentListUrl:
    process.env.CRM_DEPARTMENT_LIST_URL ||
    'http://115.244.149.106:44326/api/CRMAPIStudent/GetAllDepartments',
  crmEmployeeListUrl:
    process.env.CRM_EMPLOYEE_LIST_URL ||
    'http://115.244.149.106:44326/api/CRMAPIStudent/GetEmployeesList',
  crmEmployeeDetailUrl:
    process.env.CRM_EMPLOYEE_DETAIL_URL ||
    'http://115.244.149.106:44326/api/CRMAPIStudent/GetEmployeeDetail',
  crmApiKey: process.env.CRM_API_KEY || 'slkdjfiok;dfposdjfpkjoidshd -123',
  // ZeptoMail transactional email (signup OTP delivery). The token is the full `Zoho-enczapikey …`
  // header value and is a SECRET — set MAIL_ZEPTO_TOKEN in .env only. Empty by default (no real send).
  mailZeptoUrl: process.env.MAIL_ZEPTO_URL || 'https://api.zeptomail.in/v1.1/email',
  mailZeptoToken: process.env.MAIL_ZEPTO_TOKEN || '',
  mailFromAddress: process.env.MAIL_FROM_ADDRESS || 'noreply@placementcrm.silveroakuni.ac.in',
  mailFromName: process.env.MAIL_FROM_NAME || 'Silver Oak T&P',
  // PlaceReady student app webhook (SR 36): published events / newly assigned students are pushed to
  // PlaceReady so students get an in-app + push notification there. The secret must equal PlaceReady's
  // PR_SOU_WEBHOOK_SECRET. Either empty = webhook disabled (SOU behaviour unchanged).
  placereadyWebhookUrl: process.env.PLACEREADY_WEBHOOK_URL || '',
  placereadyWebhookSecret: process.env.PLACEREADY_WEBHOOK_SECRET || '',
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
