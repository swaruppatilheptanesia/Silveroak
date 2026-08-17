/**
 * Admin Service — user management, audit logs, permissions.
 * Real API calls only (no mock data for this module).
 */
import { apiClient } from './apiClient';
import { parseApiErrorEnvelope, type ApiErrorDetail } from '@/lib/apiError';
import type {
  ApiAuditLog,
  ApiAdminEligibilityRule,
  ApiAdminPortfoliosResponse,
  ApiAdminSelectionDatabaseResponse,
  ApiAdminStudent,
  ApiAdminStudentInterest,
  ApiInterestRegistrationsResponse,
  ApiInterestSummaryItem,
  ApiRecentInterestRegistration,
  ApiPermission,
  ApiUserDetail,
  ApiCrmDepartmentOption,
  ApiCrmEmployeeDetail,
  ApiCrmEmployeeOption,
  AdminPortfolioQueryParams,
  AdminStudentQueryParams,
  BulkVerifyStudentsInput,
  BulkVerifyStudentsResult,
  CreateAdminEligibilityRuleInput,
  PaginatedAuditLogs,
  PaginatedAdminStudents,
  PaginatedUsers,
  SelectionDatabaseQueryParams,
  UpdateAdminEligibilityRuleInput,
  AuditLogQueryParams,
  InterestRegistrationsQueryParams,
  CreateUserInput,
  LinkRecruiterToCompanyInput,
  UpdatePermissionInput,
  UpdateUserInput,
  UpdateStudentProfileBlockInput,
  ReopenPlacementInput,
  UserQueryParams,
  VerifyStudentInput,
} from '@/types/admin';
import type { AcademicProfile } from '@/types/student';

class AdminApiError extends Error {
  status: number;
  code: string;
  details: ApiErrorDetail[];

