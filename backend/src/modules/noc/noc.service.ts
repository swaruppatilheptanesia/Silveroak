import fs from 'fs/promises';
import path from 'path';
import { env } from '../../config/env';
import { buildNocReferenceNumber, generateNocCertificatePdf } from './noc-certificate.renderer';
import { buildDefaultNocTemplateBodyHtml, formatNocPostingTypeLabel, getTemplateForProgram, ensureTenantNocTemplatesSeeded } from '../noc-templates/noc-template.service';
import { prisma } from '../../config/database';
import { NotFoundError, BusinessRuleError, AuthorizationError } from '../../shared/errors';
import { paginate, buildPrismaQuery } from '../../shared/utils/pagination';
import { logger } from '../../config/logger';
import type { CreateNocInput, ApproveNocInput, RejectNocInput, QueryNocInput } from './noc.schema';
import { createNotification, notifyManyUsers, notifyTpoAudience } from '../notifications/notification.service';
import { resolveFacultyScope, studentMatchesFacultyScope } from '../../shared/utils/faculty-scope';
import { buildStudentScopeConditions, buildDateRangeCondition } from '../../shared/utils/student-scope-filter';
import {
  CompanySource,
  CompanyVerificationStatus,
  NocType,
  PlacementSource,
  NocStatus,
  VerificationStatus,
  CompletionCertStatus,
  Prisma,
} from '@prisma/client';
import { recalcProfileCompletion } from '../students/student.service';

const LEGACY_NOC_PROGRAMS = new Map<string, string>([
  ['summer_internship', 'summer_internship'],
  ['winter_internship', 'winter_internship'],
  ['final_semester_internship', 'final_semester_internship'],
  ['nep_internship', 'nep_internship'],
  ['stipend_internship', 'stipend_internship'],
  ['dissertation', 'dissertation'],
  ['industrial_training', 'industrial_training'],
]);

