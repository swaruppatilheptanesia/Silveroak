export type PortfolioStatus = 'draft' | 'published';

export interface Portfolio {
  id: string;
  student_id: string;
  student_name: string;
  enrollment_number: string;
  department: string;
  batch: string;
  status: PortfolioStatus;
  project_count: number;
  internship_count: number;
  last_updated: string;
  created_at: string;
}

export interface PortfolioProject {
  id: string;
  portfolio_id?: string | null;
  title: string;
  description: string | null;
  technologies: string[];
  keywords: string[];
  role?: string | null;
  start_date: string;
  end_date?: string;
  is_ongoing: boolean;
  project_url?: string;
  github_url?: string;
  live_url?: string | null;
  attachments?: PortfolioAttachment[];
  display_order?: number;
}

export interface InternshipShowcase {
  id: string;
  portfolio_id: string;
  linked_internship_id?: string;
  company_name: string;
  role: string;
  duration_months: number;
  start_date: string;
  end_date?: string;
  key_outcomes: string[];
  proof_url?: string;
  is_verified: boolean;
}

export interface PortfolioAttachment {
  id: string;
  name: string;
  type: 'document' | 'media' | 'link';
  url: string;
  file_size?: number;
  uploaded_at: string;
}

// ── API Response Types (match backend) ─────────────────

export type ApiPortfolioStatus = 'draft' | 'published' | 'archived';

export interface ApiPortfolioProject {
  id: string;
  title: string;
  description: string | null;
  role: string | null;
  technologies: string[];
  keywords: string[];
  github_url: string | null;
  live_url: string | null;
  start_date: string | null;
  end_date: string | null;
  is_ongoing: boolean;
  attachments: unknown[];
  display_order: number;
  portfolio_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiInternshipShowcase {
  id: string;
  company_name: string;
  role: string;
  duration_months: number | null;
  start_date: string | null;
  end_date: string | null;
  key_outcomes: string[];
  proof_url: string | null;
  is_verified: boolean;
  linked_internship_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiPortfolio {
  id: string;
  student_id: string;
  status: ApiPortfolioStatus;
  project_count: number;
  internship_count: number;
  projects: ApiPortfolioProject[];
  showcases: ApiInternshipShowcase[];
  created_at: string;
  updated_at: string;
}

export type ApiStudentPortfolioStatus = ApiPortfolioStatus | 'missing';

export interface ApiPortfolioStudentSummary {
  id: string;
  full_name: string;
  enrollment_number: string;
  department: string;
  batch: string;
}

export interface ApiStudentPortfolioView {
  status: ApiStudentPortfolioStatus;
  student: ApiPortfolioStudentSummary;
  portfolio: ApiPortfolio | null;
}

// ── Input Types ────────────────────────────────────────

export interface UpdatePortfolioStatusInput {
  status: ApiPortfolioStatus;
}

export interface CreatePortfolioProjectInput {
  title: string;
  description?: string | null;
  role?: string | null;
  technologies?: string[];
  keywords?: string[];
  github_url?: string | null;
  live_url?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  is_ongoing?: boolean;
  display_order?: number;
}

export type UpdatePortfolioProjectInput = Partial<CreatePortfolioProjectInput>;

export interface CreateShowcaseInput {
  company_name: string;
  role: string;
  duration_months?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  key_outcomes?: string[];
  proof_url?: string | null;
  linked_internship_id?: string | null;
}
