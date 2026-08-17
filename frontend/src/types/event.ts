// Module 6: Events, Campus Drives & Scheduling Types

import type { ApplicationStage } from './application';

export type EventType = 'campus_drive' | 'internship_drive' | 'interview_round' | 'test_assessment' | 'ppt' | 'workshop';
export type EventStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';
export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

export interface EventPanel {
  id: string;
  panelName: string;
  room: string;
  recruiters: string[]; // recruiter names
  startTime: string;
  endTime: string;
}

export interface StudentSlot {
  studentId: string;
  studentName: string;
  rollNumber: string;
  branch: string;
  panelId?: string;
  slotTime?: string;
  attendance?: AttendanceStatus;
  attendanceMarkedAt?: string;
  attendanceMarkedBy?: string;
}

export interface PlacementEvent {
  id: string;
  type: EventType;
  title: string;
  companyId: string;
  companyName: string;
  opportunityId?: string;
  opportunityTitle?: string;

  // Schedule
  date: string;
  startTime: string;
  endTime: string;
  venue: string;

  // Details
  instructions: string;
  dressCode?: string;
  documentsRequired?: string[];
  reportingTime?: string;

  // Panels
  panels: EventPanel[];

  // Students
  assignedStudents: StudentSlot[];
  eligibleBranches?: string[];

  // Faculty
  facultyCoordinators: string[];

  // Status
  status: EventStatus;

  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  publishedAt?: string;
  completedAt?: string;
}

export const eventTypeLabels: Record<EventType, string> = {
  campus_drive: 'Campus Drive',
  internship_drive: 'Internship Drive',
  interview_round: 'Interview Round',
  test_assessment: 'Test / Assessment',
  ppt: 'Pre-Placement Talk (PPT)',
  workshop: 'Workshop',
};

/**
 * Resolve a human label for any event type value. Event types are now master-driven
 * (tenant-configurable), so a value may not be one of the legacy keys above — fall back
 * to a humanized version of the raw value (e.g. "hackathon" → "Hackathon").
 */
