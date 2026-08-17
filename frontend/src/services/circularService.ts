/**
 * Circular Service — templates, generated circulars.
 * Real API calls + mock data re-exports for gradual migration.
 */
import { apiClient } from './apiClient';
import { parseApiErrorEnvelope, type ApiErrorDetail } from '@/lib/apiError';
import type {
  ApiGeneratedCircular,
  ApiTemplateDetail,
  PaginatedTemplates,
  TemplateQueryParams,
  CreateTemplateInput,
  UpdateTemplateInput,
  GenerateCircularInput,
} from '@/types/circular';

import {
  mockCircularTemplates,
  mockGeneratedCirculars,
  defaultFieldsByType,
} from '@/data/mockCircularData';
import type { CircularTemplate, GeneratedCircular } from '@/types/circular';

export {
  mockCircularTemplates,
  mockGeneratedCirculars,
  defaultFieldsByType,
};

class CircularApiError extends Error {
  status: number;
  code: string;
  details: ApiErrorDetail[];

  constructor(message: string, status: number, code: string, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = 'CircularApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

interface RawPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
  total_pages?: number;
  hasNext?: boolean;
  has_next?: boolean;
  hasPrev?: boolean;
  has_prev?: boolean;
}

function throwIfError<T>(res: { data: T; error: string | null; status: number }, successStatus = 200): T {
  if (res.status !== successStatus || res.error) {
    const parsed = parseApiErrorEnvelope(res.data, res.error ?? undefined);
    throw new CircularApiError(parsed.message, res.status, parsed.code, parsed.details);
  }

  return res.data;
}

function toQueryString(params: TemplateQueryParams): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  }

  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

function normalizePagination(raw: RawPaginationMeta): PaginatedTemplates['pagination'] {
  return {
    page: raw.page,
    limit: raw.limit,
    total: raw.total,
    totalPages: raw.totalPages ?? raw.total_pages ?? 1,
    hasNext: raw.hasNext ?? raw.has_next ?? false,
    hasPrev: raw.hasPrev ?? raw.has_prev ?? false,
  };
}

const circularApi = {
  getTemplates: async (params: TemplateQueryParams = {}): Promise<PaginatedTemplates> => {
    const res = await apiClient.get<{ data: ApiTemplateDetail[]; pagination: RawPaginationMeta }>(
      `/circulars/templates${toQueryString(params)}`
    );
    const payload = throwIfError(res);

    return {
      data: payload.data,
      pagination: normalizePagination(payload.pagination),
    };
  },

  getTemplateDetail: async (templateId: string): Promise<ApiTemplateDetail> => {
    const res = await apiClient.get<ApiTemplateDetail>(`/circulars/templates/${templateId}`);
    return throwIfError(res);
  },

  createTemplate: async (data: CreateTemplateInput): Promise<ApiTemplateDetail> => {
    const res = await apiClient.post<ApiTemplateDetail>('/circulars/templates', data);
    return throwIfError(res, 201);
  },

  updateTemplate: async (templateId: string, data: UpdateTemplateInput): Promise<ApiTemplateDetail> => {
    const res = await apiClient.put<ApiTemplateDetail>(`/circulars/templates/${templateId}`, data);
    return throwIfError(res);
  },

  getGeneratedCirculars: async (): Promise<ApiGeneratedCircular[]> => {
    const res = await apiClient.get<{ circulars: ApiGeneratedCircular[] }>('/circulars/generated');
    return throwIfError(res).circulars;
  },

  getMyCirculars: async (): Promise<ApiGeneratedCircular[]> => {
    const res = await apiClient.get<{ circulars: ApiGeneratedCircular[] }>('/circulars/generated/my');
    return throwIfError(res).circulars;
  },

  generateCircular: async (data: GenerateCircularInput): Promise<ApiGeneratedCircular> => {
    const res = await apiClient.post<ApiGeneratedCircular>('/circulars/generate', data);
    return throwIfError(res, 201);
  },
};

export const circularService = {
  ...circularApi,

  getTemplatesLegacy: async (): Promise<CircularTemplate[]> => mockCircularTemplates,
  getTemplateByIdLegacy: async (id: string) => mockCircularTemplates.find((template) => template.id === id),
  getGeneratedCircularsLegacy: async (): Promise<GeneratedCircular[]> => mockGeneratedCirculars,
  getDefaultFieldsByType: (type: string) => defaultFieldsByType[type] || [],
};

export { CircularApiError };
