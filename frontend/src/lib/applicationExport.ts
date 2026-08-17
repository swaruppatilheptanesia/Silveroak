import { formatDate } from '@/lib/formatters';
import { formatPostingTypeLabel } from '@/lib/postingModule';
import { resolveBackendAssetUrl } from '@/lib/studentModule';
import type { ApiApplicationListItem } from '@/types/application';
import { APPLICATION_STAGE_CONFIG } from '@/types/application';
import type { SpreadsheetCellValue } from '@/lib/spreadsheetExport';

export type ApplicationExportSection = 'Student' | 'Posting' | 'Application';

export interface ApplicationExportFieldDefinition {
  key: string;
  label: string;
  section: ApplicationExportSection;
  getValue: (application: ApiApplicationListItem) => SpreadsheetCellValue;
}

export const APPLICATION_EXPORT_FIELDS = [
  {
    key: 'student_name',
    label: 'Student Name',
    section: 'Student',
    getValue: (application) => application.student.full_name,
  },
  {
    key: 'enrollment_number',
    label: 'Enrollment Number',
    section: 'Student',
    getValue: (application) => application.student.enrollment_number,
  },
  {
    key: 'roll_number',
    label: 'Roll Number',
    section: 'Student',
    getValue: (application) => application.student.roll_number ?? '',
  },
  {
    key: 'email',
    label: 'Email',
    section: 'Student',
    getValue: (application) => application.student.email,
  },
  {
    key: 'mobile',
    label: 'Mobile',
    section: 'Student',
    getValue: (application) => application.student.mobile ?? '',
  },
  {
    key: 'department',
    label: 'Department',
    section: 'Student',
    getValue: (application) => application.student.department,
  },
  {
    key: 'batch',
    label: 'Batch',
    section: 'Student',
    getValue: (application) => application.student.batch,
  },
  {
    key: 'course',
    label: 'Course',
    section: 'Student',
    getValue: (application) => application.student.course ?? '',
  },
  {
    key: 'institute',
    label: 'Institute',
    section: 'Student',
    getValue: (application) => application.student.institute ?? '',
  },
  {
    key: 'semester',
    label: 'Semester',
    section: 'Student',
    getValue: (application) => application.student.academic_profile?.semester ?? application.student.current_semester ?? '',
  },
  {
    key: 'cgpa',
    label: 'CGPA',
    section: 'Student',
    getValue: (application) => application.student.academic_profile?.cgpa ?? '',
  },
  {
    key: 'tenth_percentage',
    label: '10th Percentage',
    section: 'Student',
    getValue: (application) => application.student.academic_profile?.tenth_percentage ?? '',
  },
  {
    key: 'twelfth_percentage',
    label: '12th Percentage',
    section: 'Student',
    getValue: (application) => application.student.academic_profile?.twelfth_percentage ?? '',
  },
  {
    key: 'posting_title',
    label: 'Posting Title',
    section: 'Posting',
    getValue: (application) => application.posting.title,
  },
  {
    key: 'company_name',
    label: 'Company Name',
    section: 'Posting',
    getValue: (application) => application.posting.company.name,
  },
  {
    key: 'posting_type',
    label: 'Posting Type',
    section: 'Posting',
    getValue: (application) => formatPostingTypeLabel(application.posting.type),
  },
  {
    key: 'stage',
    label: 'Application Stage',
    section: 'Application',
    getValue: (application) => APPLICATION_STAGE_CONFIG[application.current_stage].label,
  },
  {
    key: 'mock_round_result',
    label: 'Mock Result',
    section: 'Application',
    getValue: (application) => application.mock_round_result ?? '',
  },
  {
    key: 'applied_at',
    label: 'Applied At',
    section: 'Application',
    getValue: (application) => formatDate(application.applied_at),
  },
  {
    key: 'resume_link',
    label: 'Resume Link',
    section: 'Application',
    getValue: (application) => (application.resume_url ? resolveBackendAssetUrl(application.resume_url) : ''),
  },
 ] as const satisfies readonly ApplicationExportFieldDefinition[];

export type ApplicationExportFieldKey = (typeof APPLICATION_EXPORT_FIELDS)[number]['key'];

function getSelectedFields(fieldKeys?: readonly ApplicationExportFieldKey[]) {
  if (!fieldKeys || fieldKeys.length === 0) return APPLICATION_EXPORT_FIELDS;
  const selected = new Set(fieldKeys);
  return APPLICATION_EXPORT_FIELDS.filter((field) => selected.has(field.key));
}

export function getDefaultApplicationExportFieldKeys(): ApplicationExportFieldKey[] {
  return APPLICATION_EXPORT_FIELDS.map((field) => field.key) as ApplicationExportFieldKey[];
}

export function buildApplicationExportTable(
  applications: ApiApplicationListItem[],
  fieldKeys?: readonly ApplicationExportFieldKey[],
) {
  const fields = getSelectedFields(fieldKeys);
  return {
    headers: fields.map((field) => field.label),
    rows: applications.map((application) => fields.map((field) => field.getValue(application))),
    fields,
  };
}
