export type CircularTemplateType = 'placement' | 'internship' | 'stipend_internship' | 'nep_internship';
export type CircularTemplateStatus = 'draft' | 'active' | 'archived';

export interface CircularTemplateField {
  id: string;
  label: string;
  placeholder: string;
  section: string;
  required: boolean;
  type: 'text' | 'textarea' | 'date' | 'currency' | 'list';
  helpText?: string;
  defaultValue?: string;
}

export interface CircularTemplate {
  id: string;
  name: string;
  type: CircularTemplateType;
  status: CircularTemplateStatus;
  version: number;
  fields: CircularTemplateField[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
  lastUsedAt?: string;
}

export interface GeneratedCircular {
  id: string;
  templateId: string;
  templateName: string;
  templateType: CircularTemplateType;
  companyName: string;
  roleName: string;
  linkedPostingId?: string;
  linkedDriveId?: string;
  fieldValues: Record<string, string>;
  generatedBy: string;
  generatedAt: string;
}

export const CIRCULAR_TYPE_LABELS: Record<CircularTemplateType, string> = {
  placement: 'Placement',
  internship: 'Internship',
  stipend_internship: 'Stipend Internship',
  nep_internship: 'NEP Internship',
};

export const CIRCULAR_STATUS_LABELS: Record<CircularTemplateStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  archived: 'Archived',
};

export const TEMPLATE_SECTIONS = [
  'Company Details',
  'Role & Profile',
  'Eligibility Criteria',
  'Compensation',
  'Selection Process',
  'Schedule & Venue',
  'Bond Policy',
  'Instructions & Notes',
] as const;

export type ApiCircularTemplateType = 'placement' | 'internship' | 'campus_drive' | 'general';
export type ApiCircularTemplateStatus = 'draft' | 'active' | 'archived';

export interface ApiCircularAuthor {
  id: string;
  name: string | null;
}

export interface ApiTemplateListItem {
  id: string;
  name: string;
  type: ApiCircularTemplateType;
  status: ApiCircularTemplateStatus;
  sections: unknown[];
  version: string | null;
  used_count: number;
  created_at: string;
  updated_at: string;
  created_by_user?: ApiCircularAuthor | null;
}

export interface ApiTemplateDetail extends ApiTemplateListItem {
  created_by: string | null;
}

export interface ApiGeneratedCircularTemplate {
  id: string;
  name: string;
  type: ApiCircularTemplateType;
  status: ApiCircularTemplateStatus;
  version: string | null;
  sections: unknown[];
}

export interface ApiGeneratedCircular {
  id: string;
  company_name: string;
  role_name: string;
  type: string | null;
  field_values: Record<string, unknown>;
  template: ApiGeneratedCircularTemplate | null;
  company: { id: string; name: string };
  generated_by?: string | null;
  generated_by_user?: ApiCircularAuthor | null;
  created_at: string;
}

export interface PaginatedTemplates {
  data: ApiTemplateListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext?: boolean;
    hasPrev?: boolean;
  };
}

export interface TemplateQueryParams {
  status?: ApiCircularTemplateStatus;
  type?: ApiCircularTemplateType;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface CreateTemplateInput {
  name: string;
  type: ApiCircularTemplateType;
  sections?: unknown[];
}

export interface UpdateTemplateInput extends Partial<CreateTemplateInput> {
  status?: ApiCircularTemplateStatus;
  version?: string;
}

export interface GenerateCircularInput {
  template_id?: string | null;
  company_id: string;
  company_name: string;
  role_name: string;
  type: string;
  field_values?: Record<string, unknown>;
}
