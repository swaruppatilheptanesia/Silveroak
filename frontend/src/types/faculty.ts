import type { ApiPortfolioStatus } from '@/types/portfolio';

export type FacultyEligibilityStatus = 'eligible' | 'conditional' | 'not_eligible';
export type FacultyPortfolioStatus = ApiPortfolioStatus | 'missing';

export interface FacultyDashboardStats {
  department: string;
  totalStudents: number;
  profilesComplete: number;
  eligibleForPlacements: number;
  placedStudents: number;
  // FILTER COUNTER EXPORT — offer tallies over the faculty's scoped students
  offersReleased: number;
  accepted: number;
  joined: number;
}

export interface FacultyDashboardStudent {
  id: string;
  name: string;
  rollNumber: string;
  cgpa: number | null;
  status: FacultyEligibilityStatus;
  updated_at: string;
}

export interface FacultyDashboardResponse {
  departmentStats: FacultyDashboardStats;
  recentStudents: FacultyDashboardStudent[];
}

export interface FacultyStudentsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface FacultyStudentListItem {
  id: string;
  student_id: string;
  user_id: string;
  name: string;
  full_name: string;
  rollNumber: string;
  roll_number: string;
  enrollment_number: string;
  email: string;
  mobile: string | null;
  batch: string;
  department: string;
  cgpa: number | null;
  backlogs: number;
  active_backlogs: number;
  semester: number | null;
  year_of_study: number | null;
  profileCompletion: number;
  profile_completion_percentage: number;
  eligibilityStatus: FacultyEligibilityStatus;
  eligibility_status: FacultyEligibilityStatus;
  placementReady: boolean;
  placement_ready: boolean;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verification_status: 'pending' | 'verified' | 'rejected';
  policyAccepted: boolean;
  policy_accepted: boolean;
  dateOfBirth: string | null;
  date_of_birth: string | null;
  address: string | null;
  permanent_address: string | null;
  residential_address: string | null;
  skills: string[];
  portfolioStatus: FacultyPortfolioStatus;
  portfolio_status: FacultyPortfolioStatus;
  updated_at: string;
  created_at: string;
}

export interface FacultyStudentInterest {
  interest_type: string;
  registered_at: string;
}

export interface FacultyStudentAcademicProfile {
  cgpa: number | null;
  tenth_percentage: number | null;
  twelfth_percentage: number | null;
  diploma_percentage: number | null;
  backlog_count: number;
  active_backlogs: number;
  semester: number | null;
  year_of_study: number | null;
  course_duration: number | null;
}

export interface FacultyStudentSkillsProfile {
  technical_skills: string[];
  domain_interests: string[];
  preferred_locations: string[];
}

export interface FacultyStudentPortfolioSummary {
  id: string;
  status: ApiPortfolioStatus;
  project_count: number;
  internship_count: number;
  updated_at: string;
}

export interface FacultyStudentDetail extends FacultyStudentListItem {
  alternate_phone: string | null;
  institute_name: string | null;
  course_name: string | null;
  linkedin_url: string | null;
  gender: string | null;
  profile_photo_url: string | null;
  verification_remarks: string | null;
  verified_at: string | null;
  policy_accepted_at: string | null;
  interests: FacultyStudentInterest[];
  academicProfile: FacultyStudentAcademicProfile;
  skillsProfile: FacultyStudentSkillsProfile;
  portfolioSummary: FacultyStudentPortfolioSummary | null;
}

export interface FacultyStudentsResponse {
  department: string;
  data: FacultyStudentListItem[];
  pagination: FacultyStudentsPagination;
}

export interface FacultyStudentsQueryParams {
  batch?: string;
  verification_status?: 'pending' | 'verified' | 'rejected';
  eligibility_status?: FacultyEligibilityStatus;
  search?: string;
  min_cgpa?: number;
  max_cgpa?: number;
  // Accept single values (from the shared ERP filter bar) or arrays; the backend coerces both.
  institute?: string | string[];
  branch?: string | string[];
  semester?: string | number | (string | number)[];
  // FILTER COUNTER EXPORT — Course + created_at date range
  course?: string;
  date_from?: string;
  date_to?: string;
  page?: number;
  limit?: number;
  sort_by?: 'full_name' | 'batch' | 'verification_status' | 'profile_completion_percentage' | 'created_at' | 'updated_at';
  sort_order?: 'asc' | 'desc';
}

export interface FacultyStudentFilterOptions {
  institutes: string[];
  branches: string[];
  semesters: number[];
}

export type FacultyProgramSource = 'applied' | 'interest' | 'both';

export interface FacultyAssignedProgram {
  posting_type: string;
  count: number;
}

export interface FacultyAssignedProgramsResponse {
  programs: FacultyAssignedProgram[];
}

export interface FacultyProgramStudent {
  student_id: string;
  full_name: string;
  enrollment_number: string;
  roll_number: string;
  gender: string | null;
  institute_name: string | null;
  course_name: string | null;
  department: string;
  semester: number | null;
  batch: string;
  cgpa: number | null;
  tenth_percentage: number | null;
  twelfth_percentage: number | null;
  backlog_count: number;
  email: string;
  mobile: string | null;
  profile_completion_percentage: number;
  registered_at: string | null;
  source: FacultyProgramSource;
}

export interface FacultyProgramStudentsResponse {
  posting_type: string;
  data: FacultyProgramStudent[];
  total: number;
}
