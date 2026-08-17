import type { ApplicationStage } from './application';

// Module 16: Reports & Dashboard Types

export interface DashboardStats {
  students: { total: number };
  companies: { total: number };
  postings: { total: number; active: number };
  applications: { total: number };
  offers: { total: number; accepted: number };
  events: { total: number };
}

export interface PlacementStats {
  placed: number;
  unplaced: number;
  offers_by_type: Array<{
    type: string;
    count: number;
  }>;
}

export interface ApplicationPipelineStats {
  pipeline: Array<{
    stage: ApplicationStage | string;
    count: number;
  }>;
}

export interface CompanyWiseStats {
  companies: Array<{
    id: string;
    name: string;
    classification: string | null;
    postings_count: number;
    offers_count: number;
    engagements_count: number;
  }>;
}

export interface DepartmentWiseStats {
  departments: Array<{
    department: string;
    count: number;
  }>;
}

export interface ProfileCompletionStats {
  profile_completion: Array<{
    range: string;
    count: number;
  }>;
}

export interface PlacementCellReportPosting {
  posting_id: string;
  posting_title: string;
  company_id: string;
  company_name: string;
  posting_type: string;
  eligible_students: number;
  registered_students: number;
  placed_students: number;
  joined_students: number;
  noc_issued: number;
  highest_ctc: number | null;
  average_ctc: number | null;
  highest_internship_stipend: number | null;
  average_internship_stipend: number | null;
  selected_rate: number;
  joined_rate: number;
}

export interface PlacementCellReportSummary {
  eligible_students: number;
  registered_students: number;
  placed_students: number;
  joined_students: number;
  noc_issued: number;
  job_postings: number;
  highest_ctc: number | null;
  average_ctc: number | null;
  highest_internship_stipend: number | null;
  average_internship_stipend: number | null;
  eligible_to_registered_rate: number;
  eligible_to_placed_rate: number;
  registered_to_placed_rate: number;
  placed_to_joined_rate: number;
  placed_to_noc_rate: number;
}

export interface PlacementCellReport {
  summary: PlacementCellReportSummary;
  postings: PlacementCellReportPosting[];
}
