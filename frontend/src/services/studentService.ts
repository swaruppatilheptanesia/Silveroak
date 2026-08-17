/**
 * Student Service — real API calls for student endpoints.
 * Also re-exports mock data for components not yet migrated.
 */
import { apiClient } from './apiClient';
import { parseApiErrorEnvelope, type ApiErrorDetail } from '@/lib/apiError';
import type {
  ApiStudentProfile,
  ApiStudentPersonal,
  ApiAcademicProfile,
  ApiSkillsProfile,
  ApiProject,
  ApiCertification,
  ApiEmployment,
  ApiResume,
  ApiInterest,
  StudentDocumentUpload,
  UpdatePersonalInput,
  UpdateAcademicInput,
  UpdateSkillsInput,
  CreateProjectInput,
  CreateCertificationInput,
  CreateEmploymentInput,
  PolicyAcceptanceInput,
  InterestRegistrationInput,
  PlacementPreferences,
  GlobalPlacementOptOutInput,
  PostingTypePreferenceInput,
} from '@/types/student';

// ── Re-export mock data for gradual migration ──────────
import {
  mockStudent,
  mockAcademicProfile,
  mockSkillsProfile,
  mockProjects,
  mockResumes,
  mockInterests,
  mockEligibilityChecks,
  mockReadinessChecklist,
  mockCurrentEmployment,
  departments,
  instituteOptions,
  courseOptions,
  skillOptions,
  domainOptions,
  locationOptions,
} from '@/data/mockStudentData';
import { mockAllStudents, mockEligibilityRules, mockAdminStats, mockInterestSummary } from '@/data/mockAdminData';
import { fullStudentPool, getEligibleStudentsForOpportunity, type StudentPoolEntry } from '@/data/mockStudentPool';
import type { StudentMaster, AcademicProfile, SkillsProfile, Project, Resume, InterestRegistration, EligibilityCheck, CareerReadinessItem, CurrentEmployment, EligibilityRule } from '@/types/student';

export {
  mockStudent,
  mockAcademicProfile,
  mockSkillsProfile,
  mockProjects,
  mockResumes,
  mockInterests,
  mockEligibilityChecks,
  mockReadinessChecklist,
  mockCurrentEmployment,
  departments,
  instituteOptions,
  courseOptions,
  skillOptions,
  domainOptions,
  locationOptions,
  mockAllStudents,
  mockEligibilityRules,
  mockAdminStats,
  mockInterestSummary,
  fullStudentPool,
  getEligibleStudentsForOpportunity,
};
export type { StudentPoolEntry };

// ── Helper ─────────────────────────────────────────────

class StudentApiError extends Error {
  status: number;
  code: string;
  details: ApiErrorDetail[];

