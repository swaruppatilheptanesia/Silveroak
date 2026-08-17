import { prisma } from '../../config/database';
import { ValidationError } from '../../shared/errors';
import { matchesStudentTargeting, matchesStudentTargetingForMaster, normalizeComparable } from '../../shared/utils/student-targeting';

type ReportQuery = Record<string, string | string[] | undefined>;

const SHORTLISTED_STAGES = new Set([
  'shortlisted',
  'test_scheduled',
  'interview',
  'hr_round',
  'offer_released',
]);

const APPLICATION_STAGES = [
  'applied',
  'mock_round',
  'shortlisted',
  'test_scheduled',
  'interview',
  'hr_round',
  'offer_released',
  'rejected',
] as const;

const PENDING_NOC_STATUSES = new Set([
  'pending_faculty',
  'pending_tpo',
  'pending_company_verification',
]);

const DRIVE_TYPES = new Set(['campus_drive', 'internship_drive', 'test_assessment']);

function getQueryValue(query: ReportQuery, key: string) {
  const value = query[key];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function getQueryStrings(query: ReportQuery, key: string) {
  const value = query[key];
  const values = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? [value]
      : [];

  return Array.from(
    new Set(
      values
        .flatMap((entry) => entry.split(','))
        .map((entry) => entry.trim())
        .filter(Boolean),
    ),
  );
}

function getQueryString(query: ReportQuery, key: string) {
  const value = getQueryValue(query, key);
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getPostingTypeQuery(query: ReportQuery) {
  return getQueryString(query, 'posting_type') ?? getQueryString(query, 'type');
}

function getQueryNumber(query: ReportQuery, key: string) {
  const value = getQueryString(query, key);
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function getQueryBoolean(query: ReportQuery, key: string) {
  const value = getQueryString(query, key);
  if (!value) return undefined;
  if (['true', '1', 'yes'].includes(value.toLowerCase())) return true;
  if (['false', '0', 'no'].includes(value.toLowerCase())) return false;
  return undefined;
}

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function textMatches(value: string | null | undefined, filter?: string) {
  if (!filter) return true;
  if (!value) return false;

  const haystack = normalize(value);
  const needle = normalize(filter);
  return haystack.includes(needle) || needle.includes(haystack);
}

function dateMatches(value: Date | string | null | undefined, range?: { from?: Date; to?: Date }) {
  if (!range?.from && !range?.to) return true;
  if (!value) return false;

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return false;

  if (range.from && date < range.from) return false;
  if (range.to) {
    const end = new Date(range.to);
    end.setHours(23, 59, 59, 999);
    if (date > end) return false;
  }
  return true;
}

function parseDateRange(query: ReportQuery) {
  const explicitFrom = getQueryString(query, 'from') ?? getQueryString(query, 'start_date');
  const explicitTo = getQueryString(query, 'to') ?? getQueryString(query, 'end_date');
  const raw = getQueryString(query, 'date_range') ?? getQueryString(query, 'dateRange');

  let from = explicitFrom ? new Date(explicitFrom) : undefined;
  let to = explicitTo ? new Date(explicitTo) : undefined;

  if (raw) {
    const parts = raw
      .split(/[,|]/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts[0]) {
      from = new Date(parts[0]);
    }
    if (parts[1]) {
      to = new Date(parts[1]);
    }
  }

  return {
    from: from && !Number.isNaN(from.getTime()) ? from : undefined,
    to: to && !Number.isNaN(to.getTime()) ? to : undefined,
  };
}

function toNumber(value: unknown) {
  if (value == null) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toNullableNumber(value: unknown) {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function daysBetween(date: Date | string | null | undefined, now = new Date()) {
  if (!date) return 0;
  const target = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(target.getTime())) return 0;
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

type StudentBaseLike = {
  id: string;
  enrollment_number: string;
  roll_number: string | null;
  full_name: string;
  email: string;
  mobile: string | null;
  department: string;
  batch: string;
  verification_status: string;
  profile_completion_percentage: number;
  academic_profile?: {
    cgpa: unknown;
    backlog_count: number;
  } | null;
};

function mapStudentBase(student: StudentBaseLike) {
  return {
    student_id: student.id,
    full_name: student.full_name,
    roll_number: student.roll_number ?? student.enrollment_number,
    enrollment_number: student.enrollment_number,
    email: student.email,
    mobile: student.mobile,
    department: student.department,
    batch: student.batch,
    verification_status: student.verification_status,
    profile_completion_percentage: student.profile_completion_percentage,
    cgpa: toNumber(student.academic_profile?.cgpa),
    backlog_count: student.academic_profile?.backlog_count ?? 0,
  };
}

type CompanyBaseLike = {
  id: string;
  name: string;
  industry: string | null;
  address: string | null;
  website: string | null;
  status: string;
  classification: string;
  internal_remarks: string | null;
};

function mapCompanyBase(company: CompanyBaseLike) {
  return {
    company_id: company.id,
    name: company.name,
    company_name: company.name,
    industry: company.industry,
    address: company.address,
    website: company.website,
    status: company.status,
    classification: company.classification,
    internal_remarks: company.internal_remarks,
  };
}

function mapPostingBase(posting: {
  id: string;
  title: string;
  academic_year: string;
  role_name: string;
  location: string;
  work_mode: string;
  application_start_date: Date | null;
  application_end_date: Date | null;
  status: string;
  published_at: Date | null;
  closed_at: Date | null;
  company: { id: string; name: string; industry: string | null };
  posting_type_master?: { value: string } | null;
}) {
  return {
    posting_id: posting.id,
    title: posting.title,
    posting_title: posting.title,
    company_id: posting.company.id,
    company_name: posting.company.name,
    company_industry: posting.company.industry,
    type: posting.posting_type_master?.value ?? '',
    academic_year: posting.academic_year,
    role_name: posting.role_name,
    location: posting.location,
    work_mode: posting.work_mode,
    application_start_date: posting.application_start_date,
    application_end_date: posting.application_end_date,
    status: posting.status,
    published_at: posting.published_at,
    closed_at: posting.closed_at,
  };
}

function mapOfferBase(offer: {
  id: string;
  type: string;
  role: string;
  ctc: string | null;
  stipend: string | null;
  location: string | null;
  offer_date: Date;
  status: string;
  accepted_at: Date | null;
  rejected_at: Date | null;
  rejection_reason: string | null;
  rejection_remarks: string | null;
  rejected_by: string | null;
  joining_status: string;
  joining_date: Date | null;
  dnj_reason: string | null;
  is_locked: boolean;
  compliance_status: string;
  applications_blocked: boolean;
  admin_override_enabled: boolean;
  created_at: Date;
  updated_at: Date;
  student: { id: string; full_name: string; enrollment_number: string; department: string; batch: string };
  company: { id: string; name: string };
  posting: { id: string; title: string; academic_year: string; posting_type_master?: { value: string } | null };
  audit_trail?: Array<{
    action: string;
    details: string | null;
    performed_at: Date;
    performed_by_user: { name: string } | null;
  }>;
}) {
  const joiningAudit = offer.audit_trail?.find((entry) => entry.action.startsWith('joining_')) ?? null;
  const overrideAudit = offer.audit_trail?.find((entry) => entry.action === 'compliance_override_enabled') ?? null;

  return {
    offer_id: offer.id,
    student_id: offer.student.id,
    student_name: offer.student.full_name,
    enrollment_number: offer.student.enrollment_number,
    department: offer.student.department,
    batch: offer.student.batch,
    company_id: offer.company.id,
    company_name: offer.company.name,
    posting_id: offer.posting.id,
    posting_title: offer.posting.title,
    academic_year: offer.posting.academic_year,
    posting_type: offer.posting.posting_type_master?.value ?? '',
    type: offer.type,
    role: offer.role,
    ctc: offer.ctc,
    stipend: offer.stipend,
    location: offer.location,
    offer_date: offer.offer_date,
    status: offer.status,
    accepted_at: offer.accepted_at,
    rejected_at: offer.rejected_at,
    rejection_reason: offer.rejection_reason,
    rejection_remarks: offer.rejection_remarks,
    rejected_by: offer.rejected_by,
    joining_status: offer.joining_status,
    joining_date: offer.joining_date,
    joining_verified_by: joiningAudit?.performed_by_user?.name ?? null,
    joining_verified_at: joiningAudit?.performed_at ?? null,
    dnj_reason: offer.dnj_reason,
    is_locked: offer.is_locked,
    compliance_status: offer.compliance_status,
    applications_blocked: offer.applications_blocked,
    admin_override_enabled: offer.admin_override_enabled,
    admin_override_by: overrideAudit?.performed_by_user?.name ?? null,
    admin_override_at: overrideAudit?.performed_at ?? null,
    created_at: offer.created_at,
    updated_at: offer.updated_at,
  };
}

function mapInternshipBase(internship: {
  id: string;
  company_id: string | null;
  company_name: string;
  role: string;
  department: string | null;
  internship_type: string;
  status: string;
  start_date: Date;
  end_date: Date | null;
  stipend_amount: unknown | null;
  stipend_frequency: string | null;
  is_receiving_stipend: boolean;
  certificate_uploaded: boolean;
  certificate_url: string | null;
  created_at: Date;
  updated_at: Date;
  student: {
    id: string;
    full_name: string;
    enrollment_number: string;
    department: string;
    batch: string;
    verification_status: string;
  };
  company: { id: string; name: string } | null;
}) {
  return {
    internship_id: internship.id,
    student_id: internship.student.id,
    student_name: internship.student.full_name,
    enrollment_number: internship.student.enrollment_number,
    department: internship.department ?? internship.student.department,
    batch: internship.student.batch,
    company_id: internship.company?.id ?? internship.company_id,
    company_name: internship.company?.name ?? internship.company_name,
    role: internship.role,
    internship_type: internship.internship_type,
    status: internship.status,
    start_date: internship.start_date,
    end_date: internship.end_date,
    stipend_amount: toNullableNumber(internship.stipend_amount),
    stipend_frequency: internship.stipend_frequency,
    is_receiving_stipend: internship.is_receiving_stipend,
    certificate_uploaded: internship.certificate_uploaded,
    certificate_url: internship.certificate_url,
    verification_status: internship.student.verification_status,
    created_at: internship.created_at,
    updated_at: internship.updated_at,
  };
}

function mapAnnouncementBase(announcement: {
  id: string;
  title: string;
  priority: string;
  status: string;
  target_audience_type: string;
  target_batches: string[];
  target_departments: string[];
  target_posting_id: string | null;
  requires_consent: boolean;
  total_recipients: number;
  read_count: number;
  consent_count: number;
  published_at: Date | null;
  archived_at: Date | null;
}) {
  const readRate = announcement.total_recipients > 0
    ? Math.round((announcement.read_count / announcement.total_recipients) * 100)
    : 0;

  return {
    announcement_id: announcement.id,
    title: announcement.title,
    priority: announcement.priority,
    status: announcement.status,
    target_audience_type: announcement.target_audience_type,
    target_batches: announcement.target_batches,
    target_departments: announcement.target_departments,
    target_posting_id: announcement.target_posting_id,
    requires_consent: announcement.requires_consent,
    total_recipients: announcement.total_recipients,
    read_count: announcement.read_count,
    consent_count: announcement.consent_count,
    read_rate: readRate,
    published_at: announcement.published_at,
    archived_at: announcement.archived_at,
  };
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10;
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const raw = sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  return Math.round(raw * 10) / 10;
}

function minPositive(values: number[]) {
  const positives = values.filter((value) => value > 0);
  return positives.length > 0 ? Math.min(...positives) : 0;
}

function countBy<T>(items: T[], keyFn: (item: T) => string) {
  const counts = new Map<string, number>();
  items.forEach((item) => {
    const key = keyFn(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return counts;
}

function groupBy<T>(items: T[], keyFn: (item: T) => string) {
  const groups = new Map<string, T[]>();
  items.forEach((item) => {
    const key = keyFn(item);
    const next = groups.get(key) ?? [];
    next.push(item);
    groups.set(key, next);
  });
  return groups;
}

function isPlacedOffer(offer: {
  status: string;
  joining_status: string;
}) {
  return (offer.status === 'accepted' || offer.joining_status === 'joined') && offer.joining_status !== 'did_not_join';
}

function isAcceptedOffer(offer: { status: string }) {
  return offer.status === 'accepted';
}

function isJoinedOffer(offer: { joining_status: string }) {
  return offer.joining_status === 'joined';
}

function isDidNotJoinOffer(offer: { joining_status: string }) {
  return offer.joining_status === 'did_not_join';
}

function buildCompanySummaryStats(companies: Array<{ status: string; classification: string }>) {
  return {
    total: companies.length,
    active: companies.filter((company) => company.status === 'active').length,
    preferred: companies.filter((company) => company.classification === 'preferred').length,
    blacklisted: companies.filter((company) => company.classification === 'blacklisted').length,
  };
}

function matchesSelectedValues(value: string | number | null | undefined, selectedValues: string[]) {
  if (selectedValues.length === 0) {
    return true;
  }

  if (value === null || value === undefined || value === '') {
    return false;
  }

  const normalizedValue = normalizeComparable(String(value));
  return selectedValues.some((selectedValue) => {
    const normalizedSelected = normalizeComparable(selectedValue);
    return normalizedValue === normalizedSelected
      || normalizedValue.includes(normalizedSelected)
      || normalizedSelected.includes(normalizedValue);
  });
}

function parseMoneyValue(value: string | null | undefined) {
  if (!value) return null;
  const normalized = value.replace(/,/g, '').match(/\d+(?:\.\d+)?/)?.[0];
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function getStudentTargetContext(student: {
  institute: string | null;
  course: string | null;
  department: string;
  academic_profile?: { semester: number | null } | null;
}) {
  return {
    institute: student.institute,
    course: student.course,
    branch: student.department,
    semester: student.academic_profile?.semester ?? null,
  };
}

function studentMatchesSelection(student: {
  institute: string | null;
  course: string | null;
  department: string;
  academic_profile?: { semester: number | null } | null;
}, filters: {
  institutes: string[];
  courses: string[];
  branches: string[];
  semesters: string[];
}) {
  return matchesSelectedValues(student.institute, filters.institutes)
    && matchesSelectedValues(student.course, filters.courses)
    && matchesSelectedValues(student.department, filters.branches)
    && matchesSelectedValues(student.academic_profile?.semester ?? null, filters.semesters);
}

// =========================================================
// Student Management Reports
// =========================================================

export async function getInterestedStudentsReport(tenantId: string, query: ReportQuery = {}) {
  const interestType = getQueryString(query, 'interest_type');
  const department = getQueryString(query, 'department');
  const minCgpa = getQueryNumber(query, 'min_cgpa');
  const verifiedOnly = getQueryBoolean(query, 'verified_only');

  const registrations = await prisma.interestRegistration.findMany({
    where: {
      status: { not: 'withdrawn' },
      student: {
        tenant_id: tenantId,
      },
      ...(interestType ? { interest_type: interestType as never } : {}),
    },
    include: {
      student: {
        include: {
          academic_profile: true,
        },
      },
    },
    orderBy: [
      { registered_at: 'desc' },
      { student: { full_name: 'asc' } },
    ],
  });

  const students = registrations.filter((registration) => {
    if (department && !textMatches(registration.student.department, department)) {
      return false;
    }

    if (verifiedOnly && registration.student.verification_status !== 'verified') {
      return false;
    }

    if (typeof minCgpa === 'number') {
      const cgpa = toNullableNumber(registration.student.academic_profile?.cgpa);
      if (cgpa == null || cgpa < minCgpa) {
        return false;
      }
    }

    return true;
  }).map((registration) => ({
    ...mapStudentBase(registration.student),
    interest_type: registration.interest_type,
    registered_at: registration.registered_at,
  }));

  const stats = {
    total: students.length,
    verified: students.filter((student) => student.verification_status === 'verified').length,
    pending: students.filter((student) => student.verification_status === 'pending').length,
    rejected: students.filter((student) => student.verification_status === 'rejected').length,
  };

  return { students, stats };
}

export async function getEligibilityReport(tenantId: string, query: ReportQuery = {}) {
  const department = getQueryString(query, 'department');
  const batch = getQueryString(query, 'batch');

  const students = await prisma.student.findMany({
    where: {
      tenant_id: tenantId,
      ...(department ? { department: { contains: department, mode: 'insensitive' } } : {}),
      ...(batch ? { batch: { contains: batch, mode: 'insensitive' } } : {}),
    },
    include: {
      academic_profile: true,
    },
    orderBy: { full_name: 'asc' },
  });

  const rows = students.map((student) => {
    const cgpa = toNullableNumber(student.academic_profile?.cgpa);
    const backlogCount = student.academic_profile?.backlog_count ?? 0;

    let status = 'not_eligible';
    if (cgpa != null && cgpa >= 7 && backlogCount === 0) {
      status = 'eligible';
    } else if (cgpa != null && cgpa >= 6 && cgpa < 7 && backlogCount <= 1) {
      status = 'conditional';
    }

    return {
      ...mapStudentBase(student),
      eligibility_status: status,
    };
  });

  const stats = {
    eligible: rows.filter((row) => row.eligibility_status === 'eligible').length,
    conditional: rows.filter((row) => row.eligibility_status === 'conditional').length,
    not_eligible: rows.filter((row) => row.eligibility_status === 'not_eligible').length,
    total: rows.length,
  };

  return { students: rows, stats };
}

export async function getRegistrationSummaryReport(tenantId: string, query: ReportQuery = {}) {
  const academicYear = getQueryString(query, 'academic_year');

  const registrations = await prisma.interestRegistration.findMany({
    where: {
      status: { not: 'withdrawn' },
      student: {
        tenant_id: tenantId,
      },
    },
    include: {
      student: {
        select: {
          id: true,
          full_name: true,
          enrollment_number: true,
          department: true,
          batch: true,
          verification_status: true,
        },
      },
    },
  });

  const filtered = registrations.filter((registration) => {
    if (!academicYear) return true;
    return textMatches(registration.student.batch, academicYear);
  });

  // Group dynamically by the registered posting type (interest_type holds the posting-type master
  // value — a free string that includes legacy/admin-created values), instead of the four hardcoded
  // interest buckets. Each distinct value becomes one summary row keyed by its normalized value.
  const groups = new Map<string, {
    interest_type: string;
    label: string;
    count: number;
    verified: number;
    pending: number;
    rejected: number;
  }>();

  filtered.forEach((registration) => {
    const rawValue = (registration.interest_type ?? '').trim();
    if (!rawValue) return;

    const key = normalize(rawValue);
    const entry = groups.get(key) ?? {
      interest_type: rawValue,
      label: rawValue.replace(/_/g, ' '),
      count: 0,
      verified: 0,
      pending: 0,
      rejected: 0,
    };

    entry.count += 1;
    const status = registration.student.verification_status;
    if (status === 'verified') entry.verified += 1;
    else if (status === 'pending') entry.pending += 1;
    else if (status === 'rejected') entry.rejected += 1;

    groups.set(key, entry);
  });

  const summary = Array.from(groups.values())
    .map((entry) => ({ ...entry, academic_year: academicYear ?? null }))
    .sort((a, b) => b.count - a.count);

  return {
    summary,
    total_students: new Set(filtered.map((registration) => registration.student.id)).size,
  };
}

export async function getProfileCompletionReport(tenantId: string, query: ReportQuery = {}) {
  const department = getQueryString(query, 'department');
  const batch = getQueryString(query, 'batch');

  const students = await prisma.student.findMany({
    where: {
      tenant_id: tenantId,
      ...(department ? { department: { contains: department, mode: 'insensitive' } } : {}),
      ...(batch ? { batch: { contains: batch, mode: 'insensitive' } } : {}),
    },
    select: {
      id: true,
      full_name: true,
      enrollment_number: true,
      roll_number: true,
      department: true,
      batch: true,
      verification_status: true,
      profile_completion_percentage: true,
    },
    orderBy: { full_name: 'asc' },
  });

  const bands = [
    { label: '100%', min: 100, max: 100 },
    { label: '80-99%', min: 80, max: 99 },
    { label: '50-79%', min: 50, max: 79 },
    { label: 'Below 50%', min: 0, max: 49 },
  ].map((band) => {
    const studentsInBand = students.filter((student) => (
      student.profile_completion_percentage >= band.min
      && student.profile_completion_percentage <= band.max
    ));

    return {
      label: band.label,
      min: band.min,
      max: band.max,
      count: studentsInBand.length,
      students: studentsInBand.map((student) => ({
        student_id: student.id,
        full_name: student.full_name,
        enrollment_number: student.enrollment_number,
        roll_number: student.roll_number ?? student.enrollment_number,
        department: student.department,
        batch: student.batch,
        verification_status: student.verification_status,
        profile_completion_percentage: student.profile_completion_percentage,
      })),
    };
  });

  const departments = Array.from(
    countBy(students, (student) => student.department).entries()
  ).map(([departmentName, count]) => {
    const deptStudents = students.filter((student) => student.department === departmentName);
    const avgCompletion = average(deptStudents.map((student) => student.profile_completion_percentage));
    return {
      department: departmentName,
      count,
      avg_completion: avgCompletion,
    };
  }).sort((a, b) => b.count - a.count);

  return {
    profile_completion: bands.map((band) => ({
      range: band.label,
      count: band.count,
    })),
    bands,
    departments,
    students,
  };
}

// =========================================================
// Employer Reports
// =========================================================

export async function getCompanyMasterReport(tenantId: string, query: ReportQuery = {}) {
  const status = getQueryString(query, 'status');
  const industry = getQueryString(query, 'industry');
  const search = getQueryString(query, 'search');

  const companies = await prisma.company.findMany({
    where: {
      tenant_id: tenantId,
    },
    include: {
      _count: {
        select: {
          recruiters: true,
          engagements: true,
          postings: true,
          offers: true,
          events: true,
          internships: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const filtered = companies.filter((company) => {
    if (status && !textMatches(company.status, status)) {
      return false;
    }
    if (industry && !textMatches(company.industry, industry)) {
      return false;
    }
    if (search && !(
      textMatches(company.name, search)
      || textMatches(company.industry, search)
      || textMatches(company.address, search)
    )) {
      return false;
    }
    return true;
  }).map((company) => ({
    ...mapCompanyBase(company),
    recruiters_count: company._count.recruiters,
    engagements_count: company._count.engagements,
    postings_count: company._count.postings,
    offers_count: company._count.offers,
    events_count: company._count.events,
    internships_count: company._count.internships,
  }));

  return {
    companies: filtered,
    stats: buildCompanySummaryStats(companies),
  };
}

export async function getRecruiterListReport(tenantId: string, query: ReportQuery = {}) {
  const companyId = getQueryString(query, 'company_id');
  const verificationStatus = getQueryString(query, 'verification_status');
  const search = getQueryString(query, 'search');

  const recruiters = await prisma.recruiter.findMany({
    where: {
      tenant_id: tenantId,
      ...(companyId ? { company_id: companyId } : {}),
      ...(verificationStatus ? { verification_status: verificationStatus as never } : {}),
    },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          industry: true,
        },
      },
    },
    orderBy: [{ company: { name: 'asc' } }, { name: 'asc' }],
  });

  const filtered = recruiters.filter((recruiter) => {
    if (!search) return true;
    return (
      textMatches(recruiter.name, search)
      || textMatches(recruiter.email, search)
      || textMatches(recruiter.designation, search)
      || textMatches(recruiter.company.name, search)
    );
  }).map((recruiter) => ({
    recruiter_id: recruiter.id,
    name: recruiter.name,
    email: recruiter.email,
    phone: recruiter.phone,
    designation: recruiter.designation,
    verification_status: recruiter.verification_status,
    company_id: recruiter.company.id,
    company_name: recruiter.company.name,
    company_industry: recruiter.company.industry,
  }));

  return {
    recruiters: filtered,
    stats: {
      total: recruiters.length,
      verified: recruiters.filter((recruiter) => recruiter.verification_status === 'verified').length,
      pending: recruiters.filter((recruiter) => recruiter.verification_status === 'pending').length,
      rejected: recruiters.filter((recruiter) => recruiter.verification_status === 'rejected').length,
    },
  };
}

export async function getEngagementHistoryReport(tenantId: string, query: ReportQuery = {}) {
  const companyId = getQueryString(query, 'company_id');
  const engagementType = getQueryString(query, 'type');
  const academicYear = getQueryString(query, 'academic_year');
  const search = getQueryString(query, 'search');
  const dateRange = parseDateRange(query);

  const engagements = await prisma.companyEngagement.findMany({
    where: {
      tenant_id: tenantId,
      ...(companyId ? { company_id: companyId } : {}),
      ...(engagementType ? { visitor_type: engagementType as never } : {}),
      ...(academicYear ? { academic_year: { contains: academicYear, mode: 'insensitive' } } : {}),
    },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          industry: true,
        },
      },
    },
    orderBy: { date: 'desc' },
  });

  const filtered = engagements.filter((engagement) => {
    if (!dateMatches(engagement.date, dateRange)) {
      return false;
    }
    if (search && !(
      textMatches(engagement.company.name, search)
      || textMatches(engagement.visitor_type, search)
      || textMatches(engagement.academic_year, search)
      || textMatches(engagement.remarks, search)
    )) {
      return false;
    }
    return true;
  }).map((engagement) => ({
    engagement_id: engagement.id,
    company_id: engagement.company.id,
    company_name: engagement.company.name,
    company_industry: engagement.company.industry,
    type: engagement.visitor_type,
    academic_year: engagement.academic_year,
    date: engagement.date,
    students_hired: engagement.students_hired,
    packages_offered: engagement.packages_offered,
    remarks: engagement.remarks,
  }));

  const typeCounts = countBy(filtered, (engagement) => engagement.type);

  return {
    engagements: filtered,
    stats: {
      placement: typeCounts.get('placement') ?? 0,
      internship: typeCounts.get('internship') ?? 0,
      campus_visit: typeCounts.get('campus_visit') ?? 0,
      guest_lecture: typeCounts.get('guest_lecture') ?? 0,
      workshop: typeCounts.get('workshop') ?? 0,
      total_hired: filtered.reduce((sum, engagement) => sum + (engagement.students_hired ?? 0), 0),
    },
  };
}

export async function getCompanyClassificationReport(tenantId: string, query: ReportQuery = {}) {
  const classification = getQueryString(query, 'classification');
  const search = getQueryString(query, 'search');

  const companies = await prisma.company.findMany({
    where: { tenant_id: tenantId },
    include: {
      _count: {
        select: {
          recruiters: true,
          engagements: true,
          postings: true,
          offers: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const filtered = companies.filter((company) => {
    if (classification && !textMatches(company.classification, classification)) {
      return false;
    }
    if (search && !(
      textMatches(company.name, search)
      || textMatches(company.industry, search)
      || textMatches(company.internal_remarks, search)
    )) {
      return false;
    }
    return true;
  }).map((company) => ({
    ...mapCompanyBase(company),
    recruiters_count: company._count.recruiters,
    engagements_count: company._count.engagements,
    postings_count: company._count.postings,
    offers_count: company._count.offers,
  }));

  return {
    companies: filtered,
    stats: buildCompanySummaryStats(companies),
  };
}

// =========================================================
// Posting Reports
// =========================================================

export async function getActivePostingsReport(tenantId: string, query: ReportQuery = {}) {
  const postingType = getQueryString(query, 'type');
  const academicYear = getQueryString(query, 'academic_year');
  const search = getQueryString(query, 'search');

  const postings = await prisma.posting.findMany({
    where: {
      tenant_id: tenantId,
      status: 'published',
      ...(postingType ? { posting_type_master: { is: { value: postingType } } } : {}),
      ...(academicYear ? { academic_year: { contains: academicYear, mode: 'insensitive' } } : {}),
    },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          industry: true,
        },
      },
      _count: {
        select: {
          applications: true,
          offers: true,
          events: true,
        },
      },
    },
    orderBy: [{ published_at: 'desc' }, { created_at: 'desc' }],
  });

  const filtered = postings.filter((posting) => {
    if (search && !(
      textMatches(posting.title, search)
      || textMatches(posting.role_name, search)
      || textMatches(posting.company.name, search)
      || textMatches(posting.location, search)
    )) {
      return false;
    }
    return true;
  }).map((posting) => {
    const daysLeft = posting.application_end_date ? daysBetween(posting.application_end_date) : 0;
    return {
      ...mapPostingBase(posting),
      applications_count: posting._count.applications,
      offers_count: posting._count.offers,
      events_count: posting._count.events,
      days_left: posting.application_end_date ? daysLeft : null,
    };
  });

  return {
    postings: filtered,
    stats: {
      active: filtered.length,
      jobs: filtered.filter((posting) => posting.type === 'job').length,
      internships: filtered.filter((posting) => posting.type === 'internship').length,
      stipend_internships: filtered.filter((posting) => posting.type === 'stipend_internship').length,
      closing_this_week: filtered.filter((posting) => {
        const daysLeft = posting.days_left ?? 0;
        return daysLeft > 0 && daysLeft <= 7;
      }).length,
    },
  };
}

export async function getPostingHistoryReport(tenantId: string, query: ReportQuery = {}) {
  const postingType = getQueryString(query, 'type');
  const academicYear = getQueryString(query, 'academic_year');
  const status = getQueryString(query, 'status');
  const search = getQueryString(query, 'search');

  const postings = await prisma.posting.findMany({
    where: {
      tenant_id: tenantId,
      ...(postingType ? { posting_type_master: { is: { value: postingType } } } : {}),
      ...(academicYear ? { academic_year: { contains: academicYear, mode: 'insensitive' } } : {}),
      ...(status ? { status: status as never } : {}),
    },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          industry: true,
        },
      },
      _count: {
        select: {
          applications: true,
          offers: true,
        },
      },
    },
    orderBy: [{ academic_year: 'desc' }, { created_at: 'desc' }],
  });

  const filtered = postings.filter((posting) => {
    if (search && !(
      textMatches(posting.title, search)
      || textMatches(posting.role_name, search)
      || textMatches(posting.company.name, search)
    )) {
      return false;
    }
    return true;
  }).map((posting) => ({
    ...mapPostingBase(posting),
    applications_count: posting._count.applications,
    offers_count: posting._count.offers,
  }));

  const byYear = Array.from(
    countBy(filtered, (posting) => posting.academic_year).entries()
  ).map(([year, count]) => {
    const items = filtered.filter((posting) => posting.academic_year === year);
    return {
      year,
      count,
      jobs: items.filter((posting) => posting.type === 'job').length,
      internships: items.filter((posting) => posting.type === 'internship' || posting.type === 'stipend_internship').length,
    };
  }).sort((a, b) => b.year.localeCompare(a.year));

  return {
    postings: filtered,
    by_year: byYear,
    stats: {
      total: filtered.length,
      draft: filtered.filter((posting) => posting.status === 'draft').length,
      published: filtered.filter((posting) => posting.status === 'published').length,
      closed: filtered.filter((posting) => posting.status === 'closed').length,
    },
  };
}

export async function getPostingSummaryReport(tenantId: string, query: ReportQuery = {}) {
  const academicYear = getQueryString(query, 'academic_year');

  const postings = await prisma.posting.findMany({
    where: {
      tenant_id: tenantId,
      ...(academicYear ? { academic_year: { contains: academicYear, mode: 'insensitive' } } : {}),
    },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          industry: true,
        },
      },
    },
  });

  const filtered = postings.map((posting) => mapPostingBase(posting));

  const jobs = filtered.filter((posting) => posting.type === 'job');
  const internships = filtered.filter((posting) => posting.type === 'internship');
  const stipendInternships = filtered.filter((posting) => posting.type === 'stipend_internship');

  const byYear = Array.from(
    countBy(filtered, (posting) => posting.academic_year).entries()
  ).map(([year]) => {
    const yearPostings = filtered.filter((posting) => posting.academic_year === year);
    return {
      year,
      jobs: yearPostings.filter((posting) => posting.type === 'job').length,
      internships: yearPostings.filter((posting) => posting.type === 'internship' || posting.type === 'stipend_internship').length,
    };
  }).sort((a, b) => b.year.localeCompare(a.year));

  return {
    summary: {
      jobs: {
        total: jobs.length,
        draft: jobs.filter((posting) => posting.status === 'draft').length,
        published: jobs.filter((posting) => posting.status === 'published').length,
        closed: jobs.filter((posting) => posting.status === 'closed').length,
      },
      internships: {
        total: internships.length,
        draft: internships.filter((posting) => posting.status === 'draft').length,
        published: internships.filter((posting) => posting.status === 'published').length,
        closed: internships.filter((posting) => posting.status === 'closed').length,
      },
      stipendInternships: {
        total: stipendInternships.length,
        draft: stipendInternships.filter((posting) => posting.status === 'draft').length,
        published: stipendInternships.filter((posting) => posting.status === 'published').length,
        closed: stipendInternships.filter((posting) => posting.status === 'closed').length,
      },
      total: filtered.length,
    },
    by_year: byYear,
    postings: filtered,
  };
}

// =========================================================
// Event, NOC, and ATS Reports
// =========================================================

export async function getEventAttendanceReport(tenantId: string, query: ReportQuery = {}) {
  const eventId = getQueryString(query, 'event_id');
  const type = getQueryString(query, 'type');
  const status = getQueryString(query, 'status');
  const branch = getQueryString(query, 'branch');
  const search = getQueryString(query, 'search');
  const dateRange = parseDateRange(query);

  const events = await prisma.event.findMany({
    where: {
      tenant_id: tenantId,
      ...(eventId ? { id: eventId } : {}),
      ...(type ? { type: type as never } : {}),
      ...(status ? { status: status as never } : {}),
    },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          industry: true,
        },
      },
      panels: true,
      assigned_students: {
        include: {
          student: {
            select: {
              id: true,
              full_name: true,
              enrollment_number: true,
              department: true,
              batch: true,
            },
          },
          panel: {
            select: {
              id: true,
              panel_name: true,
              room: true,
              start_time: true,
              end_time: true,
            },
          },
          marked_by_user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { date: 'desc' },
  });

  const filtered = events.filter((event) => {
    if (!dateMatches(event.date, dateRange)) {
      return false;
    }

    if (branch) {
      const eventBranches = event.assigned_students.map((assignment) => assignment.student.department);
      const eligibleBranches = eventBranches.length > 0 ? eventBranches : [];
      const eventEligibleBranches = eligibleBranches.length > 0
        ? eligibleBranches
        : [];
      const matchesBranch = eventEligibleBranches.some((value) => textMatches(value, branch))
        || event.assigned_students.some((assignment) => textMatches(assignment.student.department, branch));
      if (!matchesBranch) {
        return false;
      }
    }

    if (search && !(
      textMatches(event.title, search)
      || textMatches(event.company.name, search)
      || textMatches(event.type, search)
      || textMatches(event.venue, search)
    )) {
      return false;
    }

    return true;
  }).map((event) => {
    const assignments = event.assigned_students.map((assignment) => {
      const panel = assignment.panel ?? null;
      return {
        student_id: assignment.student.id,
        student_name: assignment.student.full_name,
        roll_number: assignment.student.enrollment_number,
        branch: assignment.student.department,
        batch: assignment.student.batch,
        panel_id: assignment.panel_id,
        panel_name: panel?.panel_name ?? null,
        slot_time: assignment.slot_time,
        attendance: assignment.attendance,
        attendance_marked_by: assignment.marked_by_user?.name ?? null,
        attendance_marked_at: assignment.marked_at,
      };
    });

    const attendanceSummary = {
      total: assignments.length,
      present: assignments.filter((assignment) => assignment.attendance === 'present').length,
      absent: assignments.filter((assignment) => assignment.attendance === 'absent').length,
      late: assignments.filter((assignment) => assignment.attendance === 'late').length,
      pending: assignments.filter((assignment) => !assignment.attendance).length,
    };

    const attended = attendanceSummary.present + attendanceSummary.late;
    const attendanceRate = attendanceSummary.total > 0
      ? Math.round((attended / attendanceSummary.total) * 100)
      : 0;

    return {
      event_id: event.id,
      title: event.title,
      company_id: event.company.id,
      company_name: event.company.name,
      company_industry: event.company.industry,
      type: event.type,
      status: event.status,
      date: event.date,
      start_time: event.start_time,
      end_time: event.end_time,
      venue: event.venue,
      reporting_time: event.reporting_time,
      eligible_branches: event.assigned_students.map((assignment) => assignment.student.department),
      panels: event.panels.map((panel) => ({
        panel_id: panel.id,
        panel_name: panel.panel_name,
        room: panel.room,
        start_time: panel.start_time,
        end_time: panel.end_time,
        recruiters: panel.recruiters,
      })),
      assigned_students: assignments,
      attendance_summary: {
        ...attendanceSummary,
        attendance_rate: attendanceRate,
      },
    };
  });

  const allAssignments = filtered.flatMap((event) => event.assigned_students);
  const attendedCount = allAssignments.filter((assignment) => assignment.attendance === 'present' || assignment.attendance === 'late').length;

  return {
    events: filtered,
    stats: {
      total_events: filtered.length,
      total_students: allAssignments.length,
      present: allAssignments.filter((assignment) => assignment.attendance === 'present').length,
      absent: allAssignments.filter((assignment) => assignment.attendance === 'absent').length,
      late: allAssignments.filter((assignment) => assignment.attendance === 'late').length,
      pending: allAssignments.filter((assignment) => !assignment.attendance).length,
      attendance_rate: allAssignments.length > 0 ? Math.round((attendedCount / allAssignments.length) * 100) : 0,
    },
  };
}

export async function getDriveCompletionReport(tenantId: string, query: ReportQuery = {}) {
  const companyId = getQueryString(query, 'company_id');
  const search = getQueryString(query, 'search');
  const status = getQueryString(query, 'status');
  const dateRange = parseDateRange(query);

  const events = await prisma.event.findMany({
    where: {
      tenant_id: tenantId,
      ...(companyId ? { company_id: companyId } : {}),
      ...(status ? { status: status as never } : {}),
    },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          industry: true,
        },
      },
      panels: true,
      assigned_students: {
        select: {
          id: true,
          attendance: true,
        },
      },
    },
    orderBy: { date: 'desc' },
  });

  const drives = events.filter((event) => DRIVE_TYPES.has(event.type)).filter((event) => dateMatches(event.date, dateRange)).filter((event) => {
    if (!search) return true;
    return (
      textMatches(event.title, search)
      || textMatches(event.company.name, search)
      || textMatches(event.type, search)
    );
  }).map((event) => {
    const totalStudents = event.assigned_students.length;
    const attended = event.assigned_students.filter((assignment) => assignment.attendance === 'present' || assignment.attendance === 'late').length;
    const attendanceRate = totalStudents > 0 ? Math.round((attended / totalStudents) * 100) : 0;

    return {
      event_id: event.id,
      title: event.title,
      company_id: event.company.id,
      company_name: event.company.name,
      company_industry: event.company.industry,
      type: event.type,
      status: event.status,
      date: event.date,
      panels_count: event.panels.length,
      assigned_count: totalStudents,
      attended_count: attended,
      attendance_rate: attendanceRate,
    };
  });

  const totalStudents = drives.reduce((sum, drive) => sum + drive.assigned_count, 0);
  const totalAttended = drives.reduce((sum, drive) => sum + drive.attended_count, 0);

  return {
    drives,
    stats: {
      total_drives: drives.length,
      completed: drives.filter((drive) => drive.status === 'completed').length,
      total_students: totalStudents,
      attended: totalAttended,
      avg_attendance: drives.length > 0 ? Math.round((totalAttended / Math.max(totalStudents, 1)) * 100) : 0,
      completion_rate: drives.length > 0 ? Math.round((drives.filter((drive) => drive.status === 'completed').length / drives.length) * 100) : 0,
    },
  };
}

export async function getStudentParticipationReport(tenantId: string, query: ReportQuery = {}) {
  const studentId = getQueryString(query, 'student_id');
  const institute = getQueryString(query, 'institute');
  const course = getQueryString(query, 'course');
  // "branch" maps to the course-derived department column (students carry no separate branch attribute).
  const branch = getQueryString(query, 'branch') ?? getQueryString(query, 'department');
  const type = getQueryString(query, 'type');
  const search = getQueryString(query, 'search');
  const dateRange = parseDateRange(query);

  const studentWhere = {
    ...(institute ? { institute: { contains: institute, mode: 'insensitive' as const } } : {}),
    ...(course ? { course: { contains: course, mode: 'insensitive' as const } } : {}),
    ...(branch ? { department: { contains: branch, mode: 'insensitive' as const } } : {}),
  };

  const assignments = await prisma.eventStudent.findMany({
    where: {
      event: {
        tenant_id: tenantId,
        ...(type ? { type: type as never } : {}),
      },
      ...(studentId ? { student_id: studentId } : {}),
      ...(Object.keys(studentWhere).length > 0 ? { student: studentWhere } : {}),
    },
    include: {
      event: {
        select: {
          id: true,
          title: true,
          type: true,
          status: true,
          date: true,
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      student: {
        select: {
          id: true,
          full_name: true,
          enrollment_number: true,
          institute: true,
          course: true,
          department: true,
          batch: true,
        },
      },
    },
    orderBy: [{ student: { full_name: 'asc' } }, { event: { date: 'desc' } }],
  });

  const filteredAssignments = assignments.filter((assignment) => {
    if (!dateMatches(assignment.event.date, dateRange)) {
      return false;
    }

    if (search && !(
      textMatches(assignment.student.full_name, search)
      || textMatches(assignment.student.enrollment_number, search)
      || textMatches(assignment.event.title, search)
      || textMatches(assignment.event.company.name, search)
    )) {
      return false;
    }

    return true;
  });

  const studentMap = new Map<string, {
    student_id: string;
    full_name: string;
    roll_number: string;
    institute: string | null;
    course: string | null;
    branch: string;
    total_events: number;
    present: number;
    absent: number;
    late: number;
    pending: number;
    attendance_rate: number;
    events: Array<{
      event_id: string;
      event_title: string;
      company_name: string;
      type: string;
      date: Date;
      attendance: string | null;
    }>;
  }>();

  filteredAssignments.forEach((assignment) => {
    const existing = studentMap.get(assignment.student.id) ?? {
      student_id: assignment.student.id,
      full_name: assignment.student.full_name,
      roll_number: assignment.student.enrollment_number,
      institute: assignment.student.institute,
      course: assignment.student.course,
      branch: assignment.student.department,
      total_events: 0,
      present: 0,
      absent: 0,
      late: 0,
      pending: 0,
      attendance_rate: 0,
      events: [],
    };

    existing.total_events += 1;
    if (assignment.attendance === 'present') existing.present += 1;
    else if (assignment.attendance === 'absent') existing.absent += 1;
    else if (assignment.attendance === 'late') existing.late += 1;
    else existing.pending += 1;

    existing.events.push({
      event_id: assignment.event.id,
      event_title: assignment.event.title,
      company_name: assignment.event.company.name,
      type: assignment.event.type,
      date: assignment.event.date,
      attendance: assignment.attendance,
    });

    studentMap.set(assignment.student.id, existing);
  });

  const students = Array.from(studentMap.values()).map((student) => {
    const marked = student.present + student.absent + student.late;
    return {
      ...student,
      attendance_rate: marked > 0 ? Math.round(((student.present + student.late) / marked) * 100) : 0,
    };
  });

  return {
    students,
    stats: {
      total_students: students.length,
      total_participations: students.reduce((sum, student) => sum + student.total_events, 0),
      avg_events: students.length > 0 ? Number((students.reduce((sum, student) => sum + student.total_events, 0) / students.length).toFixed(1)) : 0,
      avg_rate: students.length > 0 ? Math.round(students.reduce((sum, student) => sum + student.attendance_rate, 0) / students.length) : 0,
    },
  };
}

export async function getPendingNocReport(tenantId: string, query: ReportQuery = {}) {
  const department = getQueryString(query, 'department');
  const nocType = getQueryString(query, 'type');
  const stage = getQueryString(query, 'status');
  const search = getQueryString(query, 'search');
  const dateRange = parseDateRange(query);

  const requests = await prisma.nocRequest.findMany({
    where: {
      tenant_id: tenantId,
      status: {
        in: Array.from(PENDING_NOC_STATUSES) as never,
      },
      ...(nocType ? { noc_type: nocType as never } : {}),
      ...(stage ? { status: stage as never } : {}),
    },
    include: {
      student: {
        select: {
          id: true,
          full_name: true,
          enrollment_number: true,
          department: true,
          batch: true,
        },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  const filtered = requests.filter((request) => {
    if (department && !textMatches(request.student.department, department)) {
      return false;
    }
    if (!dateMatches(request.created_at, dateRange)) {
      return false;
    }
    if (search && !(
      textMatches(request.student.full_name, search)
      || textMatches(request.student.enrollment_number, search)
      || textMatches(request.company_name, search)
    )) {
      return false;
    }
    return true;
  }).map((request) => ({
    noc_id: request.id,
    student_id: request.student.id,
    student_name: request.student.full_name,
    enrollment_number: request.student.enrollment_number,
    department: request.student.department,
    batch: request.student.batch,
    noc_type: request.noc_type,
    program: request.program,
    placement_source: request.placement_source,
    company_name: request.company_name,
    role_title: request.role_title,
    status: request.status,
    created_at: request.created_at,
    days_pending: daysBetween(request.created_at),
    company_verification_status: request.company_verification_status,
  }));

  return {
    requests: filtered,
    stats: {
      total: requests.length,
      at_faculty: requests.filter((request) => request.status === 'pending_faculty').length,
      at_tpo: requests.filter((request) => request.status === 'pending_tpo').length,
      at_verification: requests.filter((request) => request.status === 'pending_company_verification').length,
      overdue: requests.filter((request) => daysBetween(request.created_at) > 7).length,
    },
  };
}

export async function getIssuedNocRegisterReport(tenantId: string, query: ReportQuery = {}) {
  const department = getQueryString(query, 'department');
  const nocType = getQueryString(query, 'type');
  const search = getQueryString(query, 'search');
  const dateRange = parseDateRange(query);

  const requests = await prisma.nocRequest.findMany({
    where: {
      tenant_id: tenantId,
      status: 'issued',
      ...(nocType ? { noc_type: nocType as never } : {}),
    },
    include: {
      student: {
        select: {
          id: true,
          full_name: true,
          enrollment_number: true,
          department: true,
          batch: true,
        },
      },
      tpo_approved_by_user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { issued_at: 'desc' },
  });

  const filtered = requests.filter((request) => {
    if (department && !textMatches(request.student.department, department)) {
      return false;
    }
    if (!dateMatches(request.issued_at ?? request.created_at, dateRange)) {
      return false;
    }
    if (search && !(
      textMatches(request.noc_number, search)
      || textMatches(request.student.full_name, search)
      || textMatches(request.student.enrollment_number, search)
      || textMatches(request.company_name, search)
    )) {
      return false;
    }
    return true;
  }).map((request) => ({
    noc_id: request.id,
    noc_number: request.noc_number,
    student_id: request.student.id,
    student_name: request.student.full_name,
    enrollment_number: request.student.enrollment_number,
    department: request.student.department,
    batch: request.student.batch,
    noc_type: request.noc_type,
    company_name: request.company_name,
    issued_at: request.issued_at,
    approved_by: request.tpo_approved_by_user?.name ?? null,
    role_title: request.role_title,
  }));

  const byType = countBy(filtered, (request) => request.noc_type);

  return {
    requests: filtered,
    stats: {
      total: filtered.length,
      unique_companies: new Set(filtered.map((request) => request.company_name)).size,
      by_type: {
        internship: byType.get('internship') ?? 0,
        training: byType.get('training') ?? 0,
        project: byType.get('project') ?? 0,
      },
    },
  };
}

export async function getNocByDepartmentReport(tenantId: string, query: ReportQuery = {}) {
  // Filter by Posting Type (NOC.program holds the posting-type master value) instead of noc_type.
  const postingType = getPostingTypeQuery(query);
  const status = getQueryString(query, 'status');
  const academicYear = getQueryString(query, 'academic_year');
  const dateRange = parseDateRange(query);

  const requests = await prisma.nocRequest.findMany({
    where: {
      tenant_id: tenantId,
    },
    include: {
      student: {
        select: {
          id: true,
          full_name: true,
          enrollment_number: true,
          department: true,
          batch: true,
        },
      },
    },
    orderBy: [{ student: { department: 'asc' } }, { student: { batch: 'desc' } }],
  });

  const filtered = requests.filter((request) => {
    if (postingType && normalize(request.program ?? '') !== normalize(postingType)) {
      return false;
    }

    if (status) {
      if (status === 'pending' && !request.status.startsWith('pending')) return false;
      if (status === 'approved' && request.status !== 'approved') return false;
      if (status === 'issued' && request.status !== 'issued') return false;
      if (status === 'rejected' && request.status !== 'rejected') return false;
    }

    if (!dateMatches(request.created_at, dateRange)) {
      return false;
    }

    if (academicYear && !textMatches(request.student.batch, academicYear)) {
      return false;
    }

    return true;
  });

  const departmentMap = new Map<string, {
    department: string;
    total: number;
    pending: number;
    approved: number;
    issued: number;
    rejected: number;
    approval_rate: number;
    batches: Map<string, {
      batch: string;
      total: number;
      pending: number;
      approved: number;
      issued: number;
      rejected: number;
    }>;
  }>();

  filtered.forEach((request) => {
    const dept = departmentMap.get(request.student.department) ?? {
      department: request.student.department,
      total: 0,
      pending: 0,
      approved: 0,
      issued: 0,
      rejected: 0,
      approval_rate: 0,
      batches: new Map(),
    };

    dept.total += 1;
    if (request.status.startsWith('pending')) dept.pending += 1;
    else if (request.status === 'approved') dept.approved += 1;
    else if (request.status === 'issued') dept.issued += 1;
    else if (request.status === 'rejected') dept.rejected += 1;

    const batch = dept.batches.get(request.student.batch) ?? {
      batch: request.student.batch,
      total: 0,
      pending: 0,
      approved: 0,
      issued: 0,
      rejected: 0,
    };

    batch.total += 1;
    if (request.status.startsWith('pending')) batch.pending += 1;
    else if (request.status === 'approved') batch.approved += 1;
    else if (request.status === 'issued') batch.issued += 1;
    else if (request.status === 'rejected') batch.rejected += 1;

    dept.batches.set(request.student.batch, batch);
    departmentMap.set(request.student.department, dept);
  });

  const departments = Array.from(departmentMap.values()).map((dept) => {
    const decided = dept.approved + dept.issued + dept.rejected;
    return {
      department: dept.department,
      total: dept.total,
      pending: dept.pending,
      approved: dept.approved,
      issued: dept.issued,
      rejected: dept.rejected,
      approval_rate: decided > 0 ? Math.round(((dept.approved + dept.issued) / decided) * 100) : 0,
      batches: Array.from(dept.batches.values()).sort((a, b) => b.batch.localeCompare(a.batch)),
    };
  }).sort((a, b) => b.total - a.total);

  return {
    departments,
    stats: {
      total: filtered.length,
      departments: departments.length,
      pending: filtered.filter((request) => request.status.startsWith('pending')).length,
      issued: filtered.filter((request) => request.status === 'issued').length,
    },
  };
}

export async function getApplicantListReport(tenantId: string, query: ReportQuery = {}) {
  const postingId = getQueryString(query, 'posting_id');
  if (!postingId) {
    throw new ValidationError('posting_id is required');
  }

  const postingType = getPostingTypeQuery(query);
  const department = getQueryString(query, 'department');
  const stage = getQueryString(query, 'stage');
  const search = getQueryString(query, 'search');
  const dateRange = parseDateRange(query);

  const applications = await prisma.application.findMany({
    where: {
      tenant_id: tenantId,
      posting_id: postingId,
      ...(postingType ? { posting: { is: { posting_type_master: { is: { value: postingType } } } } } : {}),
      ...(stage ? { current_stage: stage as never } : {}),
    },
    include: {
      student: {
        include: {
          academic_profile: true,
        },
      },
      posting: {
        select: {
          id: true,
          title: true,
          academic_year: true,
          posting_type_master: { select: { value: true } },
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      feedback: {
        orderBy: { submitted_at: 'desc' },
        take: 1,
        include: {
          recruiter: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
    orderBy: { applied_at: 'desc' },
  });

  const filtered = applications.filter((application) => {
    if (department && !textMatches(application.student.department, department)) {
      return false;
    }
    if (!dateMatches(application.applied_at, dateRange)) {
      return false;
    }
    if (search && !(
      textMatches(application.student.full_name, search)
      || textMatches(application.student.enrollment_number, search)
      || textMatches(application.posting.title, search)
      || textMatches(application.posting.company.name, search)
    )) {
      return false;
    }
    return true;
  }).map((application) => ({
    application_id: application.id,
    student_id: application.student.id,
    student_name: application.student.full_name,
    enrollment_number: application.student.enrollment_number,
    department: application.student.department,
    batch: application.student.batch,
    cgpa: toNullableNumber(application.student.academic_profile?.cgpa),
    posting_id: application.posting.id,
    posting_title: application.posting.title,
    company_name: application.posting.company.name,
    current_stage: application.current_stage,
    applied_at: application.applied_at,
    updated_at: application.updated_at,
    feedback_remarks: application.feedback[0]?.remarks ?? null,
    feedback_decision: application.feedback[0]?.decision ?? null,
    feedback_recruiter: application.feedback[0]?.recruiter?.name ?? null,
  }));

  return {
    applications: filtered,
    stats: {
      total: filtered.length,
      shortlisted: filtered.filter((application) => SHORTLISTED_STAGES.has(application.current_stage)).length,
      offers: filtered.filter((application) => application.current_stage === 'offer_released').length,
      rejected: filtered.filter((application) => application.current_stage === 'rejected').length,
    },
  };
}

export async function getStageWiseReport(tenantId: string, query: ReportQuery = {}) {
  const postingId = getQueryString(query, 'posting_id');
  const companyId = getQueryString(query, 'company_id');
  const postingType = getPostingTypeQuery(query);
  const dateRange = parseDateRange(query);

  const postingFilter = companyId || postingType
    ? {
        posting: {
          ...(companyId ? { company_id: companyId } : {}),
          ...(postingType ? { posting_type_master: { is: { value: postingType } } } : {}),
        },
      }
    : {};

  const applications = await prisma.application.findMany({
    where: {
      tenant_id: tenantId,
      ...(postingId ? { posting_id: postingId } : {}),
      ...postingFilter,
    },
    include: {
      posting: {
        select: {
          id: true,
          title: true,
          academic_year: true,
          posting_type_master: { select: { value: true } },
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  const filtered = applications.filter((application) => dateMatches(application.applied_at, dateRange));

  const byPosting = Array.from(
    groupApplicationsByPosting(filtered).values()
  ).map((posting) => ({
    posting_id: posting.posting_id,
    posting_title: posting.posting_title,
    company_name: posting.company_name,
    academic_year: posting.academic_year,
    stages: posting.stages,
    total: posting.total,
  })).sort((a, b) => b.total - a.total);

  const totalApplications = filtered.length;
  const offersMade = filtered.filter((application) => application.current_stage === 'offer_released').length;

  return {
    postings: byPosting,
    stats: {
      total_applications: totalApplications,
      opportunities: byPosting.length,
      offers_made: offersMade,
      conversion_rate: totalApplications > 0 ? Math.round((offersMade / totalApplications) * 100) : 0,
    },
  };
}

function groupApplicationsByPosting(applications: Array<{
  current_stage: string;
  posting: {
    id: string;
    title: string;
    academic_year: string;
    company: { id: string; name: string };
  };
}>) {
  const map = new Map<string, {
    posting_id: string;
    posting_title: string;
    company_name: string;
    academic_year: string;
    stages: Record<string, number>;
    total: number;
  }>();

  applications.forEach((application) => {
    const entry = map.get(application.posting.id) ?? {
      posting_id: application.posting.id,
      posting_title: application.posting.title,
      company_name: application.posting.company.name,
      academic_year: application.posting.academic_year,
      stages: APPLICATION_STAGES.reduce((acc, stage) => {
        acc[stage] = 0;
        return acc;
      }, {} as Record<string, number>),
      total: 0,
    };

    entry.stages[application.current_stage] = (entry.stages[application.current_stage] ?? 0) + 1;
    entry.total += 1;
    map.set(application.posting.id, entry);
  });

  return map;
}

export async function getShortlistRejectionReport(tenantId: string, query: ReportQuery = {}) {
  const postingId = getQueryString(query, 'posting_id');
  const companyId = getQueryString(query, 'company_id');
  const postingType = getPostingTypeQuery(query);
  const department = getQueryString(query, 'department');
  const search = getQueryString(query, 'search');

  const postingFilter = companyId || postingType
    ? {
        posting: {
          ...(companyId ? { company_id: companyId } : {}),
          ...(postingType ? { posting_type_master: { is: { value: postingType } } } : {}),
        },
      }
    : {};

  const applications = await prisma.application.findMany({
    where: {
      tenant_id: tenantId,
      ...(postingId ? { posting_id: postingId } : {}),
      ...postingFilter,
      ...(department ? { student: { department: { contains: department, mode: 'insensitive' } } } : {}),
    },
    include: {
      student: {
        select: {
          id: true,
          full_name: true,
          enrollment_number: true,
          department: true,
          batch: true,
        },
      },
      posting: {
        select: {
          id: true,
          title: true,
          academic_year: true,
          posting_type_master: { select: { value: true } },
          company: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      feedback: {
        orderBy: { submitted_at: 'desc' },
        take: 1,
        include: {
          recruiter: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  });

  const grouped = new Map<string, {
    posting_id: string;
    posting_title: string;
    company_name: string;
    academic_year: string;
    total: number;
    shortlisted: number;
    rejected: number;
    pending: number;
    shortlist_rate: number;
    rejection_rate: number;
    students: Array<{
      id: string;
      name: string;
      rollNo: string;
      department: string;
      stage: string;
      outcome: 'shortlisted' | 'rejected' | 'pending';
      remarks: string | null;
    }>;
  }>();

  applications.forEach((application) => {
    const entry = grouped.get(application.posting.id) ?? {
      posting_id: application.posting.id,
      posting_title: application.posting.title,
      company_name: application.posting.company.name,
      academic_year: application.posting.academic_year,
      total: 0,
      shortlisted: 0,
      rejected: 0,
      pending: 0,
      shortlist_rate: 0,
      rejection_rate: 0,
      students: [],
    };

    const isShortlisted = SHORTLISTED_STAGES.has(application.current_stage);
    const isRejected = application.current_stage === 'rejected';
    const outcome: 'shortlisted' | 'rejected' | 'pending' = isShortlisted
      ? 'shortlisted'
      : isRejected
        ? 'rejected'
        : 'pending';

    entry.total += 1;
    if (outcome === 'shortlisted') entry.shortlisted += 1;
    else if (outcome === 'rejected') entry.rejected += 1;
    else entry.pending += 1;

    entry.students.push({
      id: application.id,
      name: application.student.full_name,
      rollNo: application.student.enrollment_number,
      department: application.student.department,
      stage: application.current_stage,
      outcome,
      remarks: application.feedback[0]?.remarks ?? null,
    });

    grouped.set(application.posting.id, entry);
  });

  const filtered = Array.from(grouped.values()).map((entry) => {
    const decided = entry.shortlisted + entry.rejected;
    return {
      ...entry,
      shortlist_rate: decided > 0 ? Math.round((entry.shortlisted / decided) * 100) : 0,
      rejection_rate: decided > 0 ? Math.round((entry.rejected / decided) * 100) : 0,
    };
  }).sort((a, b) => b.total - a.total);

  const total = filtered.reduce((sum, posting) => sum + posting.total, 0);

  return {
    postings: filtered,
    stats: {
      total,
      shortlisted: filtered.reduce((sum, posting) => sum + posting.shortlisted, 0),
      rejected: filtered.reduce((sum, posting) => sum + posting.rejected, 0),
      pending: filtered.reduce((sum, posting) => sum + posting.pending, 0),
      overall_rate: total > 0 ? Math.round((filtered.reduce((sum, posting) => sum + posting.shortlisted, 0) / Math.max(total - filtered.reduce((sum, posting) => sum + posting.pending, 0), 1)) * 100) : 0,
    },
  };
}

// =========================================================
// Offer, Internship, Portfolio, Communication, Placement
// =========================================================

export async function getOfferAcceptanceReport(tenantId: string, query: ReportQuery = {}) {
  const academicYear = getQueryString(query, 'academic_year');
  const companyId = getQueryString(query, 'company_id');
  const department = getQueryString(query, 'department');
  const batch = getQueryString(query, 'batch');
  const postingType = getPostingTypeQuery(query);
  const search = getQueryString(query, 'search');
  const dateRange = parseDateRange(query);

  const offers = await prisma.offer.findMany({
    where: {
      tenant_id: tenantId,
      ...(companyId ? { company_id: companyId } : {}),
      ...(postingType ? { posting: { is: { posting_type_master: { is: { value: postingType } } } } } : {}),
    },
    include: {
      student: {
        select: {
          id: true,
          full_name: true,
          enrollment_number: true,
          department: true,
          batch: true,
        },
      },
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      posting: {
        select: {
          id: true,
          title: true,
          academic_year: true,
          posting_type_master: { select: { value: true } },
        },
      },
    },
    orderBy: { offer_date: 'desc' },
  });

  const filtered = offers.filter((offer) => {
    if (academicYear && !textMatches(offer.posting.academic_year, academicYear)) {
      return false;
    }
    if (department && !textMatches(offer.student.department, department)) {
      return false;
    }
    if (batch && !textMatches(offer.student.batch, batch)) {
      return false;
    }
    if (!dateMatches(offer.offer_date, dateRange)) {
      return false;
    }
    if (search && !(
      textMatches(offer.student.full_name, search)
      || textMatches(offer.student.enrollment_number, search)
      || textMatches(offer.company.name, search)
      || textMatches(offer.role, search)
    )) {
      return false;
    }
    return true;
  }).map((offer) => mapOfferBase(offer));

  const companies = Array.from(
    countBy(filtered, (offer) => offer.company_name).entries()
  ).map(([companyName]) => {
    const companyOffers = filtered.filter((offer) => offer.company_name === companyName);
    const accepted = companyOffers.filter((offer) => isAcceptedOffer(offer)).length;
    return {
      company_name: companyName,
      total: companyOffers.length,
      pending: companyOffers.filter((offer) => offer.status === 'pending_student_action').length,
      accepted,
      rejected: companyOffers.filter((offer) => offer.status === 'rejected_by_admin').length,
      acceptance_rate: companyOffers.length > 0 ? Math.round((accepted / companyOffers.length) * 100) : 0,
    };
  }).sort((a, b) => b.total - a.total);

  return {
    offers: filtered,
    companies,
    stats: {
      total: filtered.length,
      pending: filtered.filter((offer) => offer.status === 'pending_student_action').length,
      accepted: filtered.filter((offer) => isAcceptedOffer(offer)).length,
      rejected: filtered.filter((offer) => offer.status === 'rejected_by_admin').length,
      rate: filtered.length > 0 ? Math.round((filtered.filter((offer) => isAcceptedOffer(offer)).length / filtered.length) * 100) : 0,
    },
  };
}

export async function getJoiningStatusReport(tenantId: string, query: ReportQuery = {}) {
  const academicYear = getQueryString(query, 'academic_year');
  const companyId = getQueryString(query, 'company_id');
  const department = getQueryString(query, 'department');
  const batch = getQueryString(query, 'batch');
  const postingType = getPostingTypeQuery(query);
  const search = getQueryString(query, 'search');
  const dateRange = parseDateRange(query);

  const offers = await prisma.offer.findMany({
    where: {
      tenant_id: tenantId,
      status: 'accepted',
      ...(companyId ? { company_id: companyId } : {}),
      ...(postingType ? { posting: { is: { posting_type_master: { is: { value: postingType } } } } } : {}),
    },
    include: {
      student: {
        select: {
          id: true,
          full_name: true,
          enrollment_number: true,
          department: true,
          batch: true,
        },
      },
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      posting: {
        select: {
          id: true,
          title: true,
          academic_year: true,
          posting_type_master: { select: { value: true } },
        },
      },
      audit_trail: {
        orderBy: { performed_at: 'desc' },
        include: {
          performed_by_user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: { offer_date: 'desc' },
  });

  const filtered = offers.filter((offer) => {
    if (academicYear && !textMatches(offer.posting.academic_year, academicYear)) {
      return false;
    }
    if (department && !textMatches(offer.student.department, department)) {
      return false;
    }
    if (batch && !textMatches(offer.student.batch, batch)) {
      return false;
    }
    if (!dateMatches(offer.offer_date, dateRange)) {
      return false;
    }
    if (search && !(
      textMatches(offer.student.full_name, search)
      || textMatches(offer.student.enrollment_number, search)
      || textMatches(offer.company.name, search)
      || textMatches(offer.role, search)
    )) {
      return false;
    }
    return true;
  }).map((offer) => mapOfferBase(offer));

  return {
    offers: filtered,
    stats: {
      total: filtered.length,
      joined: filtered.filter((offer) => isJoinedOffer(offer)).length,
      pending: filtered.filter((offer) => offer.joining_status === 'pending').length,
      dnj: filtered.filter((offer) => isDidNotJoinOffer(offer)).length,
      rate: filtered.length > 0 ? Math.round((filtered.filter((offer) => isJoinedOffer(offer)).length / filtered.length) * 100) : 0,
    },
  };
}

export async function getComplianceReport(tenantId: string, query: ReportQuery = {}) {
  const department = getQueryString(query, 'department');
  const postingType = getPostingTypeQuery(query);
  const search = getQueryString(query, 'search');

  const offers = await prisma.offer.findMany({
    where: {
      tenant_id: tenantId,
      ...(postingType ? { posting: { is: { posting_type_master: { is: { value: postingType } } } } } : {}),
    },
    include: {
      student: {
        select: {
          id: true,
          full_name: true,
          enrollment_number: true,
          department: true,
          batch: true,
        },
      },
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      posting: {
        select: {
          id: true,
          title: true,
          academic_year: true,
          posting_type_master: { select: { value: true } },
        },
      },
      audit_trail: {
        orderBy: { performed_at: 'desc' },
        include: {
          performed_by_user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: { offer_date: 'desc' },
  });

  const filtered = offers.filter((offer) => {
    if (department && !textMatches(offer.student.department, department)) {
      return false;
    }
    if (search && !(
      textMatches(offer.student.full_name, search)
      || textMatches(offer.student.enrollment_number, search)
      || textMatches(offer.company.name, search)
      || textMatches(offer.role, search)
    )) {
      return false;
    }
    return true;
  }).map((offer) => mapOfferBase(offer));

  return {
    offers: filtered,
    stats: {
      total: filtered.length,
      compliant: filtered.filter((offer) => offer.compliance_status === 'compliant').length,
      blocked: filtered.filter((offer) => offer.compliance_status === 'blocked').length,
      overrides: filtered.filter((offer) => offer.compliance_status === 'override_enabled').length,
      rate: filtered.length > 0 ? Math.round((filtered.filter((offer) => offer.compliance_status === 'compliant').length / filtered.length) * 100) : 0,
    },
  };
}

export async function getInternshipStatusReport(tenantId: string, query: ReportQuery = {}) {
  const department = getQueryString(query, 'department');
  const companyId = getQueryString(query, 'company_id');
  const internshipType = getQueryString(query, 'type');
  const status = getQueryString(query, 'status');
  const search = getQueryString(query, 'search');
  const dateRange = parseDateRange(query);

  const internships = await prisma.internship.findMany({
    where: {
      tenant_id: tenantId,
      ...(companyId ? { company_id: companyId } : {}),
      ...(department ? { department: { contains: department, mode: 'insensitive' } } : {}),
      ...(internshipType ? { internship_type: internshipType as never } : {}),
      ...(status ? { status: status as never } : {}),
    },
    include: {
      student: {
        select: {
          id: true,
          full_name: true,
          enrollment_number: true,
          department: true,
          batch: true,
          verification_status: true,
        },
      },
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { start_date: 'desc' },
  });

  const filtered = internships.filter((internship) => {
    if (!dateMatches(internship.start_date, dateRange)) {
      return false;
    }
    if (search && !(
      textMatches(internship.student.full_name, search)
      || textMatches(internship.student.enrollment_number, search)
      || textMatches(internship.company?.name ?? internship.company_name, search)
      || textMatches(internship.role, search)
    )) {
      return false;
    }
    return true;
  }).map((internship) => mapInternshipBase(internship));

  return {
    internships: filtered,
    stats: {
      total: filtered.length,
      ongoing: filtered.filter((internship) => internship.status === 'ongoing').length,
      completed: filtered.filter((internship) => internship.status === 'completed').length,
      discontinued: filtered.filter((internship) => internship.status === 'discontinued').length,
    },
  };
}

export async function getCertificatePendingReport(tenantId: string, query: ReportQuery = {}) {
  const department = getQueryString(query, 'department');
  const companyId = getQueryString(query, 'company_id');
  const batch = getQueryString(query, 'batch');
  const search = getQueryString(query, 'search');
  const dueWindow = getQueryString(query, 'due_window');

  const internships = await prisma.internship.findMany({
    where: {
      tenant_id: tenantId,
      certificate_uploaded: false,
      status: {
        not: 'discontinued',
      },
      ...(companyId ? { company_id: companyId } : {}),
      ...(department ? { department: { contains: department, mode: 'insensitive' } } : {}),
    },
    include: {
      student: {
        select: {
          id: true,
          full_name: true,
          enrollment_number: true,
          department: true,
          batch: true,
          verification_status: true,
        },
      },
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { end_date: 'asc' },
  });

  const now = new Date();
  const pending = internships
    .map((internship) => {
      const daysRemaining = internship.end_date ? daysBetween(internship.end_date, now) : 0;
      return {
        ...mapInternshipBase(internship),
        days_remaining: daysRemaining,
      };
    })
    .filter((internship) => {
      if (batch && !textMatches(internship.batch, batch)) {
        return false;
      }
      if (search && !(
        textMatches(internship.student_name, search)
        || textMatches(internship.enrollment_number, search)
        || textMatches(internship.company_name, search)
        || textMatches(internship.role, search)
      )) {
        return false;
      }
      if (dueWindow && dueWindow !== 'all') {
        const limit = Number(dueWindow);
        if (Number.isFinite(limit) && internship.days_remaining > limit) {
          return false;
        }
      }
      return true;
    });

  return {
    internships: pending,
    stats: {
      total: pending.length,
      overdue: pending.filter((internship) => internship.days_remaining < 0).length,
      urgent: pending.filter((internship) => internship.days_remaining >= 0 && internship.days_remaining <= 7).length,
      upcoming: pending.filter((internship) => internship.days_remaining > 7 && internship.days_remaining <= 25).length,
    },
  };
}

export async function getCompanyInternshipReport(tenantId: string, query: ReportQuery = {}) {
  const companyId = getQueryString(query, 'company_id');
  const department = getQueryString(query, 'department');
  const batch = getQueryString(query, 'batch');
  const search = getQueryString(query, 'search');
  const dateRange = parseDateRange(query);

  const internships = await prisma.internship.findMany({
    where: {
      tenant_id: tenantId,
      ...(companyId ? { company_id: companyId } : {}),
      ...(department ? { department: { contains: department, mode: 'insensitive' } } : {}),
    },
    include: {
      student: {
        select: {
          id: true,
          full_name: true,
          enrollment_number: true,
          department: true,
          batch: true,
          verification_status: true,
        },
      },
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: { start_date: 'desc' },
  });

  const filtered = internships.filter((internship) => {
    if (!dateMatches(internship.start_date, dateRange)) {
      return false;
    }
    if (batch && !textMatches(internship.student.batch, batch)) {
      return false;
    }
    if (search && !(
      textMatches(internship.company?.name ?? internship.company_name, search)
      || textMatches(internship.student.department, search)
      || textMatches(internship.student.full_name, search)
    )) {
      return false;
    }
    return true;
  });

  const byCompany = Array.from(
    countBy(filtered, (internship) => internship.company?.name ?? internship.company_name).entries()
  ).map(([companyName]) => {
    const companyInternships = filtered.filter((internship) => (internship.company?.name ?? internship.company_name) === companyName);
    const stipendRecords = companyInternships.filter((internship) => internship.stipend_amount != null);
    const avgStipend = stipendRecords.length > 0
      ? Math.round(stipendRecords.reduce((sum, internship) => sum + toNumber(internship.stipend_amount), 0) / stipendRecords.length)
      : 0;

    return {
      company_name: companyName,
      company_id: companyInternships[0]?.company?.id ?? companyInternships[0]?.company_id ?? null,
      total: companyInternships.length,
      ongoing: companyInternships.filter((internship) => internship.status === 'ongoing').length,
      completed: companyInternships.filter((internship) => internship.status === 'completed').length,
      discontinued: companyInternships.filter((internship) => internship.status === 'discontinued').length,
      avgStipend,
      departments: Array.from(new Set(companyInternships.map((internship) => internship.student.department))).sort(),
      batches: Array.from(new Set(companyInternships.map((internship) => internship.student.batch))).sort(),
    };
  }).sort((a, b) => b.total - a.total);

  return {
    companies: byCompany,
    stats: {
      companies: byCompany.length,
      interns: filtered.length,
      ongoing: filtered.filter((internship) => internship.status === 'ongoing').length,
      completed: filtered.filter((internship) => internship.status === 'completed').length,
    },
  };
}

export async function getPortfolioCompletionReport(tenantId: string, query: ReportQuery = {}) {
  const department = getQueryString(query, 'department');
  const batch = getQueryString(query, 'batch');
  const search = getQueryString(query, 'search');

  const students = await prisma.student.findMany({
    where: {
      tenant_id: tenantId,
      ...(department ? { department: { contains: department, mode: 'insensitive' } } : {}),
      ...(batch ? { batch: { contains: batch, mode: 'insensitive' } } : {}),
    },
    include: {
      portfolio: {
        include: {
          projects: true,
          showcases: true,
        },
      },
    },
    orderBy: { full_name: 'asc' },
  });

  const portfolios = students.filter((student) => {
    if (!search) return true;
    return (
      textMatches(student.full_name, search)
      || textMatches(student.enrollment_number, search)
      || textMatches(student.department, search)
    );
  }).map((student) => {
    const portfolio = student.portfolio ?? null;
    return {
      student_id: student.id,
      full_name: student.full_name,
      enrollment_number: student.enrollment_number,
      department: student.department,
      batch: student.batch,
      status: portfolio?.status ?? 'draft',
      project_count: portfolio?.project_count ?? 0,
      internship_count: portfolio?.internship_count ?? 0,
      last_updated: portfolio?.updated_at ?? student.updated_at,
    };
  });

  const bands = [
    { label: 'Projects + Internships', test: (row: typeof portfolios[number]) => row.project_count > 0 && row.internship_count > 0 },
    { label: 'Projects Only', test: (row: typeof portfolios[number]) => row.project_count > 0 && row.internship_count === 0 },
    { label: 'Empty Portfolios', test: (row: typeof portfolios[number]) => row.project_count === 0 && row.internship_count === 0 },
  ].map((band) => ({
    label: band.label,
    count: portfolios.filter((portfolio) => band.test(portfolio)).length,
  }));

  return {
    portfolios,
    bands,
    stats: {
      total: portfolios.length,
      with_both: portfolios.filter((portfolio) => portfolio.project_count > 0 && portfolio.internship_count > 0).length,
      project_only: portfolios.filter((portfolio) => portfolio.project_count > 0 && portfolio.internship_count === 0).length,
      empty: portfolios.filter((portfolio) => portfolio.project_count === 0 && portfolio.internship_count === 0).length,
    },
  };
}

export async function getPublishedPortfoliosReport(tenantId: string, query: ReportQuery = {}) {
  const department = getQueryString(query, 'department');
  const batch = getQueryString(query, 'batch');
  const search = getQueryString(query, 'search');

  const students = await prisma.student.findMany({
    where: {
      tenant_id: tenantId,
      ...(department ? { department: { contains: department, mode: 'insensitive' } } : {}),
      ...(batch ? { batch: { contains: batch, mode: 'insensitive' } } : {}),
    },
    include: {
      portfolio: {
        include: {
          projects: true,
          showcases: true,
        },
      },
    },
    orderBy: { full_name: 'asc' },
  });

  const portfolios = students.filter((student) => {
    if (!search) return true;
    return (
      textMatches(student.full_name, search)
      || textMatches(student.enrollment_number, search)
      || textMatches(student.department, search)
    );
  }).map((student) => {
    const portfolio = student.portfolio;
    if (!portfolio || portfolio.status !== 'published') {
      return null;
    }

    return {
      student_id: student.id,
      full_name: student.full_name,
      enrollment_number: student.enrollment_number,
      department: student.department,
      batch: student.batch,
      project_count: portfolio.project_count,
      internship_count: portfolio.internship_count,
      last_updated: portfolio.updated_at,
    };
  }).filter((portfolio): portfolio is NonNullable<typeof portfolio> => Boolean(portfolio));

  const departmentBreakdown = Array.from(
    countBy(portfolios, (portfolio) => portfolio.department).entries()
  ).sort((a, b) => b[1] - a[1]);

  return {
    portfolios,
    department_breakdown: departmentBreakdown,
    stats: {
      total: portfolios.length,
      departments: new Set(portfolios.map((portfolio) => portfolio.department)).size,
    },
  };
}

export async function getAnnouncementHistoryReport(tenantId: string, query: ReportQuery = {}) {
  const audience = getQueryString(query, 'audience');
  const priority = getQueryString(query, 'priority');
  const search = getQueryString(query, 'search');
  const dateRange = parseDateRange(query);

  const announcements = await prisma.announcement.findMany({
    where: {
      tenant_id: tenantId,
      status: {
        in: ['published', 'archived'] as never,
      },
    },
    orderBy: { published_at: 'desc' },
  });

  const filtered = announcements.filter((announcement) => {
    if (audience && !textMatches(announcement.target_audience_type, audience)) {
      return false;
    }
    if (priority && !textMatches(announcement.priority, priority)) {
      return false;
    }
    if (!dateMatches(announcement.published_at ?? announcement.created_at, dateRange)) {
      return false;
    }
    if (search && !(
      textMatches(announcement.title, search)
    )) {
      return false;
    }
    return true;
  }).map((announcement) => mapAnnouncementBase(announcement));

  const totalRecipients = filtered.reduce((sum, announcement) => sum + announcement.total_recipients, 0);
  const readRates = filtered.filter((announcement) => announcement.total_recipients > 0).map((announcement) => announcement.read_rate);

  return {
    announcements: filtered,
    stats: {
      published: filtered.filter((announcement) => announcement.status === 'published').length,
      archived: filtered.filter((announcement) => announcement.status === 'archived').length,
      avg_read_rate: readRates.length > 0 ? Math.round(readRates.reduce((sum, rate) => sum + rate, 0) / readRates.length) : 0,
      high_priority: filtered.filter((announcement) => announcement.priority === 'high').length,
      total_recipients: totalRecipients,
    },
  };
}

export async function getConsentTrackingReport(tenantId: string, query: ReportQuery = {}) {
  const announcementId = getQueryString(query, 'announcement_id');
  const search = getQueryString(query, 'search');

  const consentAnnouncements = await prisma.announcement.findMany({
    where: {
      tenant_id: tenantId,
      requires_consent: true,
      status: {
        not: 'draft',
      },
    },
    select: {
      id: true,
      title: true,
      priority: true,
      status: true,
      target_audience_type: true,
      target_batches: true,
      target_departments: true,
      target_posting_id: true,
      requires_consent: true,
      total_recipients: true,
      read_count: true,
      consent_count: true,
      published_at: true,
      archived_at: true,
    },
    orderBy: { published_at: 'desc' },
  });

  const receipts = await prisma.announcementReceipt.findMany({
    where: {
      announcement: {
        tenant_id: tenantId,
        requires_consent: true,
        status: {
          not: 'draft',
        },
        ...(announcementId ? { id: announcementId } : {}),
      },
    },
    include: {
      announcement: {
        select: {
          id: true,
          title: true,
        },
      },
      student: {
        select: {
          id: true,
          full_name: true,
          enrollment_number: true,
          department: true,
          batch: true,
        },
      },
    },
    orderBy: [{ announcement_id: 'desc' }, { student: { full_name: 'asc' } }],
  });

  const filtered = receipts.filter((receipt) => {
    if (search && !(
      textMatches(receipt.student.full_name, search)
      || textMatches(receipt.student.enrollment_number, search)
      || textMatches(receipt.announcement.title, search)
    )) {
      return false;
    }
    return true;
  }).map((receipt) => ({
    announcement_id: receipt.announcement_id,
    announcement_title: receipt.announcement.title,
    student_id: receipt.student.id,
    student_name: receipt.student.full_name,
    roll_number: receipt.student.enrollment_number,
    department: receipt.student.department,
    batch: receipt.student.batch,
    read_at: receipt.is_read ? receipt.read_at : null,
    consent_given: receipt.has_consented,
    consent_at: receipt.has_consented ? receipt.consented_at : null,
  }));

  return {
    announcements: consentAnnouncements.map((announcement) => ({
      announcement_id: announcement.id,
      title: announcement.title,
    })),
    receipts: filtered,
    stats: {
      total_recipients: filtered.length,
      consented: filtered.filter((receipt) => receipt.consent_given).length,
      read: filtered.filter((receipt) => Boolean(receipt.read_at)).length,
      pending: filtered.filter((receipt) => !receipt.consent_given).length,
    },
  };
}

export async function getPlacementSummaryReport(tenantId: string, query: ReportQuery = {}) {
  const academicYear = getQueryString(query, 'academic_year');
  const department = getQueryString(query, 'department');
  const batch = getQueryString(query, 'batch');

  const [students, offers] = await Promise.all([
    prisma.student.findMany({
      where: {
        tenant_id: tenantId,
        ...(department ? { department: { contains: department, mode: 'insensitive' } } : {}),
        ...(batch ? { batch: { contains: batch, mode: 'insensitive' } } : {}),
      },
      include: {
        academic_profile: true,
      },
    }),
    prisma.offer.findMany({
      where: {
        tenant_id: tenantId,
        status: 'accepted',
      },
      include: {
        student: {
          select: {
            id: true,
            department: true,
            batch: true,
          },
        },
        posting: {
          select: {
            academic_year: true,
          },
        },
      },
    }),
  ]);

  const studentRows = students.map((student) => ({
    student_id: student.id,
    department: student.department,
    batch: student.batch,
    cgpa: toNullableNumber(student.academic_profile?.cgpa),
  }));

  const filteredOffers = offers.filter((offer) => {
    if (academicYear && !textMatches(offer.posting.academic_year, academicYear)) {
      return false;
    }
    if (department && !textMatches(offer.student.department, department)) {
      return false;
    }
    if (batch && !textMatches(offer.student.batch, batch)) {
      return false;
    }
    return true;
  }).filter((offer) => offer.joining_status !== 'did_not_join');

  const departmentMap = new Map<string, {
    department: string;
    totalStudents: number;
    totalOffers: number;
    placed: number;
    interned: number;
    joined: number;
    unplaced: number;
    avgCTC: number;
    placementRate: number;
  }>();

  const departments = Array.from(new Set(studentRows.map((student) => student.department))).sort();

  departments.forEach((dept) => {
    const deptStudents = studentRows.filter((student) => student.department === dept);
    const deptOffers = filteredOffers.filter((offer) => offer.student.department === dept);
    const placed = deptOffers.filter((offer) => offer.type === 'job' && isPlacedOffer(offer)).length;
    const interned = deptOffers.filter((offer) => offer.type === 'internship' && isPlacedOffer(offer)).length;
    const joined = deptOffers.filter((offer) => offer.joining_status === 'joined').length;
    const ctcValues = deptOffers
      .filter((offer) => offer.type === 'job')
      .map((offer) => offer.ctc ? Number(offer.ctc.replace(/[^\d.]/g, '')) : 0)
      .filter((value) => Number.isFinite(value) && value > 0);

    departmentMap.set(dept, {
      department: dept,
      totalStudents: deptStudents.length,
      totalOffers: deptOffers.length,
      placed,
      interned,
      joined,
      unplaced: Math.max(0, deptStudents.length - placed - interned),
      avgCTC: ctcValues.length > 0 ? average(ctcValues) : 0,
      placementRate: deptStudents.length > 0 ? Math.round(((placed + interned) / deptStudents.length) * 1000) / 10 : 0,
    });
  });

  const deptRows = Array.from(departmentMap.values()).sort((a, b) => b.totalStudents - a.totalStudents);
  const totals = {
    students: deptRows.reduce((sum, row) => sum + row.totalStudents, 0),
    placed: deptRows.reduce((sum, row) => sum + row.placed, 0),
    interned: deptRows.reduce((sum, row) => sum + row.interned, 0),
    joined: deptRows.reduce((sum, row) => sum + row.joined, 0),
    unplaced: deptRows.reduce((sum, row) => sum + row.unplaced, 0),
    offers: deptRows.reduce((sum, row) => sum + row.totalOffers, 0),
  };

  const overallRate = totals.students > 0 ? ((totals.placed + totals.interned) / totals.students) * 100 : 0;

  return {
    departments: deptRows,
    stats: {
      ...totals,
      overall_rate: Number(overallRate.toFixed(1)),
    },
  };
}

export async function getPlacementCellReport(tenantId: string, query: ReportQuery = {}) {
  const postingType = getPostingTypeQuery(query);
  const companyId = getQueryString(query, 'company_id');
  const postingId = getQueryString(query, 'posting_id');
  const institutes = getQueryStrings(query, 'institute');
  const courses = getQueryStrings(query, 'course');
  const branches = getQueryStrings(query, 'branch');
  const semesters = getQueryStrings(query, 'semester');

  const postings = await prisma.posting.findMany({
    where: {
      tenant_id: tenantId,
      ...(postingType ? { posting_type_master: { is: { value: postingType } } } : {}),
      ...(companyId ? { company_id: companyId } : {}),
      ...(postingId ? { id: postingId } : {}),
    },
    select: {
      id: true,
      title: true,
      posting_type_master: { select: { value: true } },
      company_id: true,
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      target_institutes: true,
      target_courses: true,
      target_branches: true,
      target_semesters: true,
    },
    orderBy: [{ company: { name: 'asc' } }, { title: 'asc' }],
  });

  if (postings.length === 0) {
    return {
      summary: {
        eligible_students: 0,
        registered_students: 0,
        placed_students: 0,
        joined_students: 0,
        noc_issued: 0,
        job_postings: 0,
        highest_ctc: null,
        average_ctc: null,
        highest_internship_stipend: null,
        average_internship_stipend: null,
        eligible_to_registered_rate: 0,
        eligible_to_placed_rate: 0,
        registered_to_placed_rate: 0,
        placed_to_joined_rate: 0,
        placed_to_noc_rate: 0,
      },
      postings: [],
    };
  }

  const postingIds = postings.map((posting) => posting.id);

  const [students, applications, offers] = await Promise.all([
    prisma.student.findMany({
      where: {
        tenant_id: tenantId,
      },
      select: {
        id: true,
        institute: true,
        course: true,
        department: true,
        academic_profile: {
          select: {
            semester: true,
          },
        },
      },
    }),
    prisma.application.findMany({
      where: {
        tenant_id: tenantId,
        posting_id: { in: postingIds },
      },
      select: {
        student_id: true,
        posting_id: true,
      },
    }),
    prisma.offer.findMany({
      where: {
        tenant_id: tenantId,
        posting_id: { in: postingIds },
      },
      select: {
        id: true,
        student_id: true,
        posting_id: true,
        type: true,
        ctc: true,
        stipend: true,
        status: true,
        joining_status: true,
      },
    }),
  ]);

  const selectionFilters = {
    institutes,
    courses,
    branches,
    semesters,
  };

  const cohortStudents = students
    .filter((student) => studentMatchesSelection(student, selectionFilters))
    .map((student) => ({
      ...student,
      targetContext: getStudentTargetContext(student),
    }));

  const cohortStudentIds = new Set(cohortStudents.map((student) => student.id));
  const applicationsByPosting = groupBy(applications, (application) => application.posting_id);
  const offersByPosting = groupBy(offers, (offer) => offer.posting_id);

  const eligibleStudentIds = new Set<string>();
  const registeredStudentIds = new Set<string>();
  const placedStudentIds = new Set<string>();
  const joinedStudentIds = new Set<string>();

  const postingRows = postings.map((posting) => {
    const eligibleIds = cohortStudents
      .filter((student) => matchesStudentTargeting(posting, student.targetContext))
      .map((student) => student.id);
    eligibleIds.forEach((id) => eligibleStudentIds.add(id));

    const registeredIds = new Set(
      (applicationsByPosting.get(posting.id) ?? [])
        .filter((application) => cohortStudentIds.has(application.student_id))
        .map((application) => application.student_id),
    );
    registeredIds.forEach((id) => registeredStudentIds.add(id));

    const postingOffers = offersByPosting.get(posting.id) ?? [];
    const placedOffers = postingOffers.filter((offer) => cohortStudentIds.has(offer.student_id) && isPlacedOffer(offer));
    const joinedOffers = postingOffers.filter((offer) => cohortStudentIds.has(offer.student_id) && isJoinedOffer(offer));
    const placedIds = new Set(placedOffers.map((offer) => offer.student_id));
    const joinedIds = new Set(joinedOffers.map((offer) => offer.student_id));
    placedIds.forEach((id) => placedStudentIds.add(id));
    joinedIds.forEach((id) => joinedStudentIds.add(id));

    const jobPackageValues = placedOffers
      .filter((offer) => offer.type === 'job')
      .map((offer) => parseMoneyValue(offer.ctc))
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0);
    const internshipPackageValues = placedOffers
      .filter((offer) => offer.type === 'internship')
      .map((offer) => parseMoneyValue(offer.stipend))
      .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0);

    return {
      posting_id: posting.id,
      posting_title: posting.title,
      company_id: posting.company.id,
      company_name: posting.company.name,
      posting_type: posting.posting_type_master?.value ?? '',
      eligible_students: eligibleIds.length,
      registered_students: registeredIds.size,
      placed_students: placedIds.size,
      joined_students: joinedIds.size,
      highest_ctc: jobPackageValues.length > 0 ? Math.max(...jobPackageValues) : null,
      average_ctc: jobPackageValues.length > 0 ? average(jobPackageValues) : null,
      highest_internship_stipend: internshipPackageValues.length > 0 ? Math.max(...internshipPackageValues) : null,
      average_internship_stipend: internshipPackageValues.length > 0 ? average(internshipPackageValues) : null,
      selected_rate: registeredIds.size > 0 ? Number(((placedIds.size / registeredIds.size) * 100).toFixed(1)) : 0,
      joined_rate: placedIds.size > 0 ? Number(((joinedIds.size / placedIds.size) * 100).toFixed(1)) : 0,
      placed_student_ids: Array.from(placedIds),
    };
  });

  const placedStudentIdsArray = Array.from(placedStudentIds);
  const issuedNocRequests = placedStudentIdsArray.length > 0
    ? await prisma.nocRequest.findMany({
      where: {
        tenant_id: tenantId,
        status: 'issued',
        student_id: { in: placedStudentIdsArray },
      },
      select: {
        id: true,
        student_id: true,
      },
    })
    : [];

  const issuedNocCount = issuedNocRequests.length;
  const allJobPackageValues = placedOffersToNumbers(offers, 'job');
  const allInternshipPackageValues = placedOffersToNumbers(offers, 'internship');

  const summaryEligible = eligibleStudentIds.size;
  const summaryRegistered = registeredStudentIds.size;
  const summaryPlaced = placedStudentIds.size;
  const summaryJoined = joinedStudentIds.size;
  const postingsWithNoc = postingRows.map(({ placed_student_ids, ...row }) => {
    const rowPlacedStudentIds = new Set(placed_student_ids);

    return {
      ...row,
      noc_issued: issuedNocRequests.filter((request) => rowPlacedStudentIds.has(request.student_id)).length,
    };
  });

  return {
    postings: postingsWithNoc,
    summary: {
      eligible_students: summaryEligible,
      registered_students: summaryRegistered,
      placed_students: summaryPlaced,
      joined_students: summaryJoined,
      noc_issued: issuedNocCount,
      job_postings: postings.length,
      highest_ctc: allJobPackageValues.length > 0 ? Math.max(...allJobPackageValues) : null,
      average_ctc: allJobPackageValues.length > 0 ? average(allJobPackageValues) : null,
      highest_internship_stipend: allInternshipPackageValues.length > 0 ? Math.max(...allInternshipPackageValues) : null,
      average_internship_stipend: allInternshipPackageValues.length > 0 ? average(allInternshipPackageValues) : null,
      eligible_to_registered_rate: summaryEligible > 0 ? Number(((summaryRegistered / summaryEligible) * 100).toFixed(1)) : 0,
      eligible_to_placed_rate: summaryEligible > 0 ? Number(((summaryPlaced / summaryEligible) * 100).toFixed(1)) : 0,
      registered_to_placed_rate: summaryRegistered > 0 ? Number(((summaryPlaced / summaryRegistered) * 100).toFixed(1)) : 0,
      placed_to_joined_rate: summaryPlaced > 0 ? Number(((summaryJoined / summaryPlaced) * 100).toFixed(1)) : 0,
      placed_to_noc_rate: summaryPlaced > 0 ? Number(((issuedNocCount / summaryPlaced) * 100).toFixed(1)) : 0,
    },
  };
}

function placedOffersToNumbers(offers: Array<{
  type: string;
  ctc: string | null;
  stipend: string | null;
  status: string;
  joining_status: string;
}>, type: 'job' | 'internship') {
  return offers
    .filter((offer) => offer.type === type && isPlacedOffer(offer))
    .map((offer) => parseMoneyValue(type === 'job' ? offer.ctc : offer.stipend))
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0);
}

export async function getCompanyPerformanceReport(tenantId: string, query: ReportQuery = {}) {
  const academicYear = getQueryString(query, 'academic_year');
  const search = getQueryString(query, 'search');
  const sortBy = getQueryString(query, 'sort_by') ?? 'offers';

  const [companies, applications, offers] = await Promise.all([
    prisma.company.findMany({
      where: { tenant_id: tenantId },
      select: {
        id: true,
        name: true,
        industry: true,
      },
    }),
    prisma.application.findMany({
      where: { tenant_id: tenantId },
      select: {
        current_stage: true,
        posting: {
          select: {
            company_id: true,
            academic_year: true,
          },
        },
      },
    }),
    prisma.offer.findMany({
      where: { tenant_id: tenantId },
      select: {
        company_id: true,
        status: true,
        joining_status: true,
        posting: {
          select: {
            academic_year: true,
          },
        },
      },
    }),
  ]);

  const rows = companies.map((company) => {
    const companyApplications = applications.filter((application) => application.posting.company_id === company.id);
    const companyOffers = offers.filter((offer) => offer.company_id === company.id);

    const filteredApplications = academicYear
      ? companyApplications.filter((application) => textMatches(application.posting.academic_year, academicYear))
      : companyApplications;
    const filteredOffers = academicYear
      ? companyOffers.filter((offer) => textMatches(offer.posting.academic_year, academicYear))
      : companyOffers;

    const shortlisted = filteredApplications.filter((application) => SHORTLISTED_STAGES.has(application.current_stage)).length;
    const accepted = filteredOffers.filter((offer) => offer.status === 'accepted').length;
    const joined = filteredOffers.filter((offer) => offer.joining_status === 'joined').length;
    const dnj = filteredOffers.filter((offer) => offer.joining_status === 'did_not_join').length;

    return {
      company_id: company.id,
      name: company.name,
      industry: company.industry,
      applicants: filteredApplications.length,
      shortlisted,
      offers: filteredOffers.length,
      accepted,
      joined,
      dnj,
      conversion_rate: filteredApplications.length > 0 ? Number(((joined / filteredApplications.length) * 100).toFixed(1)) : 0,
    };
  }).filter((company) => {
    if (!search) return true;
    return textMatches(company.name, search) || textMatches(company.industry, search);
  });

  rows.sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    if (sortBy === 'conversion') return b.conversion_rate - a.conversion_rate;
    return b.offers - a.offers;
  });

  return {
    companies: rows,
    stats: {
      companies: rows.length,
      offers: rows.reduce((sum, row) => sum + row.offers, 0),
      joined: rows.reduce((sum, row) => sum + row.joined, 0),
    },
  };
}

export async function getOfferToJoinFunnelReport(tenantId: string, query: ReportQuery = {}) {
  const academicYear = getQueryString(query, 'academic_year');
  const department = getQueryString(query, 'department');
  const batch = getQueryString(query, 'batch');
  const postingType = getPostingTypeQuery(query);
  const search = getQueryString(query, 'search');
  const dateRange = parseDateRange(query);

  const offers = await prisma.offer.findMany({
    where: {
      tenant_id: tenantId,
      ...(postingType ? { posting: { is: { posting_type_master: { is: { value: postingType } } } } } : {}),
    },
    include: {
      student: {
        select: {
          id: true,
          full_name: true,
          enrollment_number: true,
          department: true,
          batch: true,
        },
      },
      company: {
        select: {
          id: true,
          name: true,
        },
      },
      posting: {
        select: {
          id: true,
          title: true,
          academic_year: true,
          posting_type_master: { select: { value: true } },
        },
      },
    },
    orderBy: { offer_date: 'desc' },
  });

  const filtered = offers.filter((offer) => {
    if (academicYear && !textMatches(offer.posting.academic_year, academicYear)) {
      return false;
    }
    if (department && !textMatches(offer.student.department, department)) {
      return false;
    }
    if (batch && !textMatches(offer.student.batch, batch)) {
      return false;
    }
    if (!dateMatches(offer.offer_date, dateRange)) {
      return false;
    }
    if (search && !(
      textMatches(offer.student.full_name, search)
      || textMatches(offer.student.enrollment_number, search)
      || textMatches(offer.company.name, search)
      || textMatches(offer.role, search)
    )) {
      return false;
    }
    return true;
  }).map((offer) => mapOfferBase(offer));

  const total = filtered.length;
  const pending = filtered.filter((offer) => offer.status === 'pending_student_action').length;
  const accepted = filtered.filter((offer) => offer.status === 'accepted').length;
  const rejected = filtered.filter((offer) => offer.status === 'rejected_by_admin').length;
  const joined = filtered.filter((offer) => offer.joining_status === 'joined').length;
  const dnj = filtered.filter((offer) => offer.joining_status === 'did_not_join').length;
  const pendingJoin = filtered.filter((offer) => offer.status === 'accepted' && offer.joining_status === 'pending').length;

  return {
    offers: filtered,
    stages: [
      { label: 'Offers Released', value: total, percentage: total > 0 ? 100 : 0 },
      { label: 'Pending Action', value: pending, percentage: total > 0 ? Number(((pending / total) * 100).toFixed(1)) : 0 },
      { label: 'Accepted', value: accepted, percentage: total > 0 ? Number(((accepted / total) * 100).toFixed(1)) : 0 },
      { label: 'Rejected (Admin)', value: rejected, percentage: total > 0 ? Number(((rejected / total) * 100).toFixed(1)) : 0 },
      { label: 'Joined', value: joined, percentage: total > 0 ? Number(((joined / total) * 100).toFixed(1)) : 0 },
      { label: 'Did Not Join', value: dnj, percentage: total > 0 ? Number(((dnj / total) * 100).toFixed(1)) : 0 },
    ],
    stats: {
      total,
      pending,
      accepted,
      rejected,
      joined,
      dnj,
      pending_join: pendingJoin,
    },
  };
}

export async function getUnplacedStudentsReport(tenantId: string, query: ReportQuery = {}) {
  const institute = getQueryString(query, 'institute');
  const course = getQueryString(query, 'course');
  // "branch" maps to the course-derived department column (students carry no separate branch attribute).
  const branch = getQueryString(query, 'branch') ?? getQueryString(query, 'department');
  const semester = getQueryString(query, 'semester');
  const batch = getQueryString(query, 'batch');
  const search = getQueryString(query, 'search');
  const verifiedOnly = getQueryBoolean(query, 'verified_only');

  const [students, offers] = await Promise.all([
    prisma.student.findMany({
      where: {
        tenant_id: tenantId,
        ...(institute ? { institute: { contains: institute, mode: 'insensitive' } } : {}),
        ...(course ? { course: { contains: course, mode: 'insensitive' } } : {}),
        ...(branch ? { department: { contains: branch, mode: 'insensitive' } } : {}),
        ...(batch ? { batch: { contains: batch, mode: 'insensitive' } } : {}),
      },
      include: {
        academic_profile: true,
      },
      orderBy: { full_name: 'asc' },
    }),
    prisma.offer.findMany({
      where: {
        tenant_id: tenantId,
        OR: [
          { status: 'accepted' },
          { joining_status: 'joined' },
        ],
      },
      select: {
        student_id: true,
        joining_status: true,
        status: true,
      },
    }),
  ]);

  const placedStudentIds = new Set(
    offers
      .filter((offer) => isPlacedOffer(offer))
      .map((offer) => offer.student_id)
  );

  const unplaced = students.filter((student) => !placedStudentIds.has(student.id)).filter((student) => {
    if (verifiedOnly && student.verification_status !== 'verified') {
      return false;
    }
    if (semester) {
      const studentSemester = student.current_semester ?? student.academic_profile?.semester ?? null;
      if (studentSemester === null || String(studentSemester) !== String(semester)) {
        return false;
      }
    }
    if (search && !(
      textMatches(student.full_name, search)
      || textMatches(student.enrollment_number, search)
      || textMatches(student.email, search)
    )) {
      return false;
    }
    return true;
  }).map((student) => ({
    ...mapStudentBase(student),
    institute: student.institute ?? null,
    course: student.course ?? null,
    semester: student.current_semester ?? student.academic_profile?.semester ?? null,
  }));

  // Breakdown by branch (= department); students carry no separate branch attribute.
  const branchBreakdown = Array.from(
    countBy(unplaced, (student) => student.department).entries()
  ).sort((a, b) => b[1] - a[1]);

  return {
    students: unplaced,
    dept_breakdown: branchBreakdown,
    branch_breakdown: branchBreakdown,
    stats: {
      total: unplaced.length,
      verified: unplaced.filter((student) => student.verification_status === 'verified').length,
      pending: unplaced.filter((student) => student.verification_status === 'pending').length,
      rejected: unplaced.filter((student) => student.verification_status === 'rejected').length,
    },
  };
}

// =========================================================
// NEW REPORTS (from the "NEW REPORTS" meeting sheet)
// Aggregate + listing reports grouped by posting type (multi) + institute /
// course / branch(=department) / semester. "Branch" == the course-derived
// Student.department; students carry no separate branch attribute.
// =========================================================

const ELIGIBLE_MIN_CGPA = 6.5;

type NewReportStudent = {
  id: string;
  institute: string | null;
  course: string | null;
  department: string;
  batch: string | null;
  current_semester: string | null;
  academic_profile?: { semester: number | null; cgpa?: unknown } | null;
};

function resolveStudentSemester(student: { current_semester?: string | null; academic_profile?: { semester: number | null } | null }): string | null {
  const fromProfile = student.academic_profile?.semester;
  if (fromProfile !== null && fromProfile !== undefined) return String(fromProfile);
  const fromColumn = student.current_semester;
  if (fromColumn !== null && fromColumn !== undefined && String(fromColumn).trim() !== '') return String(fromColumn).trim();
  return null;
}

type NewReportScope = {
  postingTypes: string[];
  institutes: string[];
  courses: string[];
  branches: string[];
  semesters: string[];
  academicYear?: string;
};

function parseNewReportScope(query: ReportQuery): NewReportScope {
  return {
    postingTypes: getQueryStrings(query, 'posting_type'),
    institutes: getQueryStrings(query, 'institute'),
    courses: getQueryStrings(query, 'course'),
    branches: getQueryStrings(query, 'branch'),
    semesters: getQueryStrings(query, 'semester'),
    academicYear: getQueryString(query, 'academic_year'),
  };
}

function studentInReportScope(student: NewReportStudent, scope: NewReportScope): boolean {
  return matchesSelectedValues(student.institute, scope.institutes)
    && matchesSelectedValues(student.course, scope.courses)
    && matchesSelectedValues(student.department, scope.branches)
    && matchesSelectedValues(resolveStudentSemester(student), scope.semesters)
    && (!scope.academicYear || textMatches(student.batch, scope.academicYear));
}

function groupKeyForStudent(student: NewReportStudent) {
  return [
    student.institute ?? '—',
    student.course ?? '—',
    student.department ?? '—',
    resolveStudentSemester(student) ?? '—',
  ].join('||');
}

// ---- 1. Placement Count ----
export async function getPlacementCountReport(tenantId: string, query: ReportQuery = {}) {
  const scope = parseNewReportScope(query);

  const [masters, students, interests, offers, nocs, internships] = await Promise.all([
    prisma.masterOption.findMany({
      where: { tenant_id: tenantId, category: 'posting_type' as never },
      select: {
        id: true,
        value: true,
        target_institutes: true,
        target_courses: true,
        target_branches: true,
        target_semesters: true,
      },
    }),
    prisma.student.findMany({
      where: { tenant_id: tenantId },
      select: {
        id: true,
        institute: true,
        course: true,
        department: true,
        batch: true,
        current_semester: true,
        academic_profile: { select: { semester: true, cgpa: true } },
      },
    }),
    prisma.interestRegistration.findMany({
      where: { status: { not: 'withdrawn' }, student: { tenant_id: tenantId } },
      select: { student_id: true, interest_type: true },
    }),
    prisma.offer.findMany({
      where: { tenant_id: tenantId },
      select: {
        student_id: true,
        company_id: true,
        ctc: true,
        status: true,
        joining_status: true,
        posting: { select: { posting_type_master: { select: { value: true } } } },
      },
    }),
    prisma.nocRequest.findMany({
      where: { tenant_id: tenantId },
      select: { student_id: true, program: true, status: true },
    }),
    prisma.internship.findMany({
      where: { tenant_id: tenantId, certificate_uploaded: true },
      select: { student_id: true },
    }),
  ]);

  const selectedMasters = scope.postingTypes.length > 0
    ? masters.filter((master) => matchesSelectedValues(master.value, scope.postingTypes))
    : masters;

  const scopedStudents = students.filter((student) => studentInReportScope(student, scope));

  // Per-student index of registered posting-type values (normalized).
  const interestByStudent = new Map<string, Set<string>>();
  interests.forEach((row) => {
    const set = interestByStudent.get(row.student_id) ?? new Set<string>();
    set.add(normalizeComparable(row.interest_type ?? ''));
    interestByStudent.set(row.student_id, set);
  });
  const completionCertStudentIds = new Set(internships.map((row) => row.student_id));

  const rows: Array<Record<string, unknown>> = [];

  selectedMasters.forEach((master) => {
    const typeKey = normalizeComparable(master.value);
    const cohort = scopedStudents.filter((student) => matchesStudentTargetingForMaster(master, {
      institute: student.institute,
      course: student.course,
      branch: student.department,
      semester: student.academic_profile?.semester ?? null,
    }));

    const groups = groupBy(cohort, groupKeyForStudent);

    groups.forEach((groupStudents) => {
      const groupIds = new Set(groupStudents.map((student) => student.id));
      const sample = groupStudents[0];

      const registered = groupStudents.filter((student) => interestByStudent.get(student.id)?.has(typeKey)).length;
      const eligible = groupStudents.filter((student) => {
        const cgpa = toNumber(student.academic_profile?.cgpa);
        return cgpa >= ELIGIBLE_MIN_CGPA;
      }).length;

      const groupOffers = offers.filter((offer) => groupIds.has(offer.student_id)
        && normalizeComparable(offer.posting?.posting_type_master?.value ?? '') === typeKey);
      const companies = new Set(groupOffers.map((offer) => offer.company_id));
      const packageValues = groupOffers
        .map((offer) => parseMoneyValue(offer.ctc))
        .filter((value): value is number => typeof value === 'number' && value > 0);

      const groupNocs = nocs.filter((noc) => groupIds.has(noc.student_id)
        && normalizeComparable(noc.program ?? '') === typeKey);
      const completionCerts = groupStudents.filter((student) => completionCertStudentIds.has(student.id)).length;

      rows.push({
        posting_type: master.value,
        academic_year: scope.academicYear ?? null,
        institute: sample.institute ?? '—',
        course: sample.course ?? '—',
        branch: sample.department ?? '—',
        semester: resolveStudentSemester(sample) ?? '—',
        total_students: groupStudents.length,
        registered_students: registered,
        not_interested_students: Math.max(groupStudents.length - registered, 0),
        eligible_students: eligible,
        companies_participated: companies.size,
        noc_count: groupNocs.length,
        completion_certificate_count: completionCerts,
        highest_package: packageValues.length > 0 ? Math.max(...packageValues) : null,
        average_package: packageValues.length > 0 ? average(packageValues) : null,
        median_package: packageValues.length > 0 ? median(packageValues) : null,
        lowest_package: packageValues.length > 0 ? minPositive(packageValues) : null,
        accept_offer: groupOffers.filter((offer) => offer.status === 'accepted').length,
        reject_offer: groupOffers.filter((offer) => offer.status === 'rejected_by_admin' || offer.status === 'rejected_by_student').length,
        pending_offer: groupOffers.filter((offer) => offer.status === 'pending_student_action').length,
      });
    });
  });

  rows.sort((a, b) => (b.total_students as number) - (a.total_students as number));

  return {
    rows,
    stats: {
      groups: rows.length,
      total_students: rows.reduce((sum, row) => sum + (row.total_students as number), 0),
      registered_students: rows.reduce((sum, row) => sum + (row.registered_students as number), 0),
      eligible_students: rows.reduce((sum, row) => sum + (row.eligible_students as number), 0),
    },
  };
}

// ---- 2. Placement Data Listing / Export ----
export async function getPlacementListingReport(tenantId: string, query: ReportQuery = {}) {
  const scope = parseNewReportScope(query);

  const [offers, nocs, internships] = await Promise.all([
    prisma.offer.findMany({
      where: {
        tenant_id: tenantId,
        status: { notIn: ['rejected_by_admin', 'rejected_by_student'] as never },
      },
      select: {
        id: true,
        role: true,
        ctc: true,
        status: true,
        joining_status: true,
        company: { select: { name: true } },
        posting: { select: { posting_type_master: { select: { value: true } } } },
        student: {
          select: {
            id: true,
            enrollment_number: true,
            full_name: true,
            institute: true,
            course: true,
            department: true,
            batch: true,
            current_semester: true,
            mobile: true,
            email: true,
            gender: true,
            academic_profile: { select: { semester: true } },
          },
        },
      },
      orderBy: { student: { full_name: 'asc' } },
    }),
    prisma.nocRequest.findMany({
      where: { tenant_id: tenantId },
      select: { student_id: true, status: true, offer_letter_url: true },
    }),
    prisma.internship.findMany({
      where: { tenant_id: tenantId, certificate_uploaded: true },
      select: { student_id: true, certificate_url: true },
    }),
  ]);

  const issuedNocByStudent = new Set(nocs.filter((noc) => noc.status === 'issued').map((noc) => noc.student_id));
  const offerLetterByStudent = new Map<string, string>();
  nocs.forEach((noc) => {
    if (noc.offer_letter_url && !offerLetterByStudent.has(noc.student_id)) {
      offerLetterByStudent.set(noc.student_id, noc.offer_letter_url);
    }
  });
  const completionByStudent = new Map<string, string>();
  internships.forEach((internship) => {
    if (internship.certificate_url && !completionByStudent.has(internship.student_id)) {
      completionByStudent.set(internship.student_id, internship.certificate_url);
    }
  });

  const records = offers
    .filter((offer) => {
      const student = offer.student;
      const scopedStudent: NewReportStudent = {
        id: student.id,
        institute: student.institute,
        course: student.course,
        department: student.department,
        batch: student.batch,
        current_semester: student.current_semester,
        academic_profile: student.academic_profile,
      };
      return studentInReportScope(scopedStudent, scope)
        && matchesSelectedValues(offer.posting?.posting_type_master?.value ?? '', scope.postingTypes);
    })
    .map((offer) => {
      const student = offer.student;
      return {
        posting_type: offer.posting?.posting_type_master?.value ?? '',
        enrollment_number: student.enrollment_number,
        student_name: student.full_name,
        institute: student.institute ?? null,
        course: student.course ?? null,
        branch: student.department,
        semester: resolveStudentSemester({ current_semester: student.current_semester, academic_profile: student.academic_profile }),
        contact: student.mobile ?? null,
        email: student.email,
        company_name: offer.company?.name ?? null,
        designation: offer.role,
        package: offer.ctc ?? null,
        noc_status: issuedNocByStudent.has(student.id) ? 'issued' : 'pending',
        offer_letter_url: offerLetterByStudent.get(student.id) ?? null,
        completion_letter_url: completionByStudent.get(student.id) ?? null,
        gender: student.gender ?? null,
        offer_status: offer.status,
      };
    });

  return {
    records,
    stats: {
      total: records.length,
      accepted: records.filter((row) => row.offer_status === 'accepted').length,
      pending: records.filter((row) => row.offer_status === 'pending_student_action').length,
    },
  };
}

// ---- 3. Internship / NOC Count ----
export async function getInternshipNocCountReport(tenantId: string, query: ReportQuery = {}) {
  const scope = parseNewReportScope(query);

  const [masters, students, nocs, internships] = await Promise.all([
    prisma.masterOption.findMany({
      where: { tenant_id: tenantId, category: 'posting_type' as never },
      select: {
        id: true,
        value: true,
        target_institutes: true,
        target_courses: true,
        target_branches: true,
        target_semesters: true,
      },
    }),
    prisma.student.findMany({
      where: { tenant_id: tenantId },
      select: {
        id: true,
        institute: true,
        course: true,
        department: true,
        batch: true,
        current_semester: true,
        academic_profile: { select: { semester: true } },
      },
    }),
    prisma.nocRequest.findMany({
      where: { tenant_id: tenantId },
      select: {
        student_id: true,
        program: true,
        placement_source: true,
        status: true,
        stipend_amount: true,
        company_id: true,
        company_name: true,
      },
    }),
    prisma.internship.findMany({
      where: { tenant_id: tenantId, certificate_uploaded: true },
      select: { student_id: true },
    }),
  ]);

  const selectedMasters = scope.postingTypes.length > 0
    ? masters.filter((master) => matchesSelectedValues(master.value, scope.postingTypes))
    : masters;
  const scopedStudents = students.filter((student) => studentInReportScope(student, scope));
  const completionCertStudentIds = new Set(internships.map((row) => row.student_id));

  const rows: Array<Record<string, unknown>> = [];

  selectedMasters.forEach((master) => {
    const typeKey = normalizeComparable(master.value);
    const cohort = scopedStudents.filter((student) => matchesStudentTargetingForMaster(master, {
      institute: student.institute,
      course: student.course,
      branch: student.department,
      semester: student.academic_profile?.semester ?? null,
    }));

    groupBy(cohort, groupKeyForStudent).forEach((groupStudents) => {
      const groupIds = new Set(groupStudents.map((student) => student.id));
      const sample = groupStudents[0];
      const groupNocs = nocs.filter((noc) => groupIds.has(noc.student_id)
        && normalizeComparable(noc.program ?? '') === typeKey);
      const studentsWithNoc = new Set(groupNocs.map((noc) => noc.student_id));
      const stipendValues = groupNocs
        .map((noc) => toNumber(noc.stipend_amount))
        .filter((value) => value > 0);
      const companies = new Set(groupNocs.map((noc) => noc.company_id ?? noc.company_name ?? ''));
      companies.delete('');

      rows.push({
        posting_type: master.value,
        academic_year: scope.academicYear ?? null,
        institute: sample.institute ?? '—',
        course: sample.course ?? '—',
        branch: sample.department ?? '—',
        semester: resolveStudentSemester(sample) ?? '—',
        total_students: groupStudents.length,
        noc_count: groupNocs.length,
        noc_accept: groupNocs.filter((noc) => noc.status === 'approved' || noc.status === 'issued').length,
        noc_reject: groupNocs.filter((noc) => noc.status === 'rejected').length,
        students_without_noc: Math.max(groupStudents.length - studentsWithNoc.size, 0),
        university_drive: groupNocs.filter((noc) => noc.placement_source === 'university_drive').length,
        self_sourced: groupNocs.filter((noc) => noc.placement_source === 'self_sourced').length,
        highest_stipend: stipendValues.length > 0 ? Math.max(...stipendValues) : null,
        average_stipend: stipendValues.length > 0 ? average(stipendValues) : null,
        completion_certificate_count: groupStudents.filter((student) => completionCertStudentIds.has(student.id)).length,
        company_count: companies.size,
      });
    });
  });

  rows.sort((a, b) => (b.total_students as number) - (a.total_students as number));

  return {
    rows,
    stats: {
      groups: rows.length,
      total_students: rows.reduce((sum, row) => sum + (row.total_students as number), 0),
      noc_count: rows.reduce((sum, row) => sum + (row.noc_count as number), 0),
    },
  };
}

// ---- 4. Internship / NOC Listing / Export ----
export async function getInternshipNocListingReport(tenantId: string, query: ReportQuery = {}) {
  const scope = parseNewReportScope(query);

  const [nocs, acceptedOffers] = await Promise.all([
    prisma.nocRequest.findMany({
      where: { tenant_id: tenantId },
      select: {
        noc_number: true,
        program: true,
        company_name: true,
        role_title: true,
        stipend_amount: true,
        start_date: true,
        end_date: true,
        placement_source: true,
        certificate_url: true,
        offer_letter_url: true,
        contact_person_name: true,
        contact_person_phone: true,
        contact_person_email: true,
        contact_person_designation: true,
        status: true,
        issued_at: true,
        student: {
          select: {
            id: true,
            enrollment_number: true,
            full_name: true,
            institute: true,
            course: true,
            department: true,
            batch: true,
            current_semester: true,
            mobile: true,
            email: true,
            profile_photo_url: true,
            academic_profile: { select: { semester: true } },
          },
        },
      },
      orderBy: { created_at: 'desc' },
    }),
    prisma.offer.findMany({
      where: { tenant_id: tenantId, status: 'accepted' },
      select: { student_id: true },
    }),
  ]);

  const placedStudentIds = new Set(acceptedOffers.map((offer) => offer.student_id));
  const issuedNocStudentIds = new Set(nocs.filter((noc) => noc.status === 'issued').map((noc) => noc.student.id));

  const records = nocs
    .filter((noc) => {
      const student = noc.student;
      const scopedStudent: NewReportStudent = {
        id: student.id,
        institute: student.institute,
        course: student.course,
        department: student.department,
        batch: student.batch,
        current_semester: student.current_semester,
        academic_profile: student.academic_profile,
      };
      return studentInReportScope(scopedStudent, scope)
        && matchesSelectedValues(noc.program ?? '', scope.postingTypes);
    })
    .map((noc) => {
      const student = noc.student;
      const placementStatus = placedStudentIds.has(student.id) || issuedNocStudentIds.has(student.id) ? 'YES' : 'NO';
      return {
        noc_number: noc.noc_number ?? null,
        posting_type: noc.program ?? '',
        enrollment_number: student.enrollment_number,
        student_name: student.full_name,
        institute: student.institute ?? null,
        course: student.course ?? null,
        branch: student.department,
        semester: resolveStudentSemester({ current_semester: student.current_semester, academic_profile: student.academic_profile }),
        contact: student.mobile ?? null,
        email: student.email,
        company_name: noc.company_name ?? null,
        role_title: noc.role_title ?? null,
        stipend: toNumber(noc.stipend_amount) > 0 ? toNumber(noc.stipend_amount) : null,
        start_date: noc.start_date,
        end_date: noc.end_date,
        internship_type: noc.placement_source,
        noc_certificate_url: noc.certificate_url ?? null,
        offer_letter_url: noc.offer_letter_url ?? null,
        completion_certificate_url: null,
        recruiter_name: noc.contact_person_name ?? null,
        recruiter_contact: noc.contact_person_phone ?? null,
        recruiter_email: noc.contact_person_email ?? null,
        recruiter_designation: noc.contact_person_designation ?? null,
        student_photo_url: student.profile_photo_url ?? null,
        internship_placement_status: placementStatus,
        noc_issued_date: noc.issued_at,
        noc_status: noc.status,
      };
    });

  return {
    records,
    stats: {
      total: records.length,
      issued: records.filter((row) => row.noc_status === 'issued').length,
    },
  };
}

// ---- 7 & 8. Company reports (grouped by posting type only) ----
async function loadCompanyReportBase(tenantId: string, postingTypes: string[]) {
  const postings = await prisma.posting.findMany({
    where: {
      tenant_id: tenantId,
      ...(postingTypes.length > 0 ? { posting_type_master: { is: { value: { in: postingTypes } } } } : {}),
    },
    select: {
      id: true,
      company_id: true,
      ctc: true,
      posting_type_master: { select: { value: true } },
    },
  });

  const postingIds = postings.map((posting) => posting.id);
  const [applications, offers] = await Promise.all([
    postingIds.length > 0
      ? prisma.application.findMany({
        where: { tenant_id: tenantId, posting_id: { in: postingIds } },
        select: { posting_id: true, current_stage: true },
      })
      : Promise.resolve([]),
    postingIds.length > 0
      ? prisma.offer.findMany({
        where: { tenant_id: tenantId, posting_id: { in: postingIds } },
        select: { posting_id: true, ctc: true },
      })
      : Promise.resolve([]),
  ]);

  const postingById = new Map(postings.map((posting) => [posting.id, posting]));
  return { postings, applications, offers, postingById };
}

export async function getCompanyCountReport(tenantId: string, query: ReportQuery = {}) {
  const postingTypes = getQueryStrings(query, 'posting_type');
  const { postings, applications, offers, postingById } = await loadCompanyReportBase(tenantId, postingTypes);

  const typeKeys = groupBy(postings, (posting) => posting.posting_type_master?.value ?? '—');
  const rows: Array<Record<string, unknown>> = [];

  typeKeys.forEach((typePostings, typeValue) => {
    const postingIdSet = new Set(typePostings.map((posting) => posting.id));
    const companies = new Set(typePostings.map((posting) => posting.company_id));
    const typeApplications = applications.filter((application) => postingIdSet.has(application.posting_id));
    const typeOffers = offers.filter((offer) => postingIdSet.has(offer.posting_id));

    const packageValues = [
      ...typePostings.map((posting) => parseMoneyValue(posting.ctc)),
      ...typeOffers.map((offer) => parseMoneyValue(offer.ctc)),
    ].filter((value): value is number => typeof value === 'number' && value > 0);

    rows.push({
      posting_type: typeValue,
      total_companies: companies.size,
      total_applications: typeApplications.length,
      offer_released_count: typeApplications.filter((application) => application.current_stage === 'offer_released').length,
      highest_package: packageValues.length > 0 ? Math.max(...packageValues) : null,
      lowest_package: packageValues.length > 0 ? minPositive(packageValues) : null,
    });
  });

  rows.sort((a, b) => (b.total_applications as number) - (a.total_applications as number));

  return {
    rows,
    stats: {
      posting_types: rows.length,
      total_companies: new Set(postings.map((posting) => posting.company_id)).size,
      total_applications: applications.length,
    },
  };
}

export async function getCompanyStageReport(tenantId: string, query: ReportQuery = {}) {
  const postingTypes = getQueryStrings(query, 'posting_type');
  const { postings, applications } = await loadCompanyReportBase(tenantId, postingTypes);

  const postingTypeById = new Map(postings.map((posting) => [posting.id, posting.posting_type_master?.value ?? '—']));
  const typePostings = groupBy(postings, (posting) => posting.posting_type_master?.value ?? '—');

  const rows = Array.from(typePostings.entries()).map(([typeValue, typePostingList]) => {
    const companies = new Set(typePostingList.map((posting) => posting.company_id));
    const typeApplications = applications.filter((application) => postingTypeById.get(application.posting_id) === typeValue);
    const stageCount = (stage: string) => typeApplications.filter((application) => application.current_stage === stage).length;

    return {
      posting_type: typeValue,
      total_companies: companies.size,
      total_applications: typeApplications.length,
      applied: stageCount('applied'),
      mock_round: stageCount('mock_round'),
      shortlisted: stageCount('shortlisted'),
      test_scheduled: stageCount('test_scheduled'),
      interview: stageCount('interview'),
      hr_round: stageCount('hr_round'),
      offer_released: stageCount('offer_released'),
      rejected: stageCount('rejected'),
    };
  }).sort((a, b) => b.total_applications - a.total_applications);

  return {
    rows,
    stats: {
      posting_types: rows.length,
      total_applications: applications.length,
    },
  };
}

// ---- 5 & 6. No-Due reports (grouped by passing year(=batch) + institute/course/branch/semester) ----
const NO_DUES_EXIT_REASONS = ['employment', 'family_business', 'planning_studies', 'higher_studies', 'competitive_exam'] as const;

function noDuesGroupKey(student: NewReportStudent) {
  return [
    student.batch ?? '—',
    student.institute ?? '—',
    student.course ?? '—',
    student.department ?? '—',
    resolveStudentSemester(student) ?? '—',
  ].join('||');
}

export async function getNoDuesCountReport(tenantId: string, query: ReportQuery = {}) {
  const scope = parseNewReportScope(query);

  const [students, noDues] = await Promise.all([
    prisma.student.findMany({
      where: { tenant_id: tenantId },
      select: {
        id: true,
        institute: true,
        course: true,
        department: true,
        batch: true,
        current_semester: true,
        academic_profile: { select: { semester: true } },
      },
    }),
    prisma.noDuesRequest.findMany({
      where: { tenant_id: tenantId },
      select: { student_id: true, exit_reason: true },
    }),
  ]);

  const scopedStudents = students.filter((student) => studentInReportScope(student, scope));
  const reasonByStudent = new Map<string, string>();
  noDues.forEach((row) => reasonByStudent.set(row.student_id, row.exit_reason));

  const rows: Array<Record<string, unknown>> = [];
  groupBy(scopedStudents, noDuesGroupKey).forEach((groupStudents) => {
    const sample = groupStudents[0];
    const groupReasons = groupStudents
      .map((student) => reasonByStudent.get(student.id))
      .filter((reason): reason is string => Boolean(reason));

    const countReason = (reason: string) => groupReasons.filter((value) => value === reason).length;

    rows.push({
      passing_year: sample.batch ?? '—',
      institute: sample.institute ?? '—',
      course: sample.course ?? '—',
      branch: sample.department ?? '—',
      semester: resolveStudentSemester(sample) ?? '—',
      total_students: groupStudents.length,
      no_due_count: groupReasons.length,
      employment: countReason('employment'),
      family_business: countReason('family_business'),
      planning_studies: countReason('planning_studies'),
      higher_studies: countReason('higher_studies'),
      competitive_exam: countReason('competitive_exam'),
    });
  });

  rows.sort((a, b) => (b.total_students as number) - (a.total_students as number));

  return {
    rows,
    exit_reasons: NO_DUES_EXIT_REASONS,
    stats: {
      groups: rows.length,
      total_students: rows.reduce((sum, row) => sum + (row.total_students as number), 0),
      no_due_count: rows.reduce((sum, row) => sum + (row.no_due_count as number), 0),
    },
  };
}

export async function getNoDuesListingReport(tenantId: string, query: ReportQuery = {}) {
  const scope = parseNewReportScope(query);

  const requests = await prisma.noDuesRequest.findMany({
    where: { tenant_id: tenantId },
    select: {
      exit_reason: true,
      proof_url: true,
      created_at: true,
      student: {
        select: {
          id: true,
          enrollment_number: true,
          full_name: true,
          institute: true,
          course: true,
          department: true,
          batch: true,
          current_semester: true,
          mobile: true,
          email: true,
          admission_year: true,
          profile_photo_url: true,
          academic_profile: { select: { semester: true } },
        },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  const records = requests
    .filter((request) => {
      const student = request.student;
      const scopedStudent: NewReportStudent = {
        id: student.id,
        institute: student.institute,
        course: student.course,
        department: student.department,
        batch: student.batch,
        current_semester: student.current_semester,
        academic_profile: student.academic_profile,
      };
      return studentInReportScope(scopedStudent, scope);
    })
    .map((request) => {
      const student = request.student;
      return {
        passing_year: student.batch ?? null,
        enrollment_number: student.enrollment_number,
        student_name: student.full_name,
        institute: student.institute ?? null,
        course: student.course ?? null,
        branch: student.department,
        semester: resolveStudentSemester({ current_semester: student.current_semester, academic_profile: student.academic_profile }),
        contact: student.mobile ?? null,
        email: student.email,
        exit_reason: request.exit_reason,
        proof_url: request.proof_url ?? null,
        student_photo_url: student.profile_photo_url ?? null,
        admission_year: student.admission_year ?? null,
        batch: student.batch ?? null,
        no_due_date: request.created_at,
      };
    });

  return {
    records,
    stats: {
      total: records.length,
    },
  };
}
