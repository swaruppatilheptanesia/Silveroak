/**
 * Portfolio Service — student portfolio, projects, showcases.
 * Real API calls + mock data re-exports for gradual migration.
 */
import { apiClient, tokenManager } from './apiClient';
import { parseApiErrorEnvelope, type ApiErrorDetail } from '@/lib/apiError';
import type {
  ApiInternshipShowcase,
  ApiPortfolio,
  ApiPortfolioProject,
  ApiStudentPortfolioView,
  CreatePortfolioProjectInput,
  CreateShowcaseInput,
  UpdatePortfolioProjectInput,
  UpdatePortfolioStatusInput,
} from '@/types/portfolio';

import {
  mockPortfolios,
  mockPortfolioProjects,
  mockInternshipShowcases,
  getPortfolioByStudent,
  getPortfolioProjects,
  getInternshipShowcases,
  getPortfolioStats,
} from '@/data/mockPortfolioData';
import type { InternshipShowcase, Portfolio, PortfolioProject } from '@/types/portfolio';

export {
  mockPortfolios,
  mockPortfolioProjects,
  mockInternshipShowcases,
  getPortfolioByStudent,
  getPortfolioProjects,
  getInternshipShowcases,
  getPortfolioStats,
};

class PortfolioApiError extends Error {
  status: number;
  code: string;
  details: ApiErrorDetail[];

