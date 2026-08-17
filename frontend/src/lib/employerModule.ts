import { formatDate, formatPhoneNumber, getInitials } from '@/lib/formatters';
import type {
  ApiCompany,
  ApiCompanyDetail,
  ApiEngagement,
  ApiRecruiter,
  ApiRecruiterListItem,
} from '@/types/employer';
import type { RecruiterCompanyOverview, RecruiterSummary } from '@/types/recruiter';

type CompanyLike = ApiCompany | ApiCompanyDetail | RecruiterCompanyOverview['company'];
type RecruiterLike =
  | ApiRecruiter
  | ApiRecruiterListItem
  | RecruiterSummary
  | RecruiterCompanyOverview['recruiters'][number];

export function getCompanyClassificationLabel(classification: CompanyLike['classification']) {
  switch (classification) {
    case 'preferred':
      return 'Preferred';
    case 'blacklisted':
      return 'Blacklisted';
    default:
      return 'Normal';
  }
}

export function getRecruiterVerificationLabel(status: RecruiterLike['verification_status']) {
  switch (status) {
    case 'verified':
      return 'Verified';
    case 'rejected':
      return 'Rejected';
    default:
      return 'Pending';
  }
}

export function getEngagementTypeLabel(type: ApiEngagement['visitor_type']) {
  switch (type) {
    case 'placement':
      return 'Placement Drive';
    case 'internship':
      return 'Internship Program';
    case 'campus_visit':
      return 'Campus Visit';
    case 'guest_lecture':
      return 'Guest Lecture';
    case 'workshop':
      return 'Workshop';
    default:
      return type;
  }
}

export function getCompanySearchFields(company: CompanyLike) {
  return [
    company.name,
    company.industry ?? '',
    company.website ?? '',
    company.address ?? '',
    company.description ?? '',
  ];
}

export function getRecruiterCompanyName(recruiter: RecruiterLike) {
  return 'company' in recruiter ? recruiter.company.name : '';
}

export function getRecruiterSearchFields(recruiter: RecruiterLike) {
  return [
    recruiter.name,
    recruiter.email,
    recruiter.designation ?? '',
    recruiter.phone ?? '',
    getRecruiterCompanyName(recruiter),
  ];
}

export function getCompanyStatsFromCompanies(companies: CompanyLike[]) {
  return {
    total: companies.length,
    active: companies.filter((company) => company.status === 'active').length,
    preferred: companies.filter((company) => company.classification === 'preferred').length,
    blacklisted: companies.filter((company) => company.classification === 'blacklisted').length,
  };
}

export function getRecruiterStatsFromRecruiters(recruiters: RecruiterLike[]) {
  return {
    total: recruiters.length,
    verified: recruiters.filter((recruiter) => recruiter.verification_status === 'verified').length,
    pending: recruiters.filter((recruiter) => recruiter.verification_status === 'pending').length,
    rejected: recruiters.filter((recruiter) => recruiter.verification_status === 'rejected').length,
  };
}

export function formatRecruiterPhone(phone: string | null) {
  return phone ? formatPhoneNumber(phone) : '—';
}

export function getRecruiterInitials(name: string) {
  return getInitials(name);
}

export function formatEngagementDate(date: string) {
  return formatDate(date);
}

export function getCompanyCreatedLabel(company: Pick<ApiCompany, 'created_at'>) {
  return formatDate(company.created_at);
}

// ── Duplicate company detection ────────────────────────
//
// Used by AddCompanyDialog to warn before an admin creates an employer that already exists.
// ⚠ normalizeCompanyName is MIRRORED on the backend in
// `docs/silveroak_backend/src/shared/utils/company-name.ts` — keep the two in sync.
// The backend copy is authoritative (it rejects with 409 COMPANY_ALREADY_EXISTS);
// this one only drives the advisory UI.

type CompanyNameLike = Pick<ApiCompany, 'id' | 'name'>;

/**
 * Lowercase and drop everything that is not a letter or digit — punctuation AND all
 * whitespace, so "TechCorp" / "Tech Corp" / "Tech-Corp" share one key.
 *
 * Deliberately does NOT strip legal suffixes (pvt / ltd / inc) — "Acme Ltd" and
 * "Acme Inc" are different companies. Those surface as similar matches instead.
 */
export function normalizeCompanyName(name: string): string {
  return name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

/**
 * The term to send to `GET /companies?search=` when looking for possible duplicates.
 *
 * The endpoint matches with a raw `contains`, so sending the whole typed string finds
 * nothing when the difference is punctuation or spacing ("Info-sys" would not match the
 * stored "Infosys" — exactly the case we need to warn about). Sending the longest
 * alphanumeric token instead casts a wide enough net; the precise exact/similar decision
 * is then made locally over the returned candidates.
 */
export function buildCompanySearchTerm(input: string): string {
  const tokens = input.split(/[^\p{L}\p{N}]+/u).filter(Boolean);
  if (tokens.length === 0) return '';
  return tokens.reduce((longest, token) => (token.length > longest.length ? token : longest));
}

/** The company whose normalized name equals `input` — the case the backend rejects. */
export function findExactCompanyMatch<T extends CompanyNameLike>(
  input: string,
  companies: T[],
): T | null {
  const normalized = normalizeCompanyName(input);
  if (!normalized) return null;
  return companies.find((company) => normalizeCompanyName(company.name) === normalized) ?? null;
}

/**
 * Companies that merely resemble `input` (substring either direction), excluding the exact
 * match. Advisory only — saving these is allowed, since "Infosys BPM" is a real company
 * distinct from "Infosys".
 */
export function findSimilarCompanies<T extends CompanyNameLike>(
  input: string,
  companies: T[],
  limit = 5,
): T[] {
  const normalized = normalizeCompanyName(input);
  if (!normalized) return [];

  return companies
    .filter((company) => {
      const candidate = normalizeCompanyName(company.name);
      if (!candidate || candidate === normalized) return false;
      return candidate.includes(normalized) || normalized.includes(candidate);
    })
    .slice(0, limit);
}
