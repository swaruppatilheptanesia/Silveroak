import type { ApiEngagement } from '@/types/employer';

// Module 17: Recruiter Portal Types
// All student responses have PII stripped (no email, mobile, DOB, address)

export type RecruiterVerificationStatus = 'pending' | 'verified' | 'rejected';

export interface RecruiterSummary {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  designation: string | null;
  verification_status: RecruiterVerificationStatus;
  verified_at: string | null;
}

export interface RecruiterCompanySummary {
  id: string;
  name: string;
  industry: string | null;
  website: string | null;
}

export interface RecruiterDashboard {
  recruiter: RecruiterSummary;
  company: RecruiterCompanySummary;
  stats: {
    active_postings: number;
    total_applications: number;
    total_offers: number;
  };
}

export interface RecruiterCompanyOverview {
  recruiter: RecruiterSummary;
  company: RecruiterCompanySummary & {
    address: string | null;
    description: string | null;
    status: 'active' | 'inactive';
    classification: 'preferred' | 'normal' | 'blacklisted';
  };
  recruiters: Array<RecruiterSummary & { company_id: string; created_at: string }>;
  engagements: ApiEngagement[];
  stats: {
    recruiters: number;
    engagements: number;
    postings: number;
    offers: number;
  };
}

export interface RecruiterPosting {
  id: string;
  title: string;
  type: string;
  role_name: string;
  location: string;
  work_mode: string;
  ctc: string | null;
  stipend: string | null;
  status: string;
  application_start_date: string | null;
  application_end_date: string | null;
  _count: { applications: number };
}

export interface RecruiterApplication {
  id: string;
  current_stage: string;
  applied_at: string;
  student: {
    id: string;
    full_name: string;
    enrollment_number: string;
    department: string;
    batch: string;
  };
}

export interface RecruiterProfileUpdateInput {
  phone?: string | null;
  designation?: string | null;
}
