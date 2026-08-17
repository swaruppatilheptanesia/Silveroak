import type {
  AnnouncementPriority,
  AnnouncementStatus,
  ApiAnnouncementListItem,
} from '@/types/announcement';
import type { ApiGeneratedCircular } from '@/types/circular';

export function getAnnouncementErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

export function getAnnouncementPriorityMeta(priority: AnnouncementPriority) {
  if (priority === 'high') {
    return {
      label: 'High',
      shortLabel: 'Urgent',
      variant: 'destructive' as const,
      accentClassName: 'text-destructive',
    };
  }

  if (priority === 'medium') {
    return {
      label: 'Medium',
      shortLabel: 'Important',
      variant: 'warning' as const,
      accentClassName: 'text-amber-600',
    };
  }

  return {
    label: 'Low',
    shortLabel: 'Info',
    variant: 'secondary' as const,
    accentClassName: 'text-primary',
  };
}

export function getAnnouncementStatusMeta(status: AnnouncementStatus) {
  if (status === 'published') {
    return { label: 'Published', variant: 'success' as const };
  }

  if (status === 'archived') {
    return { label: 'Archived', variant: 'outline' as const };
  }

  return { label: 'Draft', variant: 'secondary' as const };
}

function getAnnouncementScopeLabel(
  announcement: Pick<ApiAnnouncementListItem, 'target_institutes' | 'target_courses' | 'target_branches'>
) {
  const parts: string[] = [];

  if (announcement.target_institutes.length > 0) {
    parts.push(`Institute: ${announcement.target_institutes.join(', ')}`);
  }

  if (announcement.target_courses.length > 0) {
    parts.push(`Course: ${announcement.target_courses.join(', ')}`);
  }

  if (announcement.target_branches.length > 0) {
    parts.push(`Branch: ${announcement.target_branches.join(', ')}`);
  }

  return parts.join(' | ');
}

export function getAnnouncementAudienceLabel(
  announcement: Pick<
    ApiAnnouncementListItem,
    'target_audience_type' | 'target_departments' | 'target_batches' | 'target_semesters' | 'target_institutes' | 'target_courses' | 'target_branches'
  >
) {
  let audienceLabel = 'All Students';

  if (announcement.target_audience_type === 'all') {
    audienceLabel = 'All Students';
  }
  else if (announcement.target_audience_type === 'department') {
    audienceLabel = announcement.target_departments.length > 0
      ? announcement.target_departments.join(', ')
      : 'Selected Departments';
  }
  else if (announcement.target_audience_type === 'batch') {
    audienceLabel = announcement.target_batches.length > 0
      ? `Batch ${announcement.target_batches.join(', ')}`
      : 'Selected Batches';
  }
  else if (announcement.target_audience_type === 'semester') {
    audienceLabel = announcement.target_semesters.length > 0
      ? `Semester ${announcement.target_semesters.join(', ')}`
      : 'Selected Semesters';
  }
  else {
    audienceLabel = 'Eligible for Posting';
  }

  const scopeLabel = getAnnouncementScopeLabel(announcement);
  return scopeLabel ? `${audienceLabel} | ${scopeLabel}` : audienceLabel;
}

export function getAnnouncementReadRate(announcement: Pick<ApiAnnouncementListItem, 'total_recipients' | 'read_count'>) {
  if (announcement.total_recipients <= 0) return 0;
  return Math.round((announcement.read_count / announcement.total_recipients) * 100);
}

export function getAnnouncementConsentRate(
  announcement: Pick<ApiAnnouncementListItem, 'total_recipients' | 'consent_count'>
) {
  if (announcement.total_recipients <= 0) return 0;
  return Math.round((announcement.consent_count / announcement.total_recipients) * 100);
}

function toHeadline(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatCircularValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.join(', ');
  }

  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }

  return value == null ? '' : String(value);
}

export function buildAnnouncementContentFromCircular(circular: ApiGeneratedCircular) {
  const sections = [
    `Company: ${circular.company_name}`,
    `Role: ${circular.role_name}`,
    circular.type ? `Circular Type: ${toHeadline(circular.type)}` : null,
    '',
    'Circular Summary',
  ].filter(Boolean) as string[];

  const fieldLines = Object.entries(circular.field_values ?? {})
    .filter(([, value]) => value !== null && value !== undefined && value !== '')
    .map(([key, value]) => `${toHeadline(key)}: ${formatCircularValue(value)}`);

  if (fieldLines.length === 0) {
    fieldLines.push('Please refer to the linked circular for the complete details.');
  }

  return [...sections, ...fieldLines].join('\n');
}

export function extractCircularDepartments(circular: ApiGeneratedCircular) {
  const raw = circular.field_values?.eligible_branches;

  if (Array.isArray(raw)) {
    return raw.map((value) => String(value).trim()).filter(Boolean);
  }

  if (typeof raw === 'string') {
    return raw
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean);
  }

  return [];
}
