import { toDateInputValue } from '@/lib/studentModule';
import type { ApplicationStage } from '@/types/application';
import type {
  ApiEventDetail,
  ApiEventListItem,
  ApiEventStatus,
  ApiEventStudentAssignment,
  ApiEventType,
  AttendanceStatus,
  CreateEventInput,
} from '@/types/event';

/** Form-level pipeline-stage value: a real stage, or 'all' meaning no stage filter. */
export type EventStageValue = ApplicationStage | 'all';

export interface EventFormValues {
  /** Form-only: drives the Company/Posting cascade + audience inheritance. Not a persisted column. */
  posting_type_master_id: string;
  company_id: string;
  /** All linked postings (roles). Multi-select. */
  posting_ids: string[];
  title: string;
  type: ApiEventType;
  date: string;
  start_time: string;
  end_time: string;
  venue: string;
  reporting_time: string;
  dress_code: string;
  instructions: string;
  documents_required: string;
  /** Faculty coordinator USER ids (multi-select of faculty accounts). */
  faculty_coordinator_ids: string[];
  target_institutes: string[];
  target_courses: string[];
  target_branches: string[];
  /** Application-pipeline-stage eligibility. 'all' = no stage filter (all applicants). */
  application_stage: EventStageValue;
}

export const EVENT_STATUS_CONFIG: Record<
  ApiEventStatus,
  { label: string; color: string; description: string }
> = {
  draft: {
    label: 'Draft',
    color: 'bg-muted text-muted-foreground border-border',
    description: 'Not yet published to participants.',
  },
  published: {
    label: 'Published',
    color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    description: 'Visible to participants and ready to run.',
  },
  ongoing: {
    label: 'Ongoing',
    color: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    description: 'Event is currently in progress.',
  },
  completed: {
    label: 'Completed',
    color: 'bg-green-500/10 text-green-600 border-green-500/20',
    description: 'Event lifecycle has been completed.',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-500/10 text-red-600 border-red-500/20',
    description: 'Event has been cancelled.',
  },
};

export function createEmptyEventFormValues(): EventFormValues {
  return {
    posting_type_master_id: '',
    company_id: '',
    posting_ids: [],
    title: '',
    type: 'campus_drive',
    date: toDateInputValue(new Date().toISOString()),
    start_time: '',
    end_time: '',
    venue: '',
    reporting_time: '',
    dress_code: 'Formal',
    instructions: '',
    documents_required: '',
    faculty_coordinator_ids: [],
    target_institutes: [],
    target_courses: [],
    target_branches: [],
    application_stage: 'all',
  };
}

export function getDefaultReportingTime(startTime: string) {
  if (!startTime) {
    return '';
  }

  const [hours, minutes] = startTime.split(':').map((value) => Number.parseInt(value, 10));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return '';
  }

  const totalMinutes = Math.max(0, hours * 60 + minutes - 15);
  const reportingHours = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const reportingMinutes = String(totalMinutes % 60).padStart(2, '0');
  return `${reportingHours}:${reportingMinutes}`;
}

function parseCsv(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

function nullable(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function buildCreateEventPayload(
  values: EventFormValues,
  // Display names for the selected faculty coordinator ids (resolved by the dialog from its user list),
  // kept index-parallel with faculty_coordinator_ids for display/export. Ids drive faculty visibility.
  coordinatorNames: string[] = [],
): CreateEventInput {
  return {
    company_id: values.company_id,
    posting_ids: values.posting_ids,
    title: values.title.trim(),
    type: values.type,
    date: values.date,
    start_time: values.start_time,
    end_time: values.end_time,
    venue: values.venue.trim(),
    reporting_time: nullable(values.reporting_time),
    dress_code: nullable(values.dress_code),
    instructions: nullable(values.instructions),
    documents_required: parseCsv(values.documents_required),
    faculty_coordinator_ids: values.faculty_coordinator_ids,
    faculty_coordinators: coordinatorNames,
    target_institutes: values.target_institutes,
    target_courses: values.target_courses,
    target_branches: values.target_branches,
    application_stage: values.application_stage === 'all' ? null : values.application_stage,
  };
}

export function eventDetailToFormValues(
  event: Pick<ApiEventDetail, keyof CreateEventInput>,
  postingTypeMasterId = '',
): EventFormValues {
  const postingIds = event.posting_ids && event.posting_ids.length > 0
    ? event.posting_ids
    : event.posting_id
      ? [event.posting_id]
      : [];
  return {
    posting_type_master_id: postingTypeMasterId,
    company_id: event.company_id,
    posting_ids: postingIds,
    title: event.title,
    type: event.type,
    date: toDateInputValue(event.date),
    start_time: event.start_time,
    end_time: event.end_time,
    venue: event.venue,
    reporting_time: event.reporting_time ?? '',
    dress_code: event.dress_code ?? '',
    instructions: event.instructions ?? '',
    documents_required: event.documents_required.join(', '),
    faculty_coordinator_ids: event.faculty_coordinator_ids ?? [],
    target_institutes: event.target_institutes ?? [],
    target_courses: event.target_courses ?? [],
    target_branches: event.target_branches ?? [],
    application_stage: event.application_stage ?? 'all',
  };
}

export function getAllowedEventStatusActions(status: ApiEventStatus): ApiEventStatus[] {
  switch (status) {
    case 'draft':
      return ['published', 'cancelled'];
    case 'published':
      return ['ongoing', 'completed', 'cancelled'];
    case 'ongoing':
      return ['completed', 'cancelled'];
    default:
      return [];
  }
}

export function getAttendanceCounts(assignments: ApiEventStudentAssignment[]) {
  return assignments.reduce(
    (counts, assignment) => {
      if (assignment.attendance === 'present') counts.present += 1;
      else if (assignment.attendance === 'absent') counts.absent += 1;
      else if (assignment.attendance === 'late') counts.late += 1;
      else counts.pending += 1;
      return counts;
    },
    { total: assignments.length, present: 0, absent: 0, late: 0, pending: 0 }
  );
}

export function getAssignmentAttendanceStatus(
  assignment: Pick<ApiEventStudentAssignment, 'attendance'>
): AttendanceStatus | 'unmarked' {
  return (assignment.attendance as AttendanceStatus | null) ?? 'unmarked';
}

export function getEventListSearchFields(event: ApiEventListItem) {
  const linkedPostings = event.postings?.length
    ? event.postings
    : event.posting
      ? [event.posting]
      : [];
  return [
    event.title,
    event.company.name,
    event.venue,
    event.type,
    event.status,
    ...linkedPostings.flatMap((posting) => [posting.title, posting.type]),
  ];
}
