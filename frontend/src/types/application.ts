// Application & Workflow (ATS) Type Definitions

export type ApplicationStage = 
  | 'applied'
  | 'mock_round'
  | 'shortlisted'
  | 'test_scheduled'
  | 'interview'
  | 'hr_round'
  | 'offer_released'
  | 'rejected';

export type MockRoundResult = 'pending' | 'passed' | 'failed';

export interface Application {
  id: string;
  student_id: string;
  student_name: string;
  enrollment_number: string;
  email: string;
  department: string;
  batch: string;
  cgpa: number;
  tenth_percentage: number;
  twelfth_percentage?: number;
  posting_id: string;
  posting_title: string;
  company_id: string;
  company_name: string;
  resume_id: string;
  resume_name: string;
  current_stage: ApplicationStage;
  mock_round_result?: MockRoundResult;
  applied_at: string;
  last_updated_at: string;
  last_updated_by: string;
}

export interface ApplicationStageHistory {
  id: string;
  application_id: string;
  from_stage: ApplicationStage | null;
  to_stage: ApplicationStage;
  changed_at: string;
  changed_by: string;
  remarks?: string;
}

export interface RecruiterFeedback {
  id: string;
  application_id: string;
  recruiter_id: string;
  recruiter_name: string;
  feedback_type: 'shortlisted' | 'rejected' | 'under_consideration';
  remarks?: string;
  created_at: string;
}

// Stage configuration for UI
export const APPLICATION_STAGE_CONFIG: Record<ApplicationStage, {
  label: string;
  color: string;
  description: string;
  order: number;
}> = {
  applied: {
    label: 'Applied',
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    description: 'Application submitted',
    order: 1,
  },
  mock_round: {
    label: 'Mock Round',
    color: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    description: 'Awaiting mock interview',
    order: 2,
  },
  shortlisted: {
    label: 'Shortlisted',
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    description: 'Shared with company',
    order: 3,
  },
  test_scheduled: {
    label: 'Test Scheduled',
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    description: 'Written test scheduled',
    order: 4,
  },
  interview: {
    label: 'Interview',
    color: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
    description: 'Technical interview stage',
    order: 5,
  },
  hr_round: {
    label: 'HR Round',
    color: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
    description: 'HR interview stage',
    order: 6,
  },
  offer_released: {
    label: 'Offer Released',
    color: 'bg-green-500/10 text-green-600 border-green-500/20',
    description: 'Offer extended',
    order: 7,
  },
  rejected: {
    label: 'Rejected',
    color: 'bg-red-500/10 text-red-600 border-red-500/20',
    description: 'Not selected',
    order: 8,
  },
};

export const MOCK_ROUND_RESULT_CONFIG: Record<MockRoundResult, {
  label: string;
  color: string;
}> = {
  pending: {
    label: 'Pending',
    color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  },
  passed: {
    label: 'Passed',
    color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  },
  failed: {
    label: 'Failed',
    color: 'bg-red-500/10 text-red-600 border-red-500/20',
  },
};

export const PIPELINE_STAGES: ApplicationStage[] = [
  'applied',
  'mock_round',
  'shortlisted',
  'test_scheduled',
  'interview',
  'hr_round',
  'offer_released',
];

// Helper to get visible stages for recruiters (they only see post-shortlist stages)
export const RECRUITER_VISIBLE_STAGES: ApplicationStage[] = [
  'shortlisted',
  'test_scheduled',
  'interview',
  'hr_round',
  'offer_released',
  'rejected',
];

// ── API Response Types (match backend) ─────────────────

export interface ApiApplicationCreated {
  id: string;
  student_id: string;
  posting_id: string;
  current_stage: ApplicationStage;
  resume_id: string | null;
  applied_at: string;
}

export interface ApiMyApplication {
  id: string;
  current_stage: ApplicationStage;
  applied_at: string;
  mock_round_result: MockRoundResult | null;
  posting: {
    id: string;
    title: string;
    type: string;
    status: string;
    company: {
      name: string;
    };
  };
}

export interface ApiApplicationListItem {
  id: string;
  current_stage: ApplicationStage;
  applied_at: string;
  mock_round_result: MockRoundResult | null;
  student: {
    id: string;
    full_name: string;
    enrollment_number: string;
    roll_number: string | null;
    email: string;
    mobile: string | null;
    department: string;
    batch: string;
    course: string | null;
    institute: string | null;
    current_semester: string | null;
    academic_profile: {
      cgpa: number | string | null;
      tenth_percentage: number | string | null;
      twelfth_percentage: number | string | null;
      semester: number | string | null;
    } | null;
  };
  posting: {
    id: string;
    title: string;
    type: string;
    company: {
      name: string;
    };
  };
  resume_url?: string | null;
}

export interface ApiStageHistoryEntry {
  id: string;
  from_stage: ApplicationStage | null;
  to_stage: ApplicationStage;
  remarks: string | null;
  changed_by: string;
  changed_at: string;
}

export interface ApiApplicationDetail {
  id: string;
  current_stage: ApplicationStage;
  applied_at: string;
  mock_round_result: MockRoundResult | null;
  student: {
    id: string;
    full_name: string;
    enrollment_number: string;
    department: string;
    batch: string;
  };
  posting: {
    id: string;
    title: string;
  };
  stage_history: ApiStageHistoryEntry[];
}

export interface PaginatedApplications {
  data: ApiApplicationListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface BulkMoveResult {
  results: Array<
    | { id: string; status: 'moved'; stage: ApplicationStage }
    | { id: string; status: 'error'; message: string }
  >;
}

// ── Query Parameters ───────────────────────────────────

export interface ApplicationQueryParams {
  posting_id?: string;
  posting_type?: 'job' | 'internship' | 'stipend_internship';
  posting_type_master_id?: string;
  stage?: ApplicationStage;
  page?: number;
  limit?: number;
  sort_by?: 'student' | 'posting' | 'stage' | 'applied_at';
  sort_order?: 'asc' | 'desc';
  // FILTER COUNTER EXPORT — student-scope + date-range filters
  institute?: string;
  course?: string;
  branch?: string;
  semester?: string;
  academic_year?: string;
  date_from?: string;
  date_to?: string;
}

// ── Input Types ────────────────────────────────────────

export interface ApplyInput {
  posting_id: string;
  resume_id?: string;
}

export interface MoveStageInput {
  stage: ApplicationStage;
  remarks?: string | null;
}

export interface BulkMoveStageInput {
  application_ids: string[];
  stage: ApplicationStage;
  remarks?: string | null;
}

export interface MockRoundResultInput {
  result: 'passed' | 'failed';
}
