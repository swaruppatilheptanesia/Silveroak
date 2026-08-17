import type { MasterCategory } from '@/types/master';

export interface ApiNocTemplatePostingType {
  id: string;
  value: string;
  category: Extract<MasterCategory, 'posting_type'>;
  is_active: boolean;
}

export interface ApiNocTemplateAuthor {
  id: string;
  name: string | null;
}

export interface ApiNocTemplate {
  id: string;
  tenant_id: string;
  posting_type_master_id: string;
  branch_scope: string;
  name: string;
  subject: string;
  body_html: string;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
  posting_type_master: ApiNocTemplatePostingType;
  created_by_user?: ApiNocTemplateAuthor | null;
  updated_by_user?: ApiNocTemplateAuthor | null;
}

export interface UpsertNocTemplateInput {
  name: string;
  subject: string;
  body_html: string;
  branch_scope?: string | null;
}

export interface NocTemplatePreviewValues {
  reference_number: string;
  date: string;
  contact_person_name: string;
  contact_person_designation?: string;
  student_name: string;
  enrollment_number: string;
  branch: string;
  semester: string;
  batch?: string;
  course?: string;
  institute?: string;
  program_label: string;
  company_name: string;
  company_address?: string;
  company_city?: string;
  company_state?: string;
  company_pincode?: string;
  role_title?: string;
  duration_from: string;
  duration_to: string;
}
