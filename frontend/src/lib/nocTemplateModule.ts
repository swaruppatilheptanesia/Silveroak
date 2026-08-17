import { sanitizePolicyRichTextHtml } from '@/lib/policyModule';
import { getNocProgramLabel } from '@/lib/nocModule';
import type {
  ApiNocCertificateSnapshot,
  ApiNocDetail,
  ApiNocListItem,
  ApiNocMyItem,
  NOCRequest,
} from '@/types/noc';
import type { NocTemplatePreviewValues } from '@/types/nocTemplate';

type NocTemplateRecord = ApiNocDetail | ApiNocListItem | ApiNocMyItem | NOCRequest;

export interface ResolvedNocCertificatePreview {
  subject: string;
  bodyHtml: string;
  values: NocTemplatePreviewValues;
  templateName?: string;
  isSnapshot: boolean;
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function resolveNocTemplatePlaceholders(value: string, replacements: Record<string, string>) {
  return value.replace(/{{\s*([^}]+)\s*}}/g, (_match, token) => {
    const key = String(token).trim();
    return replacements[key] ?? '';
  });
}

export function resolveNocTemplateHtml(value: string, replacements: Record<string, string>) {
  const escapedReplacements = Object.fromEntries(
    Object.entries(replacements).map(([key, replacement]) => [key, escapeHtml(replacement)]),
  );

  return sanitizePolicyRichTextHtml(resolveNocTemplatePlaceholders(value, escapedReplacements));
}

export function getNocCertificateSnapshot(record: NocTemplateRecord): ApiNocCertificateSnapshot | null {
  return record.certificate_snapshot ?? null;
}

export function buildDefaultNocTemplatePreviewValues(): NocTemplatePreviewValues {
  return {
    reference_number: 'SOU/TPO/04-2026/INT/0001',
    date: '09/04/2026',
    contact_person_name: 'Recipient Name',
    contact_person_designation: 'Manager HR / Training Team',
    student_name: 'Student Name',
    enrollment_number: 'ENR000000',
    branch: 'Computer Science',
    semester: '8',
    batch: '2022-26',
    course: 'B.Tech',
    institute: 'Silver Oak University',
    program_label: 'Internship',
    company_name: 'Company Name',
    company_address: 'Company Address',
    company_city: 'Ahmedabad',
    company_state: 'Gujarat',
    company_pincode: '380001',
    role_title: 'Role Title',
    duration_from: '01-04-2026',
    duration_to: '30-06-2026',
  };
}

export function buildNocTemplatePreviewValuesFromRequest(record: NocTemplateRecord): NocTemplatePreviewValues {
  const snapshot = getNocCertificateSnapshot(record);
  if (snapshot) {
    return snapshot.values;
  }

  return {
    reference_number: record.noc_number || 'SOU/TPO/MM-YYYY/TYP/0001',
    date: new Date(record.issued_at ?? record.updated_at).toLocaleDateString('en-GB'),
    contact_person_name: record.contact_person_name || '—',
    contact_person_designation: record.contact_person_designation || undefined,
    student_name: 'student' in record ? record.student.full_name : 'Student Name',
    enrollment_number: 'student' in record ? record.student.enrollment_number : '—',
    branch: 'student' in record ? record.student.department : '—',
    semester: 'student' in record ? String(record.student.current_semester ?? '—') : '—',
    batch: 'student' in record ? record.student.batch : undefined,
    course: 'student' in record ? record.student.course ?? undefined : undefined,
    institute: 'student' in record ? record.student.institute ?? undefined : undefined,
    program_label: getNocProgramLabel(record.program),
    company_name: record.company_name,
    company_address: record.company_address || undefined,
    company_city: record.company_city || undefined,
    company_state: record.company_state || undefined,
    company_pincode: record.company_pincode || undefined,
    role_title: record.role_title || undefined,
    duration_from: new Date(record.start_date).toLocaleDateString('en-GB'),
    duration_to: new Date(record.end_date).toLocaleDateString('en-GB'),
  };
}

export function resolveNocCertificatePreview(
  record: NocTemplateRecord,
  fallbackTemplate?: {
    name: string;
    subject: string;
    body_html: string;
  } | null
): ResolvedNocCertificatePreview {
  const snapshot = getNocCertificateSnapshot(record);

  if (snapshot) {
    return {
      subject: snapshot.subject,
      bodyHtml: snapshot.body_html,
      values: snapshot.values,
      templateName: snapshot.template_name,
      isSnapshot: true,
    };
  }

  return {
    subject: fallbackTemplate?.subject ?? '',
    bodyHtml: fallbackTemplate?.body_html ?? '',
    values: buildNocTemplatePreviewValuesFromRequest(record),
    templateName: fallbackTemplate?.name,
    isSnapshot: false,
  };
}