function normalizeNocProgramValue(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

// A given NOC (reference number) may be re-issued at most this many times.
const NOC_REISSUE_LIMIT = 4;

// ── Recruiter fallback for University-Placement-Drive NOCs ───────────────────
// University-drive (offer-sourced) NOCs don't collect contact_person_* (the wizard only prefills
// company + role from the chosen offer). The offer isn't persisted on the NOC, so the only durable
// link back to a recruiter is NocRequest.company_id → Company.recruiters[]. These helpers recover
// the recruiter's name/phone/designation/email so the record views, the report, and the issued
// certificate all show recruiter details.
type RecruiterContactFields = {
  name: string | null;
  phone: string | null;
  designation: string | null;
  email: string | null;
};

type CompanyRecruiterLite = {
  name: string | null;
  phone: string | null;
  designation: string | null;
  email: string | null;
  verification_status?: VerificationStatus;
};

/** Prefer a verified recruiter, else the earliest-created (caller orders by created_at asc). */
export function pickCompanyRecruiter(recruiters?: CompanyRecruiterLite[] | null): RecruiterContactFields | null {
  if (!recruiters || recruiters.length === 0) return null;
  const chosen = recruiters.find((r) => r.verification_status === VerificationStatus.verified) ?? recruiters[0];
  return {
    name: chosen.name ?? null,
    phone: chosen.phone ?? null,
    designation: chosen.designation ?? null,
    email: chosen.email ?? null,
  };
}

/** Fill the four contact_person_* fields from the linked company's recruiter when the NOC's own are empty. */
export function contactWithRecruiterFallback<
  T extends {
    contact_person_name: string | null;
    contact_person_phone: string | null;
    contact_person_designation: string | null;
    contact_person_email: string | null;
    company?: { recruiters?: CompanyRecruiterLite[] | null } | null;
  }
>(noc: T): T {
  const recruiter = pickCompanyRecruiter(noc.company?.recruiters);
  if (!recruiter) return noc;
  return {
    ...noc,
    contact_person_name: noc.contact_person_name || recruiter.name,
    contact_person_phone: noc.contact_person_phone || recruiter.phone,
    contact_person_designation: noc.contact_person_designation || recruiter.designation,
    contact_person_email: noc.contact_person_email || recruiter.email,
  };
}

const NOC_COMPANY_RECRUITER_SELECT = {
  id: true,
  name: true,
  source: true,
  verification_status: true,
  recruiters: {
    select: { name: true, phone: true, designation: true, email: true, verification_status: true },
    orderBy: { created_at: 'asc' as const },
  },
} as const;

const NOC_STUDENT_SELECT = {
  id: true,
  full_name: true,
  enrollment_number: true,
  department: true,
  branch: true,
  batch: true,
  current_semester: true,
  course: true,
  institute: true,
  email: true,
  mobile: true,
  alternate_phone: true,
} as const;

type NocCertificateStudent = {
  full_name: string;
  enrollment_number: string;
  department: string;
  branch: string | null;
  batch: string | null;
  current_semester: string | null;
  course: string | null;
  institute: string | null;
};

type NocCertificatePreviewValues = {
  reference_number: string;
  date: string;
  contact_person_name: string;
  contact_person_designation?: string;
  student_name: string;
  enrollment_number: string;
  branch: string;
  semester: string;
  batch?: string;
  course?: string;
  institute?: string;
  program_label: string;
  company_name: string;
  company_address?: string;
  company_city?: string;
  company_state?: string;
  company_pincode?: string;
  role_title?: string;
  duration_from: string;
  duration_to: string;
};

type NocCertificateSnapshot = {
  template_id: string | null;
  template_name: string;
  posting_type_value: string;
  subject: string;
  body_html: string;
  values: NocCertificatePreviewValues;
  generated_at: string;
};

type NocCertificateSource = {
  tenant_id: string;
  program: string;
  // Set for a re-issue — the certificate reuses this shared reference number instead of a new sequence.
  noc_number?: string | null;
  contact_person_name: string | null;
  contact_person_designation: string | null;
  student: NocCertificateStudent;
  company_name: string;
  company_address: string | null;
  company_city: string | null;
  company_state: string | null;
  company_pincode: string | null;
  role_title: string;
  start_date: Date;
  end_date: Date | null;
};

type NocCertificateArtifact = {
  issueDate: Date;
  referenceNumber: string;
  certificateUrl: string;
  certificateFilePath: string;
  nocTemplateId: string | null;
  certificateSnapshot: NocCertificateSnapshot;
};

function formatCertificateDate(date: Date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${day}/${month}/${year}`;
}

function buildNocCertificateSnapshot(args: {
  template: {
    id: string | null;
    name: string;
    subject: string;
    body_html: string;
  };
  postingTypeValue: string;
  programLabel: string;
  referenceNumber: string;
  issueDate: Date;
  noc: NocCertificateSource;
}): NocCertificateSnapshot {
  const values: NocCertificatePreviewValues = {
    reference_number: args.referenceNumber,
    date: formatCertificateDate(args.issueDate),
    contact_person_name: args.noc.contact_person_name || '—',
    student_name: args.noc.student.full_name,
    enrollment_number: args.noc.student.enrollment_number,
    branch: args.noc.student.branch ?? args.noc.student.department,
    semester: args.noc.student.current_semester ? String(args.noc.student.current_semester) : '—',
    program_label: args.programLabel,
    company_name: args.noc.company_name,
    duration_from: formatCertificateDate(args.noc.start_date),
    duration_to: args.noc.end_date ? formatCertificateDate(args.noc.end_date) : '—',
    ...(args.noc.contact_person_designation ? { contact_person_designation: args.noc.contact_person_designation } : {}),
    ...(args.noc.student.batch ? { batch: args.noc.student.batch } : {}),
    ...(args.noc.student.course ? { course: args.noc.student.course } : {}),
    ...(args.noc.student.institute ? { institute: args.noc.student.institute } : {}),
    ...(args.noc.company_address ? { company_address: args.noc.company_address } : {}),
    ...(args.noc.company_city ? { company_city: args.noc.company_city } : {}),
    ...(args.noc.company_state ? { company_state: args.noc.company_state } : {}),
    ...(args.noc.company_pincode ? { company_pincode: args.noc.company_pincode } : {}),
    ...(args.noc.role_title ? { role_title: args.noc.role_title } : {}),
  };

  return {
    template_id: args.template.id,
    template_name: args.template.name,
    posting_type_value: args.postingTypeValue,
    subject: args.template.subject,
    body_html: args.template.body_html,
    values,
    generated_at: args.issueDate.toISOString(),
  };
}

async function generateNocCertificateArtifact(noc: NocCertificateSource): Promise<NocCertificateArtifact> {
  await ensureTenantNocTemplatesSeeded(noc.tenant_id);

  const templateResult = await getTemplateForProgram(noc.tenant_id, noc.program, [noc.student.branch, noc.student.department]);
  const programLabel = templateResult?.postingType.value
    ? formatNocPostingTypeLabel(templateResult.postingType.value)
    : formatNocPostingTypeLabel(noc.program);
  const template = templateResult?.template ?? {
    id: null,
    name: `NOC Template - ${programLabel}`,
    subject: `${programLabel} Program`,
    body_html: buildDefaultNocTemplateBodyHtml(programLabel),
  };

  const issueDate = new Date();
  let referenceNumber = '';
  let certificateUrl = '';
  let certificateFilePath = '';
  const postingTypeValue = templateResult?.postingType.value ?? noc.program;

  if (noc.noc_number) {
    // Re-issue: keep the shared reference number of the superseded NOC (do not mint a new sequence).
    referenceNumber = noc.noc_number;
  } else {
    // New NOC: next per-tenant per-month sequence. Count DISTINCT numbers (re-issues share a number, so
    // counting rows would inflate the sequence) and step past any existing number — noc_number is no
    // longer @unique, so we can't rely on a P2002 retry to guarantee uniqueness.
    const monthPrefix = `SOU/TPO/${String(issueDate.getMonth() + 1).padStart(2, '0')}-${issueDate.getFullYear()}/`;
    const existingThisMonth = await prisma.nocRequest.findMany({
      where: { tenant_id: noc.tenant_id, noc_number: { startsWith: monthPrefix } },
      distinct: ['noc_number'],
      select: { noc_number: true },
    });
    let sequence = existingThisMonth.length + 1;
    referenceNumber = buildNocReferenceNumber(issueDate, postingTypeValue, sequence);
    while (
      await prisma.nocRequest.findFirst({
        where: { tenant_id: noc.tenant_id, noc_number: referenceNumber },
        select: { id: true },
      })
    ) {
      sequence += 1;
      referenceNumber = buildNocReferenceNumber(issueDate, postingTypeValue, sequence);
    }
  }
  certificateUrl = `/uploads/noc-certificates/${referenceNumber.replace(/[^a-zA-Z0-9._-]+/g, '_')}.pdf`;
  certificateFilePath = path.resolve(env.uploadDir, certificateUrl.replace('/uploads/', ''));

  const pdfBuffer = await generateNocCertificatePdf({
    referenceNumber,
    issueDate,
    contactPersonName: noc.contact_person_name,
    contactPersonDesignation: noc.contact_person_designation,
    subject: template.subject,
    bodyHtml: template.body_html,
    programLabel,
    student: {
      full_name: noc.student.full_name,
      enrollment_number: noc.student.enrollment_number,
      department: noc.student.department,
      branch: noc.student.branch ?? noc.student.department,
      batch: noc.student.batch ?? '',
      current_semester: noc.student.current_semester ?? '',
      course: noc.student.course ?? '',
      institute: noc.student.institute ?? '',
    },
    noc: {
      company_name: noc.company_name,
      company_address: noc.company_address,
      company_city: noc.company_city,
      company_state: noc.company_state,
      company_pincode: noc.company_pincode,
      role_title: noc.role_title,
      start_date: noc.start_date,
      end_date: noc.end_date,
    },
  });
  const certificateSnapshot = buildNocCertificateSnapshot({
    template: {
      id: template.id,
      name: template.name,
      subject: template.subject,
      body_html: template.body_html,
    },
    postingTypeValue,
    programLabel,
    referenceNumber,
    issueDate,
    noc,
  });

  await fs.mkdir(path.dirname(certificateFilePath), { recursive: true });
  await fs.writeFile(certificateFilePath, pdfBuffer);

  return {
    issueDate,
    referenceNumber,
    certificateUrl,
    certificateFilePath,
    nocTemplateId: template.id,
    certificateSnapshot,
  };
}

export async function getMyNocs(userId: string) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');

  const nocs = await prisma.nocRequest.findMany({
    where: { student_id: student.id },
    orderBy: { created_at: 'desc' },
    include: {
      company: { select: NOC_COMPANY_RECRUITER_SELECT },
      faculty_approved_by_user: { select: { id: true, name: true } },
      tpo_approved_by_user: { select: { id: true, name: true } },
      previous_noc: { select: { noc_number: true } },
    },
  });

  // Lazy "duration completed" reminder (no scheduler exists): once per NOC, when the internship
  // end date has passed and no completion certificate has been submitted yet, notify the student to
  // upload it. Best-effort — must never break the list load.
  try {
    const now = new Date();
    const due = nocs.filter(
      (noc) =>
        noc.status === NocStatus.issued
        && noc.end_date != null
        && noc.end_date < now
        && noc.completion_status == null
        && noc.completion_due_notified_at == null,
    );
    if (due.length > 0) {
      await prisma.nocRequest.updateMany({
        where: { id: { in: due.map((n) => n.id) } },
        data: { completion_due_notified_at: now },
      });
      for (const noc of due) {
        void createNotification({
          userId,
          tenantId: noc.tenant_id,
          type: 'noc',
          title: 'Internship completion certificate due',
          description: `Your internship for ${noc.company_name} has ended. Please upload your Internship Completion Certificate.`,
          priority: 'high',
          actionUrl: '/noc',
          payload: { noc_id: noc.id },
        });
        noc.completion_due_notified_at = now;
      }
    }
  } catch (err) {
    logger.error({ err }, 'Completion-due notification failed');
  }

  return nocs.map(contactWithRecruiterFallback);
}

// ── Internship completion certificate ────────────────────────────────────────
// Separate lifecycle from NOC issuance: the NOC stays `issued`; completion_status
// tracks the uploaded certificate (null → pending → approved/rejected).

interface CompletionCertificateFile {
  url: string;
  name: string;
  mimeType: string;
  size: number;
}

/** Student uploads (or re-uploads after rejection) their internship completion certificate. */
export async function submitCompletionCertificate(
  userId: string,
  nocId: string,
  file: CompletionCertificateFile,
) {
  const student = await prisma.student.findUnique({ where: { user_id: userId }, select: { id: true } });
  if (!student) throw new NotFoundError('Student profile');

  const noc = await prisma.nocRequest.findFirst({ where: { id: nocId, student_id: student.id } });
  if (!noc) throw new NotFoundError('NOC request');
  if (noc.status !== NocStatus.issued) {
    throw new BusinessRuleError(
      'A completion certificate can only be submitted for an issued NOC.',
      'NOC_NOT_ISSUED',
    );
  }

  const updated = await prisma.nocRequest.update({
    where: { id: nocId },
    data: {
      completion_certificate_url: file.url,
      completion_certificate_name: file.name,
      completion_certificate_mime_type: file.mimeType,
      completion_certificate_size: file.size,
      completion_status: CompletionCertStatus.pending,
      completion_submitted_at: new Date(),
      // Reset any prior review so a re-upload after rejection returns to Pending.
      completion_reviewed_by: null,
      completion_reviewed_by_name: null,
      completion_reviewed_at: null,
      completion_remarks: null,
    },
  });

  void notifyTpoAudience({
    tenantId: noc.tenant_id,
    type: 'noc',
    title: 'Completion certificate submitted',
    description: `${noc.company_name}: an internship completion certificate is awaiting review.`,
    priority: 'medium',
    actionUrl: '/admin/noc',
    payload: { noc_id: nocId },
  });

  prisma.auditLog.create({
    data: {
      tenant_id: noc.tenant_id,
      user_id: userId,
      action: 'submit_completion_certificate',
      module: 'noc',
      target_type: 'noc_requests',
      target_id: nocId,
      details: `Submitted internship completion certificate for ${noc.company_name}`,
    },
  }).catch((err) => logger.error({ err }, 'Audit log failed'));

  return updated;
}

/** TPO approves the completion certificate → stamps the NOC + adds it to the student portfolio. */
export async function approveCompletionCertificate(nocId: string, userId: string, userName: string) {
  const noc = await prisma.nocRequest.findUnique({ where: { id: nocId } });
  if (!noc) throw new NotFoundError('NOC request');
  if (noc.completion_status !== CompletionCertStatus.pending) {
    throw new BusinessRuleError(
      'Only a pending completion certificate can be approved.',
      'COMPLETION_NOT_PENDING',
    );
  }

  const reviewedAt = new Date();
  const updated = await prisma.nocRequest.update({
    where: { id: nocId },
    data: {
      completion_status: CompletionCertStatus.approved,
      completion_reviewed_by: userId,
      completion_reviewed_by_name: userName,
      completion_reviewed_at: reviewedAt,
      completion_remarks: null,
    },
  });

  // Portfolio integration: add the approved certificate as a student Certification.
  // Best-effort — must never break the approval. Skip if already added (idempotent on re-approval).
  try {
    if (noc.completion_certificate_url) {
      const existing = await prisma.certification.findFirst({
        where: { student_id: noc.student_id, document_url: noc.completion_certificate_url },
        select: { id: true },
      });
      if (!existing) {
        await prisma.certification.create({
          data: {
            student_id: noc.student_id,
            name: `Internship Completion Certificate — ${noc.company_name}`,
            issuer: noc.company_name,
            issue_date: noc.end_date ?? reviewedAt,
            document_url: noc.completion_certificate_url,
            document_name: noc.completion_certificate_name,
            document_mime_type: noc.completion_certificate_mime_type,
            document_size: noc.completion_certificate_size,
          },
        });
        await recalcProfileCompletion(noc.student_id);
      }
    }
  } catch (err) {
    logger.error({ err }, 'Completion certificate portfolio sync failed');
  }

  try {
    const studentUser = await prisma.student.findUnique({
      where: { id: noc.student_id },
      select: { user_id: true },
    });
    if (studentUser?.user_id) {
      void createNotification({
        userId: studentUser.user_id,
        tenantId: noc.tenant_id,
        type: 'noc',
        title: 'Completion certificate approved',
        description: `Your internship completion certificate for ${noc.company_name} has been approved and added to your portfolio.`,
        priority: 'high',
        actionUrl: '/noc',
        payload: { noc_id: nocId },
      });
    }
  } catch (err) {
    // swallow
  }

  prisma.auditLog.create({
    data: {
      tenant_id: noc.tenant_id,
      user_id: userId,
      action: 'approve_completion_certificate',
      module: 'noc',
      target_type: 'noc_requests',
      target_id: nocId,
      details: `Approved internship completion certificate for ${noc.company_name}`,
    },
  }).catch((err) => logger.error({ err }, 'Audit log failed'));

  return updated;
}

/** TPO rejects the completion certificate (mandatory remark). Student may re-upload. */
export async function rejectCompletionCertificate(
  nocId: string,
  userId: string,
  userName: string,
  remarks: string,
) {
  const noc = await prisma.nocRequest.findUnique({ where: { id: nocId } });
  if (!noc) throw new NotFoundError('NOC request');
  if (noc.completion_status !== CompletionCertStatus.pending) {
    throw new BusinessRuleError(
      'Only a pending completion certificate can be rejected.',
      'COMPLETION_NOT_PENDING',
    );
  }

  const updated = await prisma.nocRequest.update({
    where: { id: nocId },
    data: {
      completion_status: CompletionCertStatus.rejected,
      completion_reviewed_by: userId,
      completion_reviewed_by_name: userName,
      completion_reviewed_at: new Date(),
      completion_remarks: remarks,
    },
  });

  try {
    const studentUser = await prisma.student.findUnique({
      where: { id: noc.student_id },
      select: { user_id: true },
    });
    if (studentUser?.user_id) {
      void createNotification({
        userId: studentUser.user_id,
        tenantId: noc.tenant_id,
        type: 'noc',
        title: 'Completion certificate rejected',
        description: `Your internship completion certificate for ${noc.company_name} was rejected: ${remarks}`,
        priority: 'high',
        actionUrl: '/noc',
        payload: { noc_id: nocId },
      });
    }
  } catch (err) {
    // swallow
  }

  prisma.auditLog.create({
    data: {
      tenant_id: noc.tenant_id,
      user_id: userId,
      action: 'reject_completion_certificate',
      module: 'noc',
      target_type: 'noc_requests',
      target_id: nocId,
      details: `Rejected internship completion certificate for ${noc.company_name}: ${remarks}`,
    },
  }).catch((err) => logger.error({ err }, 'Audit log failed'));

  return updated;
}

// Student-safe option source for the NOC create form: existing companies (Name select),
// plus previously-used cities and designations (datalist autocomplete). Read-only, tenant-scoped.
export async function getNocFieldSuggestions(tenantId: string) {
  const [companyRows, cityRows, designationRows] = await Promise.all([
    prisma.company.findMany({
      where: { tenant_id: tenantId },
      // Enriched so the student NOC form can auto-populate an existing company's details on select
      // (address/city/state/pan/gst + one picked recruiter's contact). Company has no pincode column.
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        state: true,
        pan: true,
        gst: true,
        recruiters: {
          select: { name: true, phone: true, designation: true, email: true, verification_status: true },
          orderBy: { created_at: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
      take: 500,
    }),
    prisma.nocRequest.findMany({
      where: { tenant_id: tenantId, company_city: { not: null } },
      select: { company_city: true },
      distinct: ['company_city'],
      take: 200,
    }),
    prisma.nocRequest.findMany({
      where: { tenant_id: tenantId, contact_person_designation: { not: null } },
      select: { contact_person_designation: true },
      distinct: ['contact_person_designation'],
      take: 200,
    }),
  ]);

  // Attach a single representative recruiter per company (verified-else-earliest, same helper the NOC
  // create flow uses) and drop the raw recruiters array so the payload stays bounded.
  const companies = companyRows.map((company) => ({
    id: company.id,
    name: company.name,
    address: company.address ?? null,
    city: company.city ?? null,
    state: company.state ?? null,
    pan: company.pan ?? null,
    gst: company.gst ?? null,
    recruiter: pickCompanyRecruiter(company.recruiters),
  }));

  const cities = cityRows
    .map((r) => r.company_city)
    .filter((v): v is string => Boolean(v && v.trim()))
    .sort((a, b) => a.localeCompare(b));
  const designations = designationRows
    .map((r) => r.contact_person_designation)
    .filter((v): v is string => Boolean(v && v.trim()))
    .sort((a, b) => a.localeCompare(b));

  return { companies, cities, designations };
}

// Whitelist of sortable columns → Prisma orderBy. Never inject sort_by raw into Prisma.
function getNocOrderBy(sortBy?: string, sortOrder: 'asc' | 'desc' = 'asc'): Prisma.NocRequestOrderByWithRelationInput {
  switch (sortBy) {
    case 'student': return { student: { full_name: sortOrder } };
    case 'noc_type': return { noc_type: sortOrder };
    case 'company': return { company: { name: sortOrder } };
    case 'program': return { program: sortOrder };
    case 'status': return { status: sortOrder };
    case 'start_date': return { start_date: sortOrder };
    case 'created_at': return { created_at: sortOrder };
    default: return { created_at: sortOrder };
  }
}

export async function getNocs(
  tenantId: string,
  filters: QueryNocInput,
  user: Express.AuthUser,
  scope?: Express.ScopeFilters
) {
  const { page, limit, status, statuses, search, noc_type, completion_status, sort_by, sort_order, posting_type, institute, course, branch, academic_year, date_from, date_to } = filters;
  const where: Record<string, unknown> = { tenant_id: tenantId };

  if (statuses?.length) where.status = { in: statuses };
  else if (status) where.status = status;
  if (noc_type) where.noc_type = noc_type;
  // Completion-certificate review tab: filter by the submitted completion status.
  if (completion_status) where.completion_status = completion_status;
  // FILTER COUNTER EXPORT — program is the posting-type value; student-scope + created_at range.
  if (posting_type) where.program = { equals: posting_type, mode: 'insensitive' };
  const nocScope = buildStudentScopeConditions({ institute, course, branch, academic_year });
  if (nocScope.length > 0) where.student = { is: { AND: nocScope } };
  const nocDateRange = buildDateRangeCondition(date_from, date_to);
  if (nocDateRange) where.created_at = nocDateRange;
  // Free-text search — scalar NOC columns + student/company relations. Nested-relation clauses live in
  // `where.OR`, so they don't collide with the top-level `where.student` scope filter (they AND).
  if (search) {
    where.OR = [
      { company_name: { contains: search, mode: 'insensitive' } },
      { role_title: { contains: search, mode: 'insensitive' } },
      { program: { contains: search, mode: 'insensitive' } },
      { noc_number: { contains: search, mode: 'insensitive' } },
      { student: { is: { full_name: { contains: search, mode: 'insensitive' } } } },
      { student: { is: { enrollment_number: { contains: search, mode: 'insensitive' } } } },
      { company: { is: { name: { contains: search, mode: 'insensitive' } } } },
    ];
  }

  const orderBy = getNocOrderBy(sort_by, sort_order);
  const include = {
    student: { select: NOC_STUDENT_SELECT },
    company: { select: NOC_COMPANY_RECRUITER_SELECT },
    previous_noc: { select: { noc_number: true } },
  } as const;

  // Faculty coordinators are scoped to their assigned students (institute/course/branch,
  // tolerant match). Filter in-memory then paginate so a department/course mismatch can't
  // silently hide their students' NOCs.
  if (user.role === 'faculty_coordinator') {
    const facultyScope = resolveFacultyScope(user);
    if (!facultyScope.hasScope) {
      return { data: [], pagination: paginate(page, limit, 0) };
    }
    const all = await prisma.nocRequest.findMany({ where, orderBy, include });
    const scoped = all.filter((noc) => studentMatchesFacultyScope(noc.student, facultyScope));
    const start = (page - 1) * limit;
    return {
      data: scoped.slice(start, start + limit).map(contactWithRecruiterFallback),
      pagination: paginate(page, limit, scoped.length),
    };
  }

  const [nocs, total] = await Promise.all([
    prisma.nocRequest.findMany({ where, ...buildPrismaQuery(page, limit), orderBy, include }),
    prisma.nocRequest.count({ where }),
  ]);

  return { data: nocs.map(contactWithRecruiterFallback), pagination: paginate(page, limit, total) };
}

export interface FacultyNocSummary {
  pending_faculty: number;
  approved_forwarded: number;
  approved_by_tpo: number;
  rejected_by_dept: number;
  rejected_by_tpo: number;
  total: number;
}

/**
 * Department-wide NOC counts for the faculty coordinator's dashboard stat cards. The rejected-by-dept vs
 * rejected-by-tpo split needs `faculty_approved_at`, which the list query can't express, so this is a
 * dedicated aggregate (loads only status + faculty_approved_at + scope fields, filtered by faculty scope).
 */
export async function getFacultyNocSummary(
  tenantId: string,
  user: Express.AuthUser
): Promise<FacultyNocSummary> {
  const empty: FacultyNocSummary = {
    pending_faculty: 0,
    approved_forwarded: 0,
    approved_by_tpo: 0,
    rejected_by_dept: 0,
    rejected_by_tpo: 0,
    total: 0,
  };
  if (user.role !== 'faculty_coordinator') return empty;
  const facultyScope = resolveFacultyScope(user);
  if (!facultyScope.hasScope) return empty;

  const rows = await prisma.nocRequest.findMany({
    where: { tenant_id: tenantId },
    select: {
      status: true,
      faculty_approved_at: true,
      student: { select: { department: true, branch: true, course: true, institute: true } },
    },
  });
  const scoped = rows.filter((noc) => studentMatchesFacultyScope(noc.student, facultyScope));

  const summary: FacultyNocSummary = { ...empty, total: scoped.length };
  for (const noc of scoped) {
    if (noc.status === 'pending_faculty') summary.pending_faculty += 1;
    if (noc.status === 'pending_tpo' || noc.status === 'approved' || noc.status === 'issued') summary.approved_forwarded += 1;
    if (noc.status === 'approved' || noc.status === 'issued') summary.approved_by_tpo += 1;
    if (noc.status === 'rejected' && !noc.faculty_approved_at) summary.rejected_by_dept += 1;
    if (noc.status === 'rejected' && noc.faculty_approved_at) summary.rejected_by_tpo += 1;
  }
  return summary;
}

export async function getNocById(
  nocId: string,
  user: Express.AuthUser,
  scope?: Express.ScopeFilters
) {
  const noc = await prisma.nocRequest.findFirst({
    where: {
      id: nocId,
      tenant_id: user.tenant_id,
    },
    include: {
      student: { select: NOC_STUDENT_SELECT },
      company: { select: NOC_COMPANY_RECRUITER_SELECT },
      faculty_approved_by_user: { select: { id: true, name: true } },
      tpo_approved_by_user: { select: { id: true, name: true } },
      previous_noc: { select: { noc_number: true } },
    },
  });

  if (!noc) throw new NotFoundError('NOC Request');

  if (user.role === 'faculty_coordinator') {
    const facultyScope = resolveFacultyScope(user);
    if (!studentMatchesFacultyScope(noc.student, facultyScope)) {
      throw new NotFoundError('NOC Request');
    }
  }

  return contactWithRecruiterFallback(noc);
}

export async function createNoc(userId: string, tenantId: string, data: CreateNocInput) {
  const student = await prisma.student.findUnique({ where: { user_id: userId } });
  if (!student) throw new NotFoundError('Student profile');

  // Re-issue: the new record supersedes an already-issued NOC (student changed companies). It shares the
  // previous NOC's reference number, becomes the Active record, and pushes the prior versions to Inactive.
  // The re-issued NOC MUST be generated under the SAME posting type as the previous NOC — so `program` is
  // inherited from the previous NOC (identified by its number), NOT from the student's submitted `data.program`.
  let resolvedProgram: string;
  let reissueGroupNumber: string | null = null;
  if (data.is_reissue) {
    const previous = await prisma.nocRequest.findFirst({
      where: { id: data.previous_noc_id ?? '', tenant_id: tenantId, student_id: student.id },
      select: { id: true, status: true, noc_number: true, program: true },
    });
    if (!previous || previous.status !== 'issued' || !previous.noc_number) {
      throw new BusinessRuleError(
        'Select a valid issued NOC to re-issue.',
        'INVALID_REISSUE_TARGET'
      );
    }
    // Force the re-issue onto the previous NOC's posting type (ignore any submitted data.program).
    resolvedProgram = previous.program;
    reissueGroupNumber = previous.noc_number;

    // Limit: at most 4 re-issues per NOC number.
    const reissueCount = await prisma.nocRequest.count({
      where: { tenant_id: tenantId, noc_number: reissueGroupNumber, is_reissue: true },
    });
    if (reissueCount >= NOC_REISSUE_LIMIT) {
      throw new BusinessRuleError(
        `This NOC has already been re-issued the maximum of ${NOC_REISSUE_LIMIT} times.`,
        'NOC_REISSUE_LIMIT_REACHED'
      );
    }
  } else {
    const normalizedProgram = normalizeNocProgramValue(data.program);
    const postingType = await prisma.masterOption.findFirst({
      where: {
        tenant_id: tenantId,
        category: 'posting_type',
        normalized_value: normalizedProgram,
        is_active: true,
      },
      select: { value: true },
    });
    const legacyProgram = LEGACY_NOC_PROGRAMS.get(normalizedProgram);
    const derivedProgram = postingType?.value ?? legacyProgram;

    if (!derivedProgram) {
      throw new BusinessRuleError('Please select a valid posting type from masters', 'INVALID_NOC_PROGRAM');
    }
    resolvedProgram = derivedProgram;

    // A normal NOC cannot duplicate an already-issued one for the same posting type (a re-issue is the path
    // for that).
    const alreadyIssued = await prisma.nocRequest.findFirst({
      where: {
        tenant_id: tenantId,
        student_id: student.id,
        program: resolvedProgram,
        status: 'issued',
      },
      select: { id: true },
    });

    if (alreadyIssued) {
      throw new BusinessRuleError(
        'An NOC has already been issued for this posting type.',
        'NOC_ALREADY_ISSUED'
      );
    }
  }

  // Find-or-create a real Company record so a student-sourced employer becomes a
  // verifiable entity. Matched company → link, never overwrite (fill only empty
  // pan/gst/city/state). No match → create as source=student, pending verification.
  const matchedCompany = await prisma.company.findFirst({
    where: {
      tenant_id: tenantId,
      name: {
        equals: data.company_name,
        mode: 'insensitive',
      },
    },
    select: { id: true, pan: true, gst: true, city: true, state: true },
  });

  let companyId: string;
  if (matchedCompany) {
    companyId = matchedCompany.id;
    const fillData: Record<string, string> = {};
    if (!matchedCompany.pan && data.company_pan) fillData.pan = data.company_pan;
    if (!matchedCompany.gst && data.company_gst) fillData.gst = data.company_gst;
    if (!matchedCompany.city && data.company_city) fillData.city = data.company_city;
    if (!matchedCompany.state && data.company_state) fillData.state = data.company_state;
    if (Object.keys(fillData).length > 0) {
      await prisma.company.update({ where: { id: companyId }, data: fillData }).catch((err) => {
        logger.error({ err }, 'NOC company fill-if-empty failed');
      });
    }
  } else {
    const createdCompany = await prisma.company.create({
      data: {
        tenant_id: tenantId,
        name: data.company_name,
        address: data.company_address,
        city: data.company_city,
        state: data.company_state,
        pan: data.company_pan,
        gst: data.company_gst,
        source: CompanySource.student,
        verification_status: CompanyVerificationStatus.pending,
      },
      select: { id: true },
    });
    companyId = createdCompany.id;
  }

  const companyVerificationStatus =
    data.placement_source === 'university_drive' || matchedCompany
      ? CompanyVerificationStatus.verified
      : CompanyVerificationStatus.pending;

  // University-drive NOCs don't collect a contact person (only company + role are prefilled from the
  // offer). Recover the recruiter from the resolved company so the record, report, and issued
  // certificate carry recruiter details. Fill-empty only — never overwrite a student-entered value.
  let recruiterContact: RecruiterContactFields | null = null;
  const needsRecruiterContact =
    !data.contact_person_name ||
    !data.contact_person_phone ||
    !data.contact_person_designation ||
    !data.contact_person_email;
  if (needsRecruiterContact) {
    const companyRecruiters = await prisma.recruiter
      .findMany({
        where: { tenant_id: tenantId, company_id: companyId },
        orderBy: { created_at: 'asc' },
        select: { name: true, phone: true, designation: true, email: true, verification_status: true },
      })
      .catch((err) => {
        logger.error({ err }, 'NOC recruiter fallback lookup failed');
        return [] as CompanyRecruiterLite[];
      });
    recruiterContact = pickCompanyRecruiter(companyRecruiters);
  }

  const nocData = {
    tenant_id: tenantId,
    student_id: student.id,
    noc_type: data.noc_type as NocType,
    internship_type: data.internship_type ?? null,
    program: resolvedProgram,
    placement_source: data.placement_source as PlacementSource,
    drive_id: data.drive_id,
    company_id: companyId,
    company_name: data.company_name,
    company_address: data.company_address,
    company_city: data.company_city,
    company_state: data.company_state,
    company_pincode: data.company_pincode,
    company_pan: data.company_pan,
    company_gst: data.company_gst,
    supporting_document_url: data.supporting_document_url,
    supporting_document_name: data.supporting_document_name,
    company_verification_status: companyVerificationStatus,
    contact_person_name: data.contact_person_name || recruiterContact?.name || null,
    contact_person_designation: data.contact_person_designation || recruiterContact?.designation || null,
    contact_person_phone: data.contact_person_phone || recruiterContact?.phone || null,
    contact_person_email: data.contact_person_email || recruiterContact?.email || null,
    reference_by: data.reference_by,
    reference_details: data.reference_details,
    role_title: data.role_title,
    technology_domain: data.technology_domain,
    job_description: data.job_description,
    stipend_amount: data.stipend_amount,
    start_date: data.start_date,
    end_date: data.end_date,
    duration_weeks: data.duration_weeks,
    offer_letter_url: data.offer_letter_url,
    // Re-issue: share the previous NOC's number and become the active record. A fresh NOC leaves
    // noc_number null (assigned at issue) and is active by default.
    is_reissue: data.is_reissue,
    previous_noc_id: data.is_reissue ? data.previous_noc_id : null,
    reason_for_company_change: data.is_reissue ? data.reason_for_company_change ?? null : null,
    termination_letter_url: data.is_reissue ? data.termination_letter_url ?? null : null,
    termination_letter_name: data.is_reissue ? data.termination_letter_name ?? null : null,
    noc_number: reissueGroupNumber,
    is_active: true,
  };
  const includeApprovers = {
    faculty_approved_by_user: { select: { id: true, name: true } },
    tpo_approved_by_user: { select: { id: true, name: true } },
  } as const;

  const created = reissueGroupNumber
    ? await prisma.$transaction(async (tx) => {
        // Supersede every prior record sharing this number, then create the new active version.
        await tx.nocRequest.updateMany({
          where: { tenant_id: tenantId, noc_number: reissueGroupNumber },
          data: { is_active: false },
        });
        return tx.nocRequest.create({ data: nocData, include: includeApprovers });
      })
    : await prisma.nocRequest.create({ data: nocData, include: includeApprovers });

  try {
    const facultyCandidates = await prisma.user.findMany({
      where: {
        tenant_id: tenantId,
        role: 'faculty_coordinator',
        is_active: true,
      },
      select: { id: true, department: true, courses: true, branches: true, institutes: true },
    });
    // Notify only faculty whose assignment scope covers this student (institute/course/branch).
    const facultyUsers = facultyCandidates.filter((faculty) =>
      studentMatchesFacultyScope(
        { department: student.department, branch: student.branch, course: student.course, institute: student.institute },
        resolveFacultyScope(faculty),
      ),
    );
    if (facultyUsers.length > 0) {
      void notifyManyUsers({
        tenantId,
        type: 'noc',
        title: `${student.full_name} raised an NOC request`,
        description: `${resolvedProgram} • ${data.company_name}`,
        priority: 'medium',
        actionUrl: '/faculty/noc-approvals',
        payload: { noc_id: created.id, student_id: student.id, program: resolvedProgram },
        userIds: facultyUsers.map((u) => u.id),
      });
    }
  } catch (err) {
    // swallow
  }

  return created;
}

export async function facultyApprove(
  nocId: string,
  data: ApproveNocInput,
  user: Express.AuthUser,
  scope?: Express.ScopeFilters
) {
  const noc = await prisma.nocRequest.findUnique({
    where: { id: nocId },
    include: { student: { select: { department: true, branch: true, course: true, institute: true } } },
  });
  if (!noc) throw new NotFoundError('NOC Request');

  if (
    user.role === 'faculty_coordinator'
    && !studentMatchesFacultyScope(noc.student, resolveFacultyScope(user))
  ) {
    throw new AuthorizationError('You can only act on NOC requests from your assigned students', 'ROLE_NOT_ALLOWED');
  }

  if (noc.status !== 'pending_faculty') {
    throw new BusinessRuleError('NOC is not pending faculty approval', 'INVALID_NOC_STATUS');
  }

  const updated = await prisma.nocRequest.update({
    where: { id: nocId },
    data: {
      status: 'pending_tpo' as NocStatus,
      faculty_approved_by: user.id,
      faculty_approved_at: new Date(),
      faculty_remarks: data.remarks,
    },
  });

  void notifyTpoAudience({
    tenantId: noc.tenant_id,
    type: 'noc',
    title: 'NOC request awaiting TPO approval',
    description: data.remarks ? `Faculty remarks: ${data.remarks}` : undefined,
    priority: 'medium',
    actionUrl: '/admin/noc',
    payload: { noc_id: nocId },
  });

  return updated;
}

// Best-effort: when an NOC is issued, the linked company is considered verified.
// Wrapped so a failure here can never break issuance.
async function markLinkedCompanyVerified(companyId: string | null | undefined) {
  if (!companyId) return;
  try {
    await prisma.company.update({
      where: { id: companyId },
      data: { verification_status: CompanyVerificationStatus.verified },
    });
  } catch (err) {
    logger.error({ err }, 'NOC issue: linked company verify flip failed');
  }
}

// Best-effort: when a NOC for a NEW (student-sourced, un-provisioned) company is approved, create a
// Recruiter record from the contact person and link it to the company. Record-only (no login user) —
// an admin can provision a login later via the recruiter flow (which re-links a user_id-null recruiter).
// Wrapped so a failure here can never break issuance.
async function createRecruiterForApprovedNoc(
  noc: {
    company_id: string | null;
    tenant_id: string;
    contact_person_name: string | null;
    contact_person_email: string | null;
    contact_person_phone: string | null;
    contact_person_designation: string | null;
  },
  verifiedByUserId?: string,
) {
  try {
    const name = noc.contact_person_name?.trim();
    const email = noc.contact_person_email?.trim();
    if (!noc.company_id || !name || !email) return; // Recruiter requires name + email

    const company = await prisma.company.findUnique({
      where: { id: noc.company_id },
      select: { source: true },
    });
    if (company?.source !== CompanySource.student) return; // only new / student-sourced employers

    const alreadyHasRecruiter = await prisma.recruiter.findFirst({
      where: { company_id: noc.company_id },
      select: { id: true },
    });
    if (alreadyHasRecruiter) return; // company already provisioned → skip (idempotent)

    await prisma.recruiter.create({
      data: {
        company_id: noc.company_id,
        tenant_id: noc.tenant_id,
        name,
        email,
        phone: noc.contact_person_phone ?? null,
        designation: noc.contact_person_designation ?? null,
        verification_status: VerificationStatus.verified, // TPO approved → treat as verified
        verified_by: verifiedByUserId ?? null,
        verified_at: new Date(),
        // user_id omitted (null) — no login; provision later via the admin recruiter flow.
      },
    });
  } catch (err) {
    logger.error({ err }, 'NOC approval: recruiter auto-create failed');
  }
}

export async function tpoApprove(nocId: string, data: ApproveNocInput, userId: string) {
  const noc = await prisma.nocRequest.findUnique({ where: { id: nocId } });
  if (!noc) throw new NotFoundError('NOC Request');

  if (noc.status !== 'pending_tpo') {
    throw new BusinessRuleError('NOC is not pending TPO approval', 'INVALID_NOC_STATUS');
  }

  const nocForCertificate = await prisma.nocRequest.findUnique({
    where: { id: nocId },
    include: {
      student: {
        select: {
          full_name: true,
          enrollment_number: true,
          department: true,
          branch: true,
          batch: true,
          current_semester: true,
          course: true,
          institute: true,
        },
      },
    },
  });

  if (!nocForCertificate) throw new NotFoundError('NOC Request');

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const artifact = await generateNocCertificateArtifact({
      tenant_id: nocForCertificate.tenant_id,
      program: nocForCertificate.program,
      noc_number: nocForCertificate.noc_number,
      contact_person_name: nocForCertificate.contact_person_name,
      contact_person_designation: nocForCertificate.contact_person_designation,
      student: nocForCertificate.student,
      company_name: nocForCertificate.company_name,
      company_address: nocForCertificate.company_address,
      company_city: nocForCertificate.company_city,
      company_state: nocForCertificate.company_state,
      company_pincode: nocForCertificate.company_pincode,
      role_title: nocForCertificate.role_title,
      start_date: nocForCertificate.start_date,
      end_date: nocForCertificate.end_date,
    });

    try {
      const updated = await prisma.nocRequest.update({
        where: { id: nocId },
        data: {
          status: 'issued' as NocStatus,
          tpo_approved_by: userId,
          tpo_approved_at: artifact.issueDate,
          tpo_remarks: data.remarks,
          issued_at: artifact.issueDate,
          noc_number: artifact.referenceNumber,
          certificate_url: artifact.certificateUrl,
          certificate_snapshot: artifact.certificateSnapshot,
          noc_template_id: artifact.nocTemplateId,
          company_verification_status: CompanyVerificationStatus.verified,
        },
      });

      await markLinkedCompanyVerified(noc.company_id);
      await createRecruiterForApprovedNoc(noc, userId);

      prisma.auditLog.create({
        data: {
          tenant_id: nocForCertificate.tenant_id,
          user_id: userId,
          action: 'issue_noc',
          module: 'noc',
          target_type: 'noc_requests',
          target_id: nocId,
          details: `Issued NOC: ${artifact.referenceNumber}`,
        },
      }).catch(err => logger.error({ err }, 'Audit log failed'));

      try {
        const studentUser = await prisma.student.findUnique({
          where: { id: noc.student_id },
          select: { user_id: true },
        });
        if (studentUser?.user_id) {
          void createNotification({
            userId: studentUser.user_id,
            tenantId: noc.tenant_id,
            type: 'noc',
            title: 'Your NOC has been issued',
            description: `Reference: ${artifact.referenceNumber}`,
            priority: 'high',
            actionUrl: '/noc',
            payload: { noc_id: nocId, reference_number: artifact.referenceNumber },
          });
        }
      } catch (err) {
        // swallow
      }

      return updated;
    } catch (error) {
      await fs.unlink(artifact.certificateFilePath).catch(() => undefined);
      const uniqueError = error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002';
      if (uniqueError && attempt < 2) {
        continue;
      }
      throw error;
    }
  }

  throw new BusinessRuleError('Unable to generate a unique NOC reference number', 'NOC_REFERENCE_CONFLICT');
}

export async function rejectNoc(
  nocId: string,
  data: RejectNocInput,
  user: Express.AuthUser,
  scope?: Express.ScopeFilters
) {
  const noc = await prisma.nocRequest.findUnique({
    where: { id: nocId },
    include: { student: { select: { department: true, branch: true, course: true, institute: true } } },
  });
  if (!noc) throw new NotFoundError('NOC Request');

  if (
    user.role === 'faculty_coordinator'
    && !studentMatchesFacultyScope(noc.student, resolveFacultyScope(user))
  ) {
    throw new AuthorizationError('You can only act on NOC requests from your assigned students', 'ROLE_NOT_ALLOWED');
  }

  if (['issued', 'rejected'].includes(noc.status)) {
    throw new BusinessRuleError('NOC cannot be rejected at this stage', 'INVALID_NOC_STATUS');
  }

  // Rejecting an active re-issue must return the previously superseded (valid) NOC to Active, so the
  // student never loses their standing NOC because a re-issue attempt failed.
  const revertPrevious = noc.is_reissue && noc.is_active && !!noc.noc_number;
  const updated = revertPrevious
    ? await prisma.$transaction(async (tx) => {
        const rejected = await tx.nocRequest.update({
          where: { id: nocId },
          data: {
            status: 'rejected' as NocStatus,
            rejected_at: new Date(),
            rejection_reason: data.rejection_reason,
            is_active: false,
          },
        });
        const previousActive = await tx.nocRequest.findFirst({
          where: {
            tenant_id: noc.tenant_id,
            noc_number: noc.noc_number,
            id: { not: nocId },
            status: { not: 'rejected' as NocStatus },
          },
          orderBy: { created_at: 'desc' },
          select: { id: true },
        });
        if (previousActive) {
          await tx.nocRequest.update({ where: { id: previousActive.id }, data: { is_active: true } });
        }
        return rejected;
      })
    : await prisma.nocRequest.update({
        where: { id: nocId },
        data: {
          status: 'rejected' as NocStatus,
          rejected_at: new Date(),
          rejection_reason: data.rejection_reason,
        },
      });

  try {
    const studentUser = await prisma.student.findUnique({
      where: { id: noc.student_id },
      select: { user_id: true },
    });
    if (studentUser?.user_id) {
      void createNotification({
        userId: studentUser.user_id,
        tenantId: noc.tenant_id,
        type: 'noc',
        title: 'Your NOC request was rejected',
        description: `Reason: ${data.rejection_reason}`,
        priority: 'high',
        actionUrl: '/noc',
        payload: { noc_id: nocId, rejection_reason: data.rejection_reason, by_role: user.role },
      });
    }
  } catch (err) {
    // swallow
  }

  return updated;
}

export async function issueNoc(nocId: string, userId: string) {
  const noc = await prisma.nocRequest.findUnique({
    where: { id: nocId },
    include: {
      student: {
        select: {
          id: true,
          full_name: true,
          enrollment_number: true,
          department: true,
          branch: true,
          batch: true,
          current_semester: true,
          course: true,
          institute: true,
        },
      },
    },
  });
  if (!noc) throw new NotFoundError('NOC Request');

  if (noc.status !== 'approved') {
    throw new BusinessRuleError('Only approved NOCs can be issued', 'INVALID_NOC_STATUS');
  }
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const artifact = await generateNocCertificateArtifact({
      tenant_id: noc.tenant_id,
      program: noc.program,
      noc_number: noc.noc_number,
      contact_person_name: noc.contact_person_name,
      contact_person_designation: noc.contact_person_designation,
      student: {
        full_name: noc.student.full_name,
        enrollment_number: noc.student.enrollment_number,
        department: noc.student.department,
        branch: noc.student.branch ?? noc.student.department,
        batch: noc.student.batch,
        current_semester: noc.student.current_semester,
        course: noc.student.course,
        institute: noc.student.institute,
      },
      company_name: noc.company_name,
      company_address: noc.company_address,
      company_city: noc.company_city,
      company_state: noc.company_state,
      company_pincode: noc.company_pincode,
      role_title: noc.role_title,
      start_date: noc.start_date,
      end_date: noc.end_date,
    });

    try {
      const updated = await prisma.nocRequest.update({
        where: { id: nocId },
        data: {
          status: 'issued' as NocStatus,
          noc_number: artifact.referenceNumber,
          issued_at: artifact.issueDate,
          certificate_url: artifact.certificateUrl,
          certificate_snapshot: artifact.certificateSnapshot,
          noc_template_id: artifact.nocTemplateId,
          company_verification_status: CompanyVerificationStatus.verified,
        },
      });

      await markLinkedCompanyVerified(noc.company_id);
      await createRecruiterForApprovedNoc(noc, userId);

      prisma.auditLog.create({
        data: {
          tenant_id: noc.tenant_id,
          user_id: userId,
          action: 'issue_noc',
          module: 'noc',
          target_type: 'noc_requests',
          target_id: nocId,
          details: `Issued NOC: ${artifact.referenceNumber}`,
        },
      }).catch(err => logger.error({ err }, 'Audit log failed'));

      return updated;
    } catch (error) {
      await fs.unlink(artifact.certificateFilePath).catch(() => undefined);
      const uniqueError = error && typeof error === 'object' && 'code' in error && (error as { code?: string }).code === 'P2002';
      if (uniqueError && attempt < 2) {
        continue;
      }
      throw error;
    }
  }

  throw new BusinessRuleError('Unable to generate a unique NOC reference number', 'NOC_REFERENCE_CONFLICT');
}