export function getEventTypeLabel(type: string | null | undefined): string {
  if (!type) return '';
  const known = (eventTypeLabels as Record<string, string>)[type];
  if (known) return known;
  return type
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export const eventStatusLabels: Record<EventStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  ongoing: 'Ongoing',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const attendanceStatusLabels: Record<AttendanceStatus, string> = {
  present: 'Present',
  absent: 'Absent',
  late: 'Late',
  excused: 'Excused',
};

// ── API Response Types (match backend) ─────────────────

// Event types are tenant-configurable masters, so the value is a free string (validated server-side).
export type ApiEventType = string;
export type ApiEventStatus = 'draft' | 'published' | 'ongoing' | 'completed' | 'cancelled';

export interface ApiEventListItem {
  id: string;
  company_id: string;
  /** Legacy single linked posting mirror (= first of posting_ids). Kept for back-compat. */
  posting_id: string | null;
  /** All linked postings (roles) for this event. */
  posting_ids: string[];
  title: string;
  type: ApiEventType;
  status: ApiEventStatus;
  date: string;
  start_time: string;
  end_time: string;
  venue: string;
  reporting_time: string | null;
  dress_code: string | null;
  instructions: string | null;
  documents_required: string[];
  faculty_coordinators: string[];
  faculty_coordinator_ids: string[];
  target_institutes: string[];
  target_courses: string[];
  target_branches: string[];
  /** Configured application-pipeline-stage eligibility (null = all applicants / "All"). */
  application_stage: ApplicationStage | null;
  created_at: string;
  updated_at: string;
  company: { id: string; name: string };
  posting: { id: string; title: string; type: 'job' | 'internship' | 'stipend_internship' } | null;
  postings: { id: string; title: string; type: 'job' | 'internship' | 'stipend_internship' }[];
  _count: { panels: number; assigned_students: number };
  /** Live count of students eligible by the linked postings + configured stage. */
  eligible_student_count?: number;
}

export interface ApiEventPanel {
  id: string;
  panel_name: string;
  room: string;
  start_time: string | null;
  end_time: string | null;
  recruiters: string[];
}

export interface ApiEventStudentAssignment {
  id: string;
  student_id: string;
  panel_id: string | null;
  slot_time: string | null;
  attendance: string | null;
  marked_by: string | null;
  marked_at: string | null;
  student: {
    id: string;
    full_name: string;
    enrollment_number: string;
    department: string;
  };
}

export interface ApiEventDetail {
  id: string;
  company_id: string;
  /** Legacy single linked posting mirror (= first of posting_ids). Kept for back-compat. */
  posting_id: string | null;
  /** All linked postings (roles) for this event. */
  posting_ids: string[];
  title: string;
  type: ApiEventType;
  status: ApiEventStatus;
  date: string;
  start_time: string;
  end_time: string;
  venue: string;
  reporting_time: string | null;
  dress_code: string | null;
  instructions: string | null;
  documents_required: string[];
  faculty_coordinators: string[];
  faculty_coordinator_ids: string[];
  target_institutes: string[];
  target_courses: string[];
  target_branches: string[];
  /** Configured application-pipeline-stage eligibility (null = all applicants / "All"). */
  application_stage: ApplicationStage | null;
  created_at: string;
  updated_at: string;
  company: { id: string; name: string };
  posting: { id: string; title: string; type: 'job' | 'internship' | 'stipend_internship' } | null;
  postings: { id: string; title: string; type: 'job' | 'internship' | 'stipend_internship' }[];
  panels: ApiEventPanel[];
  assigned_students: ApiEventStudentAssignment[];
  /** Live count of students eligible by the linked postings + configured stage. */
  eligible_student_count?: number;
}

export interface PaginatedEvents {
  data: ApiEventListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AssignStudentsResult {
  results: Array<
    | { student_id: string; status: 'assigned'; id: string }
    | { student_id: string; status: 'error'; message: string }
  >;
}

// ── Query Parameters ───────────────────────────────────

export interface EventQueryParams {
  status?: ApiEventStatus;
  type?: ApiEventType;
  posting_type?: 'job' | 'internship' | 'stipend_internship';
  posting_type_master_id?: string;
  company_id?: string;
  page?: number;
  limit?: number;
  sort_by?: 'title' | 'date' | 'status' | 'panels' | 'students';
  sort_order?: 'asc' | 'desc';
  // FILTER COUNTER EXPORT — pipeline-target scope (institute/course/branch) + event-date range
  institute?: string;
  course?: string;
  branch?: string;
  date_from?: string;
  date_to?: string;
}

// ── Input Types ────────────────────────────────────────

export interface CreateEventInput {
  company_id: string;
  /** All linked postings (roles). `posting_id` is derived server-side (= posting_ids[0]). */
  posting_ids?: string[];
  posting_id?: string | null;
  title: string;
  type: ApiEventType;
  date: string;
  start_time: string;
  end_time: string;
  venue: string;
  reporting_time?: string | null;
  dress_code?: string | null;
  instructions?: string | null;
  documents_required?: string[];
  faculty_coordinators?: string[];
  /** Faculty coordinator USER ids — drives faculty event visibility. */
  faculty_coordinator_ids?: string[];
  target_institutes?: string[];
  target_courses?: string[];
  target_branches?: string[];
  /** Application-pipeline-stage eligibility; null/omitted = all applicants ("All"). */
  application_stage?: ApplicationStage | null;
}

export type UpdateEventInput = Partial<CreateEventInput>;

export interface UpdateEventStatusInput {
  status: ApiEventStatus;
}

export interface CreatePanelInput {
  panel_name: string;
  room: string;
  start_time?: string | null;
  end_time?: string | null;
  recruiters?: string[];
}

export interface AssignStudentsInput {
  student_ids: string[];
  panel_id?: string | null;
}

export interface MarkAttendanceInput {
  student_id: string;
  attendance: 'present' | 'absent' | 'late';
}