  constructor(message: string, status: number, code: string, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = 'PortfolioApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RawPortfolioProject {
  id: string;
  title: string;
  description?: string | null;
  role?: string | null;
  technologies?: unknown[];
  keywords?: unknown[];
  github_url?: string | null;
  live_url?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_ongoing?: boolean;
  attachments?: unknown[];
  display_order?: number;
  portfolio_id?: string | null;
  created_at: string;
  updated_at: string;
}

interface RawInternshipShowcase {
  id: string;
  company_name: string;
  role: string;
  duration_months?: number | string | null;
  start_date?: string | null;
  end_date?: string | null;
  key_outcomes?: unknown[];
  proof_url?: string | null;
  is_verified?: boolean;
  linked_internship_id?: string | null;
  created_at: string;
  updated_at: string;
}

interface ShowcaseProofUploadResponse {
  proof_url: string;
}

interface RawPortfolio {
  id: string;
  student_id: string;
  status: ApiPortfolio['status'];
  project_count?: number;
  internship_count?: number;
  projects?: RawPortfolioProject[];
  showcases?: RawInternshipShowcase[];
  created_at: string;
  updated_at: string;
}

interface RawStudentPortfolioView {
  status: ApiStudentPortfolioView['status'];
  student: {
    id: string;
    full_name: string;
    enrollment_number: string;
    department: string;
    batch: string;
  };
  portfolio?: RawPortfolio | null;
}

function throwIfError<T>(res: { data: T; error: string | null; status: number }, successStatus = 200): T {
  if (res.status !== successStatus || res.error) {
    const parsed = parseApiErrorEnvelope(res.data, res.error ?? undefined);
    throw new PortfolioApiError(parsed.message, res.status, parsed.code, parsed.details);
  }

  return res.data;
}

function normalizeProject(raw: RawPortfolioProject): ApiPortfolioProject {
  return {
    id: raw.id,
    title: raw.title,
    description: raw.description ?? null,
    role: raw.role ?? null,
    technologies: Array.isArray(raw.technologies) ? raw.technologies.map(String) : [],
    keywords: Array.isArray(raw.keywords) ? raw.keywords.map(String) : [],
    github_url: raw.github_url ?? null,
    live_url: raw.live_url ?? null,
    start_date: raw.start_date ?? null,
    end_date: raw.end_date ?? null,
    is_ongoing: Boolean(raw.is_ongoing),
    attachments: Array.isArray(raw.attachments) ? raw.attachments : [],
    display_order: typeof raw.display_order === 'number' ? raw.display_order : 0,
    portfolio_id: raw.portfolio_id ?? null,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
}

function normalizeShowcase(raw: RawInternshipShowcase): ApiInternshipShowcase {
  return {
    id: raw.id,
    company_name: raw.company_name,
    role: raw.role,
    duration_months: typeof raw.duration_months === 'number' ? raw.duration_months : raw.duration_months == null ? null : Number(raw.duration_months),
    start_date: raw.start_date ?? null,
    end_date: raw.end_date ?? null,
    key_outcomes: Array.isArray(raw.key_outcomes) ? raw.key_outcomes.map(String) : [],
    proof_url: raw.proof_url ?? null,
    is_verified: Boolean(raw.is_verified),
    linked_internship_id: raw.linked_internship_id ?? null,
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
}

function normalizePortfolio(raw: RawPortfolio): ApiPortfolio {
  return {
    id: raw.id,
    student_id: raw.student_id,
    status: raw.status,
    project_count: typeof raw.project_count === 'number' ? raw.project_count : 0,
    internship_count: typeof raw.internship_count === 'number' ? raw.internship_count : 0,
    projects: Array.isArray(raw.projects) ? raw.projects.map(normalizeProject) : [],
    showcases: Array.isArray(raw.showcases) ? raw.showcases.map(normalizeShowcase) : [],
    created_at: raw.created_at,
    updated_at: raw.updated_at,
  };
}

function normalizeStudentPortfolio(raw: RawStudentPortfolioView): ApiStudentPortfolioView {
  return {
    status: raw.status,
    student: {
      id: raw.student.id,
      full_name: raw.student.full_name,
      enrollment_number: raw.student.enrollment_number,
      department: raw.student.department,
      batch: raw.student.batch,
    },
    portfolio: raw.portfolio ? normalizePortfolio(raw.portfolio) : null,
  };
}

const portfolioApi = {
  getMyPortfolio: async (): Promise<ApiPortfolio> => {
    const res = await apiClient.get<RawPortfolio>('/portfolio/me');
    return normalizePortfolio(throwIfError(res));
  },

  getStudentPortfolio: async (studentId: string): Promise<ApiStudentPortfolioView> => {
    const res = await apiClient.get<RawStudentPortfolioView>(`/portfolio/${studentId}`);
    return normalizeStudentPortfolio(throwIfError(res));
  },

  updateStatus: async (data: UpdatePortfolioStatusInput): Promise<ApiPortfolio> => {
    const res = await apiClient.put<RawPortfolio>('/portfolio/me/status', data);
    return normalizePortfolio(throwIfError(res));
  },

  addProject: async (data: CreatePortfolioProjectInput): Promise<ApiPortfolioProject> => {
    const res = await apiClient.post<RawPortfolioProject>('/portfolio/me/projects', data);
    return normalizeProject(throwIfError(res, 201));
  },

  updateProject: async (projectId: string, data: UpdatePortfolioProjectInput): Promise<ApiPortfolioProject> => {
    const res = await apiClient.put<RawPortfolioProject>(`/portfolio/me/projects/${projectId}`, data);
    return normalizeProject(throwIfError(res));
  },

  deleteProject: async (projectId: string): Promise<void> => {
    const res = await apiClient.delete<{ message: string }>(`/portfolio/me/projects/${projectId}`);
    throwIfError(res);
  },

  addShowcase: async (data: CreateShowcaseInput): Promise<ApiInternshipShowcase> => {
    const res = await apiClient.post<RawInternshipShowcase>('/portfolio/me/showcases', data);
    return normalizeShowcase(throwIfError(res, 201));
  },

  uploadShowcaseProof: async (file: File): Promise<ShowcaseProofUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api';
    const token = tokenManager.getAccessToken();
    const response = await fetch(`${baseUrl}/portfolio/me/showcases/proof`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      const parsed = parseApiErrorEnvelope(errBody, 'Upload failed');
      throw new PortfolioApiError(parsed.message, response.status, parsed.code, parsed.details);
    }

    return response.json();
  },

  deleteShowcase: async (showcaseId: string): Promise<void> => {
    const res = await apiClient.delete<{ message: string }>(`/portfolio/me/showcases/${showcaseId}`);
    throwIfError(res);
  },
};

export const portfolioService = {
  ...portfolioApi,

  getPortfoliosLegacy: async (): Promise<Portfolio[]> => mockPortfolios,
  getPortfolioByStudentLegacy: async (studentId: string) => getPortfolioByStudent(studentId),
  getPortfolioProjectsLegacy: async (portfolioId: string): Promise<PortfolioProject[]> => getPortfolioProjects(portfolioId),
  getInternshipShowcasesLegacy: async (portfolioId: string): Promise<InternshipShowcase[]> => getInternshipShowcases(portfolioId),
  getStatsLegacy: async () => getPortfolioStats(),
};

export { PortfolioApiError };
