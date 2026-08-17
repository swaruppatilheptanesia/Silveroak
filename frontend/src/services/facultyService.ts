import { apiClient } from './apiClient';
import { parseApiErrorEnvelope, type ApiErrorDetail } from '@/lib/apiError';
import type {
  FacultyAssignedProgramsResponse,
  FacultyDashboardResponse,
  FacultyProgramStudentsResponse,
  FacultyStudentDetail,
  FacultyStudentFilterOptions,
  FacultyStudentsQueryParams,
  FacultyStudentsResponse,
} from '@/types/faculty';

class FacultyApiError extends Error {
  status: number;
  code: string;
  details: ApiErrorDetail[];

  constructor(message: string, status: number, code: string, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = 'FacultyApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function throwIfError<T>(res: { data: T; error: string | null; status: number }, successStatus = 200): T {
  if (res.status !== successStatus || res.error) {
    const parsed = parseApiErrorEnvelope(res.data, res.error ?? undefined);
    throw new FacultyApiError(parsed.message, res.status, parsed.code, parsed.details);
  }

  return res.data;
}

function toQueryString(params: Record<string, unknown>) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') {
      continue;
    }
    if (Array.isArray(value)) {
      const cleaned = value.filter((item) => item !== undefined && item !== null && item !== '');
      if (cleaned.length > 0) {
        for (const item of cleaned) {
          searchParams.append(key, String(item));
        }
      }
      continue;
    }
    searchParams.append(key, String(value));
  }

  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export const facultyService = {
  async getDashboard(): Promise<FacultyDashboardResponse> {
    const res = await apiClient.get<FacultyDashboardResponse>('/faculty/dashboard');
    return throwIfError(res);
  },

  async getStudents(params: FacultyStudentsQueryParams = {}): Promise<FacultyStudentsResponse> {
    const res = await apiClient.get<FacultyStudentsResponse>(
      `/faculty/students${toQueryString(params as Record<string, unknown>)}`,
    );
    return throwIfError(res);
  },

  async getStudentDetail(studentId: string): Promise<FacultyStudentDetail> {
    const res = await apiClient.get<FacultyStudentDetail>(`/faculty/students/${studentId}`);
    return throwIfError(res);
  },

  async getStudentFilterOptions(): Promise<FacultyStudentFilterOptions> {
    const res = await apiClient.get<FacultyStudentFilterOptions>('/faculty/students/filter-options');
    return throwIfError(res);
  },

  async getAssignedPrograms(): Promise<FacultyAssignedProgramsResponse> {
    const res = await apiClient.get<FacultyAssignedProgramsResponse>('/faculty/programs');
    return throwIfError(res);
  },

  async getProgramStudents(
    postingType: string,
    params: { search?: string } = {},
  ): Promise<FacultyProgramStudentsResponse> {
    const res = await apiClient.get<FacultyProgramStudentsResponse>(
      `/faculty/programs/students${toQueryString({ posting_type: postingType, ...params })}`,
    );
    return throwIfError(res);
  },
};

export { FacultyApiError };
