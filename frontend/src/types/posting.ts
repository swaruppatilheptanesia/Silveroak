import type { OfferStatus } from '@/types/offer';

// ── API Response Types (match backend) ─────────────────

export type ApiPostingType = string;
export type ApiPostingStatus = 'draft' | 'published' | 'closed';
export type ApiWorkMode = 'onsite' | 'remote' | 'hybrid';

export interface ApiPostingCompany {
  id: string;
  name: string;
  industry: string | null;
}

export interface ApiPostingOfferStudent {
  id: string;
  full_name: string;
  enrollment_number: string;
  department: string;
  batch: string;
  profile_photo_url: string | null;
}

export interface ApiPostingOffer {
  id: string;
  type: 'job' | 'internship';
  role: string;
  ctc: string | null;
  stipend: string | null;
  location: string | null;
  offer_date: string;
  status: OfferStatus;
  created_at: string;
  student: ApiPostingOfferStudent;
}

export interface ApiPostingListItem {
  id: string;
  title: string;
  type: ApiPostingType;
  posting_type_master_id: string;
  status: ApiPostingStatus;
  role_name: string;
  location: string;
  locations: string[];
  work_mode: ApiWorkMode;
  ctc: string | null;
  stipend: string | null;
  duration: string | null;
  min_cgpa: number;
  max_backlogs: number;
  target_institutes: string[];
  target_courses: string[];
  target_branches: string[];
  target_semesters: string[];
  eligible_branches: string[];
  eligible_batches: string[];
  job_description_pdf_url: string | null;
  job_description_pdf_urls: string[];
  job_description_pdf_names: string[];
  application_start_date: string | null;
  application_end_date: string | null;
  application_override_enabled: boolean;
  published_at: string | null;
  company: ApiPostingCompany;
  created_at: string;
  // Present in the list payload (the service spreads the full posting row); used by the export.
  academic_year: string;
  bond_details: string | null;
}

export interface ApiPostingDetail extends ApiPostingListItem {
  academic_year: string;
  role_description: string | null;
  bond_details: string | null;
  job_description_pdf_url: string | null;
  target_institutes: string[];
  target_courses: string[];
  target_branches: string[];
  target_semesters: string[];
  skill_requirements: string | null;
  has_written_test: boolean;
  written_test_details: string | null;
  has_gd: boolean;
  gd_details: string | null;
  technical_rounds: number;
  hr_rounds: number;
  additional_info: string | null;
  closed_at: string | null;
  offers: ApiPostingOffer[];
  application_override_enabled: boolean;
  _count: {
    applications: number;
    offers: number;
  };
}

export interface PaginatedPostings {
  data: ApiPostingListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ── Query Parameters ───────────────────────────────────

export interface PostingQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sort_by?: 'title' | 'company' | 'posting_type' | 'status' | 'created_at';
  sort_order?: 'asc' | 'desc';
  status?: ApiPostingStatus;
  posting_type_master_id?: string;
  company_id?: string;
  // FILTER COUNTER EXPORT — target-scope (institute/course/branch), academic year + date range
  institute?: string;
  course?: string;
  branch?: string;
  academic_year?: string;
  date_from?: string;
  date_to?: string;
}

// ── Input Types ────────────────────────────────────────

export interface CreatePostingInput {
  company_id: string;
  title: string;
  posting_type_master_id: string;
  academic_year: string;
  role_name: string;
  location: string;
  locations?: string[];
  work_mode: ApiWorkMode;
  ctc?: string | null;
  stipend?: string | null;
  duration?: string | null;
  bond_details?: string | null;
  role_description?: string | null;
  target_institutes?: string[];
  target_courses?: string[];
  target_branches?: string[];
  target_semesters?: string[];
  eligible_branches?: string[];
  eligible_batches?: string[];
  min_cgpa?: number;
  max_backlogs?: number;
  skill_requirements?: string | null;
  has_written_test?: boolean;
  written_test_details?: string | null;
  has_gd?: boolean;
  gd_details?: string | null;
  technical_rounds?: number;
  hr_rounds?: number;
  additional_info?: string | null;
  job_description_pdf_url?: string | null;
  job_description_pdf_urls?: string[];
  job_description_pdf_names?: string[];
  application_override_enabled?: boolean;
  application_start_date?: string | null;
  application_end_date?: string | null;
}

export type UpdatePostingInput = Partial<Omit<CreatePostingInput, 'company_id'>>;

export interface PublishPostingInput {
  application_start_date?: string;
  application_end_date?: string;
}

export interface RepublishPostingInput {
  application_start_date: string;
  application_end_date: string;
}
