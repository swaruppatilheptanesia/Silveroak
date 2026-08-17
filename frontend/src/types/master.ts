export type MasterCategory =
  | 'technology'
  | 'skill'
  | 'interest'
  | 'branch'
  | 'academic_year'
  | 'policy_category'
  | 'noc_type'
  | 'posting_type'
  | 'event_type';

export interface ApiMasterOption {
  id: string;
  category: MasterCategory;
  value: string;
  target_institutes: string[];
  target_courses: string[];
  target_branches: string[];
  target_semesters: string[];
  target_academic_years: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Present only on posting_type options: distinct companies that have had a
  // published/closed posting of this type.
  companies?: { id: string; name: string }[];
  // Present only on posting_type options: the "Application Receiving" toggle. When false the type
  // stays visible to students but Register/apply are blocked. Defaults true for pre-migration rows.
  accepting_applications?: boolean;
  // Present only on posting_type options from the ADMIN masters endpoint: dependent-record
  // counts behind the delete confirmation. `postings` > 0 means the delete is rejected
  // (FK is onDelete: Restrict); the rest are silent side effects of a successful delete.
  usage?: {
    postings: number;
    noc_templates: number;
    student_preferences: number;
    policies: number;
  };
}

export interface MasterQueryParams {
  category?: MasterCategory;
  /** Bypass student posting-type targeting (NOC wizard Self-Sourced program list). */
  all_targets?: boolean;
}

export interface AdminMasterQueryParams extends MasterQueryParams {
  include_inactive?: boolean;
}

export interface CreateMasterInput {
  category: MasterCategory;
  value: string;
  target_institutes?: string[];
  target_courses?: string[];
  target_branches?: string[];
  target_semesters?: string[];
  target_academic_years?: string[];
  is_active?: boolean;
  accepting_applications?: boolean;
}

export interface UpdateMasterInput {
  value?: string;
  target_institutes?: string[];
  target_courses?: string[];
  target_branches?: string[];
  target_semesters?: string[];
  target_academic_years?: string[];
  is_active?: boolean;
  accepting_applications?: boolean;
}
