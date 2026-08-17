// Module 13: Policy Management Types

// ── API Response Types (match backend) ─────────────────

export interface ApiPolicyListItem {
  id: string;
  title: string;
  category: string;
  description: string | null;
  version: string;
  effective_date: string | null;
  target_institutes: string[];
  target_branches: string[];
  target_courses: string[];
  document_url: string | null;
  document_name: string | null;
  document_mime_type: string | null;
  document_size: number | null;
  posting_type_master_id?: string | null;
  posting_type_master?: { id: string; value: string } | null;
  updated_by: string | null;
  accepted_current?: boolean;
  accepted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiPolicyDetail extends ApiPolicyListItem {
  content: string;
}

export interface PaginatedPolicies {
  data: ApiPolicyListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// ── Query Parameters ───────────────────────────────────

export interface PolicyQueryParams {
  category?: string;
  /** When true, restrict to global policies (no posting-type link). */
  global?: boolean;
  /** When set, restrict to policies linked to this posting type (student-readable). */
  posting_type_master_id?: string;
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

// ── Input Types ────────────────────────────────────────

export interface CreatePolicyInput {
  title: string;
  category: string;
  content: string;
  description?: string | null;
  version?: string;
  effective_date?: string | null;
  target_institutes?: string[];
  target_branches?: string[];
  target_courses?: string[];
  document_url?: string | null;
  document_name?: string | null;
  document_mime_type?: string | null;
  document_size?: number | null;
  /** Optional posting-type link. '' / null = global policy. */
  posting_type_master_id?: string | null;
}

export type UpdatePolicyInput = Partial<CreatePolicyInput>;

export interface PolicyAudienceOption {
  id: number;
  name: string;
}

export interface PolicyDocumentUpload {
  document_url: string;
  document_name: string;
  document_mime_type: string;
  document_size: number;
}
