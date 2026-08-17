// ── API Response Types (match backend) ─────────────────

export interface ApiCompany {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
  address: string | null;
  description: string | null;
  status: 'active' | 'inactive';
  classification: 'preferred' | 'normal' | 'blacklisted';
  internal_remarks: string | null;
  tenant_id: string;
  created_at: string;
}

export interface ApiCompanyDetail extends ApiCompany {
  _count: {
    recruiters: number;
    engagements: number;
    postings: number;
    offers: number;
  };
}

export interface ApiRecruiter {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  designation: string | null;
  verification_status: 'pending' | 'verified' | 'rejected';
  verified_by: string | null;
  verified_at: string | null;
  company_id: string;
  created_at: string;
}

export interface ApiRecruiterListItem extends ApiRecruiter {
  company: {
    id: string;
    name: string;
  };
}

export interface ApiEngagement {
  id: string;
  visitor_type: 'placement' | 'internship' | 'campus_visit' | 'guest_lecture' | 'workshop';
  date: string;
  remarks: string | null;
  students_hired: number | null;
  packages_offered: string | null;
  academic_year: string | null;
  company_id: string;
  created_at: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ── Input Types ────────────────────────────────────────

export interface CompanyQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: 'name' | 'industry' | 'status' | 'classification' | 'created_at';
  sort_order?: 'asc' | 'desc';
  status?: 'active' | 'inactive';
  classification?: 'preferred' | 'normal' | 'blacklisted';
  // FILTER COUNTER EXPORT — sector/industry + date range (created_at)
  industry?: string;
  date_from?: string;
  date_to?: string;
}

export interface RecruiterQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: 'name' | 'email' | 'verification_status' | 'company' | 'created_at';
  sort_order?: 'asc' | 'desc';
  verification_status?: 'pending' | 'verified' | 'rejected';
  company_id?: string;
}

export interface CreateCompanyInput {
  name: string;
  industry?: string | null;
  website?: string | null;
  address?: string | null;
  description?: string | null;
}

export interface UpdateCompanyInput extends Partial<CreateCompanyInput> {
  status?: 'active' | 'inactive';
}

export interface ClassifyCompanyInput {
  classification: 'preferred' | 'normal' | 'blacklisted';
  internal_remarks?: string | null;
}

export interface CreateRecruiterInput {
  name: string;
  email: string;
  phone?: string | null;
  designation?: string | null;
}

export interface CreateRecruiterResponse {
  recruiter: ApiRecruiter;
  temporary_password: string;
}

export interface UpdateRecruiterInput {
  name?: string;
  phone?: string | null;
  designation?: string | null;
}

export interface VerifyRecruiterInput {
  status: 'verified' | 'rejected';
}

export interface CreateEngagementInput {
  visitor_type: 'placement' | 'internship' | 'campus_visit' | 'guest_lecture' | 'workshop';
  date: string;
  remarks?: string | null;
  students_hired?: number;
  packages_offered?: string | null;
  academic_year?: string | null;
}

export interface ImportCompaniesResult {
  file_name: string;
  created_count: number;
  created_recruiter_count?: number;
  skipped_duplicate_count: number;
  skipped_invalid_row_count: number;
  skipped_duplicates: string[];
  skipped_invalid_rows: number[];
  skipped_duplicate_recruiter_count?: number;
  skipped_invalid_recruiter_row_count?: number;
  skipped_duplicate_recruiters?: string[];
  skipped_invalid_recruiter_rows?: number[];
}
