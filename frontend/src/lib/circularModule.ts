import { TEMPLATE_SECTIONS, type ApiCircularTemplateStatus, type ApiCircularTemplateType, type ApiGeneratedCircular, type ApiTemplateDetail, type ApiTemplateListItem } from '@/types/circular';

export type CircularFieldType = 'text' | 'textarea' | 'date' | 'currency' | 'list';

export interface CircularFieldDefinition {
  id: string;
  label: string;
  placeholder: string;
  section: string;
  required: boolean;
  type: CircularFieldType;
  helpText?: string;
  defaultValue?: string;
}

export interface CircularTemplateView {
  id: string;
  name: string;
  type: ApiCircularTemplateType;
  status: ApiCircularTemplateStatus;
  version: string;
  fields: CircularFieldDefinition[];
  sections: unknown[];
  usageCount: number;
  createdAt: string;
  updatedAt: string;
  createdByName: string;
}

export interface GeneratedCircularView {
  id: string;
  companyId: string;
  companyName: string;
  roleName: string;
  title: string;
  note: string;
  sourceType: 'posting' | 'event' | '';
  sourceLabel: string;
  circularType: string;
  templateId: string;
  templateName: string;
  templateType: ApiCircularTemplateType;
  templateFields: CircularFieldDefinition[];
  fieldValues: Record<string, unknown>;
  generatedAt: string;
  generatedByName: string;
}

const FIELD_TYPES: CircularFieldType[] = ['text', 'textarea', 'date', 'currency', 'list'];

const placementFields: CircularFieldDefinition[] = [
  { id: 'company_name', label: 'Company Name', placeholder: '{{company_name}}', section: 'Company Details', required: true, type: 'text' },
  { id: 'company_about', label: 'About Company', placeholder: '{{company_about}}', section: 'Company Details', required: false, type: 'textarea', helpText: 'Brief company description' },
  { id: 'company_website', label: 'Website', placeholder: '{{company_website}}', section: 'Company Details', required: false, type: 'text' },
  { id: 'role_name', label: 'Role / Designation', placeholder: '{{role_name}}', section: 'Role & Profile', required: true, type: 'text' },
  { id: 'job_description', label: 'Role Description', placeholder: '{{job_description}}', section: 'Role & Profile', required: true, type: 'textarea' },
  { id: 'location', label: 'Location', placeholder: '{{location}}', section: 'Role & Profile', required: true, type: 'text' },
  { id: 'eligible_branches', label: 'Eligible Branches', placeholder: '{{eligible_branches}}', section: 'Eligibility Criteria', required: true, type: 'list' },
  { id: 'min_cgpa', label: 'Minimum CGPA', placeholder: '{{min_cgpa}}', section: 'Eligibility Criteria', required: false, type: 'text' },
  { id: 'max_backlogs', label: 'Maximum Backlogs', placeholder: '{{max_backlogs}}', section: 'Eligibility Criteria', required: false, type: 'text' },
  { id: 'batch_year', label: 'Batch Year', placeholder: '{{batch_year}}', section: 'Eligibility Criteria', required: true, type: 'text' },
  { id: 'ctc', label: 'CTC / Package', placeholder: '{{ctc}}', section: 'Compensation', required: true, type: 'currency' },
  { id: 'selection_rounds', label: 'Selection Process', placeholder: '{{selection_rounds}}', section: 'Selection Process', required: true, type: 'textarea' },
  { id: 'drive_date', label: 'Drive Date', placeholder: '{{drive_date}}', section: 'Schedule & Venue', required: true, type: 'date' },
  { id: 'drive_time', label: 'Reporting Time', placeholder: '{{drive_time}}', section: 'Schedule & Venue', required: false, type: 'text' },
  { id: 'venue', label: 'Venue', placeholder: '{{venue}}', section: 'Schedule & Venue', required: false, type: 'text' },
  { id: 'bond_details', label: 'Bond / Service Agreement', placeholder: '{{bond_details}}', section: 'Bond Policy', required: false, type: 'textarea' },
  { id: 'instructions', label: 'Instructions', placeholder: '{{instructions}}', section: 'Instructions & Notes', required: false, type: 'textarea' },
];