  constructor(message: string, status: number, code: string, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = 'StudentApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function throwIfError<T>(res: { data: T; error: string | null; status: number }, successStatus = 200): T {
  if (res.status !== successStatus || res.error) {
    const parsed = parseApiErrorEnvelope(res.data, res.error ?? undefined);
    throw new StudentApiError(parsed.message, res.status, parsed.code, parsed.details);
  }
  return res.data;
}

// ── Real API Service ───────────────────────────────────

const studentApi = {
  // ── Profile ──
  getMyProfile: async (): Promise<ApiStudentProfile> => {
    const res = await apiClient.get<ApiStudentProfile>('/students/me');
    return throwIfError(res);
  },

  updatePersonal: async (data: UpdatePersonalInput): Promise<ApiStudentPersonal> => {
    const res = await apiClient.put<ApiStudentPersonal>('/students/me/personal', data);
    return throwIfError(res);
  },

  uploadProfilePhoto: async (file: File): Promise<ApiStudentPersonal> => {
    const formData = new FormData();
    formData.append('file', file);

    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    const token = (await import('./apiClient')).tokenManager.getAccessToken();

    const response = await fetch(`${baseUrl}/students/me/profile-photo`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const parsed = parseApiErrorEnvelope(errBody, 'Upload failed');
      throw new StudentApiError(parsed.message, response.status, parsed.code, parsed.details);
    }

    return response.json();
  },

  updateAcademic: async (data: UpdateAcademicInput): Promise<ApiAcademicProfile> => {
    const res = await apiClient.put<ApiAcademicProfile>('/students/me/academic', data);
    return throwIfError(res);
  },

  updateSkills: async (data: UpdateSkillsInput): Promise<ApiSkillsProfile> => {
    const res = await apiClient.put<ApiSkillsProfile>('/students/me/skills', data);
    return throwIfError(res);
  },

  // ── Projects ──
  getProjects: async (): Promise<ApiProject[]> => {
    const res = await apiClient.get<{ projects: ApiProject[] }>('/students/me/projects');
    return throwIfError(res).projects;
  },

  createProject: async (data: CreateProjectInput): Promise<ApiProject> => {
    const res = await apiClient.post<ApiProject>('/students/me/projects', data);
    return throwIfError(res, 201);
  },

  updateProject: async (projectId: string, data: Partial<CreateProjectInput>): Promise<ApiProject> => {
    const res = await apiClient.put<ApiProject>(`/students/me/projects/${projectId}`, data);
    return throwIfError(res);
  },

  deleteProject: async (projectId: string): Promise<void> => {
    const res = await apiClient.delete<{ message: string }>(`/students/me/projects/${projectId}`);
    throwIfError(res);
  },

  // ── Certifications ──
  getCertifications: async (): Promise<ApiCertification[]> => {
    const res = await apiClient.get<{ certifications: ApiCertification[] }>('/students/me/certifications');
    return throwIfError(res).certifications;
  },

  createCertification: async (data: CreateCertificationInput): Promise<ApiCertification> => {
    const res = await apiClient.post<ApiCertification>('/students/me/certifications', data);
    return throwIfError(res, 201);
  },

  uploadCertificationDocument: async (file: File): Promise<StudentDocumentUpload> => {
    const formData = new FormData();
    formData.append('file', file);

    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    const token = (await import('./apiClient')).tokenManager.getAccessToken();

    const response = await fetch(`${baseUrl}/students/me/certification-documents`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const parsed = parseApiErrorEnvelope(errBody, 'Upload failed');
      throw new StudentApiError(parsed.message, response.status, parsed.code, parsed.details);
    }

    return response.json();
  },

  deleteCertification: async (certId: string): Promise<void> => {
    const res = await apiClient.delete<{ message: string }>(`/students/me/certifications/${certId}`);
    throwIfError(res);
  },

  // ── Employment (multiple entries) ──
  getEmployments: async (): Promise<ApiEmployment[]> => {
    const res = await apiClient.get<{ employments: ApiEmployment[] }>('/students/me/employments');
    return throwIfError(res).employments;
  },

  // Add requires a mandatory offer-letter document.
  createEmployment: async (data: CreateEmploymentInput, file: File): Promise<ApiEmployment> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('employment_type', data.employment_type);
    formData.append('company_name', data.company_name);
    formData.append('designation', data.designation);
    if (data.package_lpa != null) formData.append('package_lpa', String(data.package_lpa));

    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    const token = (await import('./apiClient')).tokenManager.getAccessToken();

    const response = await fetch(`${baseUrl}/students/me/employments`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const parsed = parseApiErrorEnvelope(errBody, 'Unable to add employment');
      throw new StudentApiError(parsed.message, response.status, parsed.code, parsed.details);
    }

    return response.json();
  },

  deleteEmployment: async (id: string): Promise<void> => {
    const res = await apiClient.delete<{ message: string }>(`/students/me/employments/${id}`);
    throwIfError(res);
  },

  // Close an employment — the completion-proof document is mandatory.
  closeEmployment: async (id: string, file: File): Promise<ApiEmployment> => {
    const formData = new FormData();
    formData.append('file', file);

    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    const token = (await import('./apiClient')).tokenManager.getAccessToken();

    const response = await fetch(`${baseUrl}/students/me/employments/${id}/close`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const parsed = parseApiErrorEnvelope(errBody, 'Unable to close employment');
      throw new StudentApiError(parsed.message, response.status, parsed.code, parsed.details);
    }

    return response.json();
  },

  // ── Resumes ──
  getResumes: async (): Promise<ApiResume[]> => {
    const res = await apiClient.get<{ resumes: ApiResume[] }>('/students/me/resumes');
    return throwIfError(res).resumes;
  },

