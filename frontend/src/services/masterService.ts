import { apiClient } from './apiClient';
import { parseApiErrorEnvelope, type ApiErrorDetail } from '@/lib/apiError';
import type {
  AdminMasterQueryParams,
  ApiMasterOption,
  CreateMasterInput,
  MasterQueryParams,
  UpdateMasterInput,
} from '@/types/master';

class MasterApiError extends Error {
  status: number;
  code: string;
  details: ApiErrorDetail[];

  constructor(message: string, status: number, code: string, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = 'MasterApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function throwIfError<T>(res: { data: T; error: string | null; status: number }, successStatus = 200): T {
  if (res.status !== successStatus || res.error) {
    const parsed = parseApiErrorEnvelope(res.data, res.error ?? undefined);
    throw new MasterApiError(parsed.message, res.status, parsed.code, parsed.details);
  }

  return res.data;
}

function toQueryString(params: Record<string, unknown>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

export const masterService = {
  getMasters: async (params: MasterQueryParams = {}): Promise<ApiMasterOption[]> => {
    const res = await apiClient.get<{ data: ApiMasterOption[] }>(`/masters${toQueryString(params)}`);
    return throwIfError(res).data;
  },

  getAdminMasters: async (params: AdminMasterQueryParams = {}): Promise<ApiMasterOption[]> => {
    const res = await apiClient.get<{ data: ApiMasterOption[] }>(`/admin/masters${toQueryString(params)}`);
    return throwIfError(res).data;
  },

  createAdminMaster: async (data: CreateMasterInput): Promise<ApiMasterOption> => {
    const res = await apiClient.post<ApiMasterOption>('/admin/masters', data);
    return throwIfError(res, 201);
  },

  updateAdminMaster: async (masterId: string, data: UpdateMasterInput): Promise<ApiMasterOption> => {
    const res = await apiClient.put<ApiMasterOption>(`/admin/masters/${masterId}`, data);
    return throwIfError(res);
  },

  deleteAdminMaster: async (masterId: string): Promise<{ message: string }> => {
    const res = await apiClient.delete<{ message: string }>(`/admin/masters/${masterId}`);
    return throwIfError(res);
  },
};

export { MasterApiError };