const internshipFields: CircularFieldDefinition[] = [
  { id: 'company_name', label: 'Company Name', placeholder: '{{company_name}}', section: 'Company Details', required: true, type: 'text' },
  { id: 'company_about', label: 'About Company', placeholder: '{{company_about}}', section: 'Company Details', required: false, type: 'textarea' },
  { id: 'role_name', label: 'Internship Role', placeholder: '{{role_name}}', section: 'Role & Profile', required: true, type: 'text' },
  { id: 'job_description', label: 'Role Description', placeholder: '{{job_description}}', section: 'Role & Profile', required: true, type: 'textarea' },
  { id: 'duration', label: 'Duration', placeholder: '{{duration}}', section: 'Role & Profile', required: true, type: 'text' },
  { id: 'location', label: 'Location / Mode', placeholder: '{{location}}', section: 'Role & Profile', required: true, type: 'text' },
  { id: 'eligible_branches', label: 'Eligible Branches', placeholder: '{{eligible_branches}}', section: 'Eligibility Criteria', required: true, type: 'list' },
  { id: 'min_cgpa', label: 'Minimum CGPA', placeholder: '{{min_cgpa}}', section: 'Eligibility Criteria', required: false, type: 'text' },
  { id: 'batch_year', label: 'Batch Year', placeholder: '{{batch_year}}', section: 'Eligibility Criteria', required: true, type: 'text' },
  { id: 'stipend', label: 'Stipend', placeholder: '{{stipend}}', section: 'Compensation', required: false, type: 'currency' },
  { id: 'selection_rounds', label: 'Selection Process', placeholder: '{{selection_rounds}}', section: 'Selection Process', required: true, type: 'textarea' },
  { id: 'last_date', label: 'Last Date to Apply', placeholder: '{{last_date}}', section: 'Schedule & Venue', required: true, type: 'date' },
  { id: 'instructions', label: 'Instructions', placeholder: '{{instructions}}', section: 'Instructions & Notes', required: false, type: 'textarea' },
];

const campusDriveFields: CircularFieldDefinition[] = placementFields;
const generalFields: CircularFieldDefinition[] = [
  { id: 'headline', label: 'Headline', placeholder: '{{headline}}', section: 'Company Details', required: true, type: 'text' },
  { id: 'summary', label: 'Summary', placeholder: '{{summary}}', section: 'Role & Profile', required: true, type: 'textarea' },
  { id: 'audience', label: 'Target Audience', placeholder: '{{audience}}', section: 'Eligibility Criteria', required: false, type: 'text' },
  { id: 'details', label: 'Details', placeholder: '{{details}}', section: 'Instructions & Notes', required: true, type: 'textarea' },
];

const API_CIRCULAR_TYPE_LABELS: Record<ApiCircularTemplateType, string> = {
  placement: 'Placement',
  internship: 'Internship',
  campus_drive: 'Campus Drive',
  general: 'General',
};

const API_CIRCULAR_STATUS_LABELS: Record<ApiCircularTemplateStatus, string> = {
  draft: 'Draft',
  active: 'Active',
  archived: 'Archived',
};

const GENERATED_CIRCULAR_META_FIELD_IDS = new Set([
  'circular_title',
  'circular_note',
  'circular_source_type',
  'circular_source_label',
  'circular_source_id',
]);

function isApiCircularTemplateType(value: string | null | undefined): value is ApiCircularTemplateType {
  return value === 'placement'
    || value === 'internship'
    || value === 'campus_drive'
    || value === 'general';
}

function resolveGeneratedCircularType(circular: ApiGeneratedCircular) {
  if (isApiCircularTemplateType(circular.type)) {
    return circular.type;
  }

  if (circular.template && isApiCircularTemplateType(circular.template.type)) {
    return circular.template.type;
  }

  return 'general' as ApiCircularTemplateType;
}

function toHeadline(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function isCircularFieldDefinition(value: unknown): value is CircularFieldDefinition {
  if (!value || typeof value !== 'object') return false;

  const field = value as Partial<CircularFieldDefinition>;
  return typeof field.id === 'string'
    && typeof field.label === 'string'
    && typeof field.section === 'string'
    && typeof field.placeholder === 'string'
    && typeof field.required === 'boolean'
    && typeof field.type === 'string'
    && FIELD_TYPES.includes(field.type as CircularFieldType);
}

function pickDefaultFieldsByType(type: ApiCircularTemplateType) {
  if (type === 'placement') return placementFields;
  if (type === 'internship') return internshipFields;
  if (type === 'campus_drive') return campusDriveFields;
  return generalFields;
}

function extractTokensFromTemplateText(content: string) {
  return Array.from(content.matchAll(/{{\s*([^}]+)\s*}}/g)).map((match) => match[1].trim());
}

function buildFallbackFieldsFromStructuredSections(sections: unknown[]): CircularFieldDefinition[] {
  const seen = new Set<string>();
  const fields: CircularFieldDefinition[] = [];

  sections.forEach((entry, sectionIndex) => {
    if (!entry || typeof entry !== 'object') return;
    const section = entry as Record<string, unknown>;
    const heading = typeof section.heading === 'string' && section.heading.trim()
      ? section.heading.trim()
      : TEMPLATE_SECTIONS.at(sectionIndex) ?? 'Instructions & Notes';
    const content = typeof section.content === 'string' ? section.content : '';

    extractTokensFromTemplateText(content).forEach((token, tokenIndex) => {
      const id = token.toLowerCase().replace(/\s+/g, '_');
      if (seen.has(id)) return;
      seen.add(id);
      fields.push({
        id,
        label: toHeadline(token),
        placeholder: `{{${token}}}`,
        section: heading,
        required: false,
        type: token.includes('date') ? 'date' : token.includes('amount') || token.includes('ctc') || token.includes('stipend') ? 'currency' : 'text',
        helpText: sectionIndex === 0 && tokenIndex === 0 ? 'Imported from existing template content.' : undefined,
      });
    });
  });

  return fields;
}