  uploadResume: async (file: File, name?: string): Promise<ApiResume> => {
    const formData = new FormData();
    formData.append('file', file);
    if (name) formData.append('name', name);

    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    const token = (await import('./apiClient')).tokenManager.getAccessToken();

    const response = await fetch(`${baseUrl}/students/me/resumes`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const parsed = parseApiErrorEnvelope(errBody, 'Upload failed');
      throw new StudentApiError(parsed.message, response.status, parsed.code, parsed.details);
    }

    return response.json();
  },

  setDefaultResume: async (resumeId: string): Promise<void> => {
    const res = await apiClient.put<{ message: string }>(`/students/me/resumes/${resumeId}/default`, {});
    throwIfError(res);
  },

  deleteResume: async (resumeId: string): Promise<void> => {
    const res = await apiClient.delete<{ message: string }>(`/students/me/resumes/${resumeId}`);
    throwIfError(res);
  },

  // ── Policy Acceptance ──
  acceptPolicy: async (data: PolicyAcceptanceInput): Promise<{ message: string }> => {
    const res = await apiClient.post<{ message: string }>('/students/me/policy-acceptance', data);
    return throwIfError(res);
  },

  // ── Interest Registration ──
  getInterests: async (): Promise<ApiInterest[]> => {
    const res = await apiClient.get<{ interests: ApiInterest[] }>('/students/me/interests');
    return throwIfError(res).interests;
  },

  registerInterests: async (data: InterestRegistrationInput): Promise<ApiInterest[]> => {
    const res = await apiClient.post<{ interests: ApiInterest[] }>('/students/me/interests', data);
    return throwIfError(res).interests;
  },

  // ── Placement preferences (opt-out) ──
  getPlacementPreferences: async (): Promise<PlacementPreferences> => {
    const res = await apiClient.get<PlacementPreferences>('/students/me/placement-preferences');
    return throwIfError(res);
  },

  updateGlobalPlacementOptOut: async (data: GlobalPlacementOptOutInput): Promise<PlacementPreferences> => {
    const res = await apiClient.put<PlacementPreferences>('/students/me/placement-preferences/global', data);
    return throwIfError(res);
  },

  updatePostingTypePreference: async (data: PostingTypePreferenceInput): Promise<PlacementPreferences> => {
    const res = await apiClient.put<PlacementPreferences>('/students/me/placement-preferences/posting-type', data);
    return throwIfError(res);
  },
};

// ── Combined export (mock + API) ───────────────────────

export const studentService = {
  // Real API methods
  ...studentApi,

  // Legacy mock methods (for components not yet migrated)
  getCurrentStudent: async (): Promise<StudentMaster> => mockStudent,
  getAcademicProfile: async (studentId: string): Promise<AcademicProfile> => mockAcademicProfile,
  getSkillsProfile: async (studentId: string): Promise<SkillsProfile> => mockSkillsProfile,
  getLegacyProjects: async (studentId: string): Promise<Project[]> => mockProjects,
  getLegacyResumes: async (studentId: string): Promise<Resume[]> => mockResumes,
  getLegacyInterests: async (studentId: string): Promise<InterestRegistration[]> => mockInterests,
  getEligibilityChecks: async (studentId: string): Promise<EligibilityCheck[]> => mockEligibilityChecks,
  getReadinessChecklist: async (studentId: string): Promise<CareerReadinessItem[]> => mockReadinessChecklist,
  getCurrentEmployment: async (studentId: string): Promise<CurrentEmployment> => mockCurrentEmployment,

  // Admin student management (mock for now)
  getAllStudents: async () => mockAllStudents,
  getAdminStats: async () => mockAdminStats,
  getInterestSummary: async () => mockInterestSummary,
  getEligibilityRules: async (): Promise<EligibilityRule[]> => mockEligibilityRules,

  // Student pool (mock for now)
  getStudentPool: async () => fullStudentPool,
  getEligibleStudents: async (branches: string[], batchYears: string[], minCgpa: number, maxBacklogs: number) =>
    getEligibleStudentsForOpportunity(branches, batchYears, minCgpa, maxBacklogs),

  // Options (for dropdowns)
  getDepartments: () => departments,
  getInstitutes: () => instituteOptions,
  getCourses: () => courseOptions,
  getSkillOptions: () => skillOptions,
  getDomainOptions: () => domainOptions,
  getLocationOptions: () => locationOptions,
};

export { StudentApiError };
