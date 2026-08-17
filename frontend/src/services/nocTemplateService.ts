import { apiClient } from './apiClient';
import { parseApiErrorEnvelope, type ApiErrorDetail } from '@/lib/apiError';
import type { ApiNocTemplate, UpsertNocTemplateInput } from '@/types/nocTemplate';

export type NocTemplateApiErrorDetail = ApiErrorDetail;

class NocTemplateApiError extends Error {
  status: number;
  code: string;
  details: NocTemplateApiErrorDetail[];

  constructor(message: string, status: number, code: string, details: NocTemplateApiErrorDetail[] = []) {
    super(message);
    this.name = 'NocTemplateApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function throwIfError<T>(res: { data: T; error: string | null; status: number }, successStatus = 200): T {
  if (res.status !== successStatus || res.error) {
    const parsed = parseApiErrorEnvelope(res.data, res.error ?? undefined);
    throw new NocTemplateApiError(parsed.message, res.status, parsed.code, parsed.details);
  }

  return res.data;
}

export const nocTemplateService = {
  getNocTemplates: async (): Promise<ApiNocTemplate[]> => {
    const res = await apiClient.get<ApiNocTemplate[]>('/noc/templates');
    return throwIfError(res);
  },

  getAdminNocTemplates: async (): Promise<ApiNocTemplate[]> => {
    const res = await apiClient.get<ApiNocTemplate[]>('/admin/masters/noc-templates');
    return throwIfError(res);
  },

  getAdminNocTemplate: async (postingTypeMasterId: string): Promise<ApiNocTemplate> => {
    const res = await apiClient.get<ApiNocTemplate>(`/admin/masters/noc-templates/${postingTypeMasterId}`);
    return throwIfError(res);
  },

  upsertAdminNocTemplate: async (postingTypeMasterId: string, data: UpsertNocTemplateInput): Promise<ApiNocTemplate> => {
    const res = await apiClient.put<ApiNocTemplate>(`/admin/masters/noc-templates/${postingTypeMasterId}`, data);
    return throwIfError(res);
  },
};

export { NocTemplateApiError };