export function getCircularTypeLabel(type: ApiCircularTemplateType | string | null) {
  if (!type) return 'General';
  if (type in API_CIRCULAR_TYPE_LABELS) {
    return API_CIRCULAR_TYPE_LABELS[type as ApiCircularTemplateType];
  }

  return toHeadline(type);
}

export function getCircularStatusLabel(status: ApiCircularTemplateStatus) {
  return API_CIRCULAR_STATUS_LABELS[status];
}

export function getCircularStatusVariant(status: ApiCircularTemplateStatus) {
  if (status === 'active') return 'success' as const;
  if (status === 'archived') return 'outline' as const;
  return 'secondary' as const;
}

export function getCircularErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

export function normalizeCircularFields(sections: unknown, type: ApiCircularTemplateType): CircularFieldDefinition[] {
  if (Array.isArray(sections)) {
    const directFields = sections.filter(isCircularFieldDefinition);
    if (directFields.length > 0) {
      return directFields;
    }

    const derivedFields = buildFallbackFieldsFromStructuredSections(sections);
    if (derivedFields.length > 0) {
      return derivedFields;
    }
  }

  return pickDefaultFieldsByType(type).map((field) => ({ ...field }));
}

export function serializeCircularFields(fields: CircularFieldDefinition[]) {
  return fields.map((field) => ({ ...field }));
}

export function toCircularTemplateView(template: ApiTemplateListItem | ApiTemplateDetail): CircularTemplateView {
  return {
    id: template.id,
    name: template.name,
    type: template.type,
    status: template.status,
    version: template.version ?? '1.0',
    fields: normalizeCircularFields(template.sections, template.type),
    sections: Array.isArray(template.sections) ? template.sections : [],
    usageCount: template.used_count,
    createdAt: template.created_at,
    updatedAt: template.updated_at,
    createdByName: template.created_by_user?.name || 'Placement Cell',
  };
}

export function toGeneratedCircularView(circular: ApiGeneratedCircular): GeneratedCircularView {
  const fieldValues = circular.field_values ?? {};
  const rawTitle = typeof fieldValues.circular_title === 'string' ? fieldValues.circular_title.trim() : '';
  const rawNote = typeof fieldValues.circular_note === 'string' ? fieldValues.circular_note.trim() : '';
  const rawSourceType = fieldValues.circular_source_type === 'posting' || fieldValues.circular_source_type === 'event'
    ? fieldValues.circular_source_type
    : '';
  const rawSourceLabel = typeof fieldValues.circular_source_label === 'string' ? fieldValues.circular_source_label.trim() : '';
  const templateType = resolveGeneratedCircularType(circular);
  const template = circular.template;

  return {
    id: circular.id,
    companyId: circular.company.id,
    companyName: circular.company_name || circular.company.name,
    roleName: circular.role_name,
    title: rawTitle || `${circular.company_name || circular.company.name} - ${circular.role_name}`,
    note: rawNote,
    sourceType: rawSourceType,
    sourceLabel: rawSourceLabel,
    circularType: templateType,
    templateId: template?.id ?? '',
    templateName: template?.name ?? 'Ad-hoc Circular',
    templateType,
    templateFields: template
      ? normalizeCircularFields(template.sections, templateType)
      : normalizeCircularFields([], templateType),
    fieldValues,
    generatedAt: circular.created_at,
    generatedByName: circular.generated_by_user?.name || 'Placement Cell',
  };
}

export function formatCircularFieldValue(value: unknown) {
  if (Array.isArray(value)) {
    return value.join(', ');
  }

  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value);
  }

  return value == null ? '' : String(value);
}

export function getCircularFieldValueMap(circular: GeneratedCircularView) {
  return Object.fromEntries(
    Object.entries(circular.fieldValues).map(([key, value]) => [key, formatCircularFieldValue(value)])
  );
}

function hasDisplayValue(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return value !== null && value !== undefined;
}

export function getGeneratedCircularAdditionalFields(circular: GeneratedCircularView) {
  return Object.entries(circular.fieldValues)
    .filter(([key, value]) => !GENERATED_CIRCULAR_META_FIELD_IDS.has(key) && hasDisplayValue(value))
    .map(([key, value]) => ({
      key,
      label: toHeadline(key),
      value,
    }));
}