  constructor(message: string, status: number, code: string, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RawPagination {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
  total_pages?: number;
  hasNext?: boolean;
  hasPrev?: boolean;
  has_next?: boolean;
  has_prev?: boolean;
}

interface RawPaginatedUsers {
  data: PaginatedUsers['data'];
  pagination: RawPagination;
}

interface RawPaginatedAuditLogs {
  data: ApiAuditLog[];
  pagination: RawPagination;
}

interface RawAcademicProfile {
  student_id: string;
  cgpa: number | null;
  tenth_percentage: number | null;
  twelfth_percentage: number | null;
  diploma_percentage?: number | null;
  backlog_count: number;
  backlog_history?: string[];
  semester: number | null;
  year: number | null;
  certifications?: unknown[];
}

interface RawAdminStudent extends Omit<ApiAdminStudent, 'academicProfile' | 'interests'> {
  academicProfile: RawAcademicProfile;
  interests: ApiAdminStudentInterest[];
}

interface RawPaginatedStudents {
  data: RawAdminStudent[];
  pagination: RawPagination;
}

interface RawEligibilityRulesResponse {
  data: ApiAdminEligibilityRule[];
}

interface RawInterestSummaryResponse {
  summary: ApiInterestSummaryItem[];
}

interface RawCrmDepartmentsResponse {
  data: ApiCrmDepartmentOption[];
}

interface RawCrmEmployeesResponse {
  data: ApiCrmEmployeeOption[];
}

type RawCrmEmployeeDetail = ApiCrmEmployeeDetail;

function throwIfError<T>(res: { data: T; error: string | null; status: number }, successStatus = 200): T {
  if (res.status !== successStatus || res.error) {
    const parsed = parseApiErrorEnvelope(res.data, res.error ?? undefined);
    throw new AdminApiError(parsed.message, res.status, parsed.code, parsed.details);
  }
  return res.data;
}

function toQueryString(params: object): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params as Record<string, unknown>)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

function normalizePagination(raw: RawPagination) {
  const totalPages = (
    raw.totalPages
    ?? raw.total_pages
    ?? Math.ceil(raw.total / raw.limit)
    ?? 1
  ) || 1;

  return {
    page: raw.page,
    limit: raw.limit,
    total: raw.total,
    totalPages,
    hasNext: raw.hasNext ?? raw.has_next ?? raw.page < totalPages,
    hasPrev: raw.hasPrev ?? raw.has_prev ?? raw.page > 1,
  };
}

function normalizeAcademicProfile(raw: RawAcademicProfile): AcademicProfile {
  return {
    student_id: raw.student_id,
    cgpa: raw.cgpa ?? 0,
    tenth_percentage: raw.tenth_percentage ?? 0,
    twelfth_percentage: raw.twelfth_percentage ?? undefined,
    diploma_percentage: raw.diploma_percentage ?? undefined,
    backlog_count: raw.backlog_count ?? 0,
    backlog_history: raw.backlog_history ?? [],
    semester: raw.semester ?? 0,
    year: raw.year ?? 0,
    certifications: [],
  };
}

function normalizeAdminStudent(raw: RawAdminStudent): ApiAdminStudent {
  return {
    ...raw,
    academicProfile: normalizeAcademicProfile(raw.academicProfile),
    interests: raw.interests ?? [],
  };
}

export const adminService = {
  getUsers: async (params: UserQueryParams = {}): Promise<PaginatedUsers> => {
    const res = await apiClient.get<RawPaginatedUsers>(`/admin/users${toQueryString(params)}`);
    const payload = throwIfError(res);
    return {
      data: payload.data,
      pagination: normalizePagination(payload.pagination),
    };
  },

  getUserDetail: async (userId: string): Promise<ApiUserDetail> => {
    const res = await apiClient.get<ApiUserDetail>(`/admin/users/${userId}`);
    return throwIfError(res);
  },

  createUser: async (data: CreateUserInput): Promise<ApiUserDetail> => {
    const res = await apiClient.post<ApiUserDetail>('/admin/users', data);
    return throwIfError(res, 201);
  },

  updateUser: async (userId: string, data: UpdateUserInput): Promise<ApiUserDetail> => {
    const res = await apiClient.put<ApiUserDetail>(`/admin/users/${userId}`, data);
    return throwIfError(res);
  },

  linkRecruiterToCompany: async (
    userId: string,
    data: LinkRecruiterToCompanyInput,
  ): Promise<ApiUserDetail> => {
    const res = await apiClient.put<ApiUserDetail>(`/admin/users/${userId}/recruiter`, data);
    return throwIfError(res);
  },

  regenerateUserPassword: async (
    userId: string,
  ): Promise<{ user: ApiUserDetail; temporary_password: string }> => {
    const res = await apiClient.post<{ user: ApiUserDetail; temporary_password: string }>(
      `/admin/users/${userId}/regenerate-password`,
      {},
    );
    return throwIfError(res);
  },

  updateStudentProfileBlock: async (studentId: string, data: UpdateStudentProfileBlockInput): Promise<ApiAdminStudent> => {
    const res = await apiClient.put<ApiAdminStudent>(`/admin/students/${studentId}/profile-block`, data);
    return throwIfError(res);
  },

  reopenStudentPlacement: async (studentId: string, data: ReopenPlacementInput): Promise<ApiAdminStudent> => {
    const res = await apiClient.put<RawAdminStudent>(`/admin/students/${studentId}/placement/reopen`, data);
    return normalizeAdminStudent(throwIfError(res));
  },

  getCrmDepartments: async (departmentType: 1 | 2): Promise<ApiCrmDepartmentOption[]> => {
    const res = await apiClient.get<RawCrmDepartmentsResponse>(`/admin/crm/departments?department_type=${departmentType}`);
    return throwIfError(res).data;
  },

  getCrmEmployees: async (departmentType: 1 | 2, departmentId: number): Promise<ApiCrmEmployeeOption[]> => {
    const res = await apiClient.get<RawCrmEmployeesResponse>(
      `/admin/crm/employees?department_type=${departmentType}&department_id=${departmentId}`,
    );
    return throwIfError(res).data;
  },

  getCrmEmployeeDetail: async (employeeCode: number): Promise<RawCrmEmployeeDetail> => {
    const res = await apiClient.get<RawCrmEmployeeDetail>(`/admin/crm/employees/${employeeCode}`);
    return throwIfError(res);
  },

  getAuditLogs: async (params: AuditLogQueryParams = {}): Promise<PaginatedAuditLogs> => {
    const res = await apiClient.get<RawPaginatedAuditLogs>(`/admin/audit-logs${toQueryString(params)}`);
    const payload = throwIfError(res);
    return {
      data: payload.data,
      pagination: normalizePagination(payload.pagination),
    };
  },

  getPermissions: async (): Promise<ApiPermission[]> => {
    const res = await apiClient.get<{ permissions: ApiPermission[] }>('/admin/permissions');
    return throwIfError(res).permissions;
  },

  updatePermission: async (permissionId: string, data: UpdatePermissionInput): Promise<ApiPermission> => {
    const res = await apiClient.put<ApiPermission>(`/admin/permissions/${permissionId}`, data);
    return throwIfError(res);
  },

  getStudents: async (params: AdminStudentQueryParams = {}): Promise<PaginatedAdminStudents> => {
    const res = await apiClient.get<RawPaginatedStudents>(`/admin/students${toQueryString(params)}`);
    const payload = throwIfError(res);
    return {
      data: payload.data.map(normalizeAdminStudent),
      pagination: normalizePagination(payload.pagination),
    };
  },

  getStudentDetail: async (studentId: string): Promise<ApiAdminStudent> => {
    const res = await apiClient.get<RawAdminStudent>(`/admin/students/${studentId}`);
    return normalizeAdminStudent(throwIfError(res));
  },

  verifyStudent: async (studentId: string, data: VerifyStudentInput): Promise<ApiAdminStudent> => {
    const res = await apiClient.put<RawAdminStudent>(`/admin/students/${studentId}/verification`, data);
    return normalizeAdminStudent(throwIfError(res));
  },

  bulkVerifyStudents: async (data: BulkVerifyStudentsInput): Promise<BulkVerifyStudentsResult> => {
    const res = await apiClient.post<BulkVerifyStudentsResult>('/admin/students/verification/bulk', data);
    return throwIfError(res);
  },

  getEligibilityRules: async (): Promise<ApiAdminEligibilityRule[]> => {
    const res = await apiClient.get<RawEligibilityRulesResponse>('/admin/eligibility-rules');
    return throwIfError(res).data;
  },

  createEligibilityRule: async (data: CreateAdminEligibilityRuleInput): Promise<ApiAdminEligibilityRule> => {
    const res = await apiClient.post<ApiAdminEligibilityRule>('/admin/eligibility-rules', data);
    return throwIfError(res, 201);
  },

  updateEligibilityRule: async (ruleId: string, data: UpdateAdminEligibilityRuleInput): Promise<ApiAdminEligibilityRule> => {
    const res = await apiClient.put<ApiAdminEligibilityRule>(`/admin/eligibility-rules/${ruleId}`, data);
    return throwIfError(res);
  },

  deleteEligibilityRule: async (ruleId: string): Promise<{ message: string }> => {
    const res = await apiClient.delete<{ message: string }>(`/admin/eligibility-rules/${ruleId}`);
    return throwIfError(res);
  },

  getPortfolios: async (params: AdminPortfolioQueryParams = {}): Promise<ApiAdminPortfoliosResponse> => {
    const res = await apiClient.get<ApiAdminPortfoliosResponse>(`/admin/portfolios${toQueryString(params)}`);
    return throwIfError(res);
  },

  getSelectionDatabase: async (params: SelectionDatabaseQueryParams = {}): Promise<ApiAdminSelectionDatabaseResponse> => {
    const res = await apiClient.get<ApiAdminSelectionDatabaseResponse>(`/admin/selection-database${toQueryString(params)}`);
    return throwIfError(res);
  },

  getInterestSummary: async (): Promise<ApiInterestSummaryItem[]> => {
    const res = await apiClient.get<RawInterestSummaryResponse>('/admin/interests/summary');
    return throwIfError(res).summary;
  },

  getInterestRegistrations: async (params: InterestRegistrationsQueryParams = {}): Promise<ApiInterestRegistrationsResponse> => {
    const res = await apiClient.get<{ data: RawAdminStudent[]; total: number }>(
      `/admin/interests/registrations${toQueryString(params)}`
    );
    const payload = throwIfError(res);
    return {
      data: payload.data.map(normalizeAdminStudent),
      total: payload.total,
    };
  },

  getRecentInterestRegistrations: async (): Promise<ApiRecentInterestRegistration[]> => {
    const res = await apiClient.get<ApiRecentInterestRegistration[]>(
      '/admin/interests/registrations/recent'
    );
    return throwIfError(res);
  },

  approveInterestRegistration: async (id: string): Promise<void> => {
    const res = await apiClient.put<unknown>(`/admin/interests/registrations/${id}/approve`, {});
    throwIfError(res);
  },

  withdrawInterestRegistration: async (id: string, reason?: string): Promise<void> => {
    const res = await apiClient.put<unknown>(`/admin/interests/registrations/${id}/withdraw`, { reason });
    throwIfError(res);
  },
};

export { AdminApiError };
