import type {
  ApiPostingDetail,
  ApiPostingListItem,
  CreatePostingInput,
  PublishPostingInput,
  UpdatePostingInput,
} from '@/types/posting';
import { formatCGPA } from '@/lib/formatters';

export interface PostingFormValues {
  company_id: string;
  title: string;
  posting_type_master_id: string;
  academic_year: string;
  role_name: string;
  locations: string[];
  work_mode: CreatePostingInput['work_mode'] | '';
  ctc: string;
  stipend: string;
  duration_value: string;
  duration_unit: 'months' | 'years';
  bond_value: string;
  bond_unit: 'months' | 'years';
  bond_details: string;
  job_description_pdf_urls: string[];
  job_description_pdf_names: string[];
  role_description: string;
  target_institutes: string[];
  target_courses: string[];
  target_branches: string[];
  target_semesters: string[];
  eligible_branches: string[];
  eligible_batches: string[];
  min_cgpa: string;
  max_backlogs: string;
  skill_requirements: string;
  has_written_test: boolean;
  written_test_details: string;
  has_gd: boolean;
  gd_details: string;
  technical_rounds: string;
  hr_rounds: string;
  additional_info: string;
  application_start_date: string;
  application_end_date: string;
}

// Preset compensation range buckets (stored verbatim in the ctc/stipend string columns).
export const CTC_RANGE_OPTIONS = [
  '0 - 3 LPA',
  '3 - 6 LPA',
  '6 - 10 LPA',
  '10 - 15 LPA',
  '15 - 25 LPA',
  '25+ LPA',
] as const;

export const STIPEND_RANGE_OPTIONS = [
  '0 - 10,000 / month',
  '10,000 - 20,000 / month',
  '20,000 - 30,000 / month',
  '30,000 - 50,000 / month',
  '50,000+ / month',
] as const;

export interface StudentPostingContext {
  institute: string;
  course: string;
  department: string;
  batch: string;
  semester: number | null;
  cgpa: number | null;
  backlog_count: number;
  technical_skills: string[];
  domain_interests: string[];
  policy_accepted: boolean;
}

export interface PostingEligibilityResult {
  eligible: boolean;
  reasons: string[];
  matchPercentage: number;
}

export interface RecommendedPostingCandidate {
  posting: ApiPostingListItem | ApiPostingDetail;
  eligibility: PostingEligibilityResult;
  applicationOpen: boolean;
}

export function createEmptyPostingFormValues(): PostingFormValues {
  return {
    company_id: '',
    title: '',
    posting_type_master_id: '',
    academic_year: '',
    role_name: '',
    locations: [],
    work_mode: '',
    ctc: '',
    stipend: '',
    duration_value: '',
    duration_unit: 'months',
    bond_value: '',
    bond_unit: 'months',
    bond_details: '',
    job_description_pdf_urls: [],
    job_description_pdf_names: [],
    role_description: '',
    target_institutes: [],
    target_courses: [],
    target_branches: [],
    target_semesters: [],
    eligible_branches: [],
    eligible_batches: [],
    min_cgpa: '0',
    max_backlogs: '0',
    skill_requirements: '',
    has_written_test: false,
    written_test_details: '',
    has_gd: false,
    gd_details: '',
    technical_rounds: '0',
    hr_rounds: '0',
    additional_info: '',
    application_start_date: '',
    application_end_date: '',
  };
}

const POSTING_TYPE_LABELS: Record<string, string> = {
  job: 'Placement (Job)',
  internship: 'Internship',
  stipend_internship: 'Stipend Internship',
};

export function formatPostingTypeLabel(value: string): string {
  const trimmed = value.trim();
  if (POSTING_TYPE_LABELS[trimmed]) return POSTING_TYPE_LABELS[trimmed];
  return trimmed.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function postingDetailToFormValues(posting: ApiPostingDetail): PostingFormValues {
  return {
    company_id: posting.company.id,
    title: posting.title,
    posting_type_master_id: posting.posting_type_master_id,
    academic_year: posting.academic_year,
    role_name: posting.role_name,
    locations: deriveLocations(posting),
    work_mode: posting.work_mode,
    // ctc/stipend now hold preset range-bucket strings verbatim (e.g. "3 - 6 LPA").
    ctc: posting.ctc ?? '',
    stipend: posting.stipend ?? '',
    ...parseDurationFields(posting.duration, 'duration'),
    ...parseDurationFields(posting.bond_details, 'bond'),
    bond_details: posting.bond_details ?? '',
    job_description_pdf_urls: deriveJobDescriptionPdfUrls(posting),
    job_description_pdf_names: deriveJobDescriptionPdfNames(posting),
    role_description: posting.role_description ?? '',
    target_institutes: posting.target_institutes ?? [],
    target_courses: posting.target_courses ?? [],
    target_branches: posting.target_branches ?? [],
    target_semesters: posting.target_semesters ?? [],
    eligible_branches: posting.eligible_branches,
    eligible_batches: posting.eligible_batches,
    min_cgpa: String(posting.min_cgpa ?? 0),
    max_backlogs: String(posting.max_backlogs ?? 0),
    skill_requirements: posting.skill_requirements ?? '',
    has_written_test: posting.has_written_test,
    written_test_details: posting.written_test_details ?? '',
    has_gd: posting.has_gd,
    gd_details: posting.gd_details ?? '',
    technical_rounds: String(posting.technical_rounds ?? 0),
    hr_rounds: String(posting.hr_rounds ?? 0),
    additional_info: posting.additional_info ?? '',
    application_start_date: toDateInputValue(posting.application_start_date),
    application_end_date: toDateInputValue(posting.application_end_date),
  };
}

// Multi-value fields fall back to the legacy scalar so existing (pre-migration) postings
// still populate the new chip/list inputs when edited.
function deriveLocations(posting: ApiPostingDetail): string[] {
  if (posting.locations && posting.locations.length > 0) return posting.locations;
  return posting.location ? [posting.location] : [];
}

function deriveJobDescriptionPdfUrls(posting: ApiPostingDetail): string[] {
  if (posting.job_description_pdf_urls && posting.job_description_pdf_urls.length > 0) {
    return posting.job_description_pdf_urls;
  }
  return posting.job_description_pdf_url ? [posting.job_description_pdf_url] : [];
}

// Names are index-aligned with job_description_pdf_urls. No legacy scalar mirror — pre-migration
// postings have no stored names, so this returns [] and the UI falls back to "PDF N".
function deriveJobDescriptionPdfNames(posting: ApiPostingDetail): string[] {
  return posting.job_description_pdf_names ?? [];
}

function normalizeNullableString(value: string | null | undefined) {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function safeTrim(value: string | null | undefined): string {
  return (value ?? '').trim();
}

function extractFirstNumber(value: string | null | undefined) {
  if (!value) return '';
  return value.match(/\d+(?:\.\d+)?/)?.[0] ?? '';
}

type DurationUnit = PostingFormValues['duration_unit'];

function parseDurationFields(value: string | null | undefined, prefix: 'duration'): {
  duration_value: string;
  duration_unit: DurationUnit;
};
function parseDurationFields(value: string | null | undefined, prefix: 'bond'): {
  bond_value: string;
  bond_unit: DurationUnit;
};
function parseDurationFields(value: string | null | undefined, prefix: 'duration' | 'bond') {
  const normalizedValue = value?.toLowerCase() ?? '';
  const unit: DurationUnit = normalizedValue.includes('year') ? 'years' : 'months';
  const numericValue = extractFirstNumber(value);

  if (prefix === 'duration') {
    return {
      duration_value: numericValue,
      duration_unit: unit,
    };
  }

  return {
    bond_value: numericValue,
    bond_unit: unit,
  };
}

function buildNumberWithUnit(value: string, unit: DurationUnit) {
  const numericValue = extractFirstNumber(value);
  return numericValue ? `${numericValue} ${unit}` : null;
}

function isSimpleDurationText(value: string) {
  return /^\d+(?:\.\d+)?\s*(months?|years?)$/i.test(value.trim());
}

function parseNumber(value: string, fallback = 0): number {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function parseInteger(value: string, fallback = 0): number {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function parsePostingNumber(
  value: number | string | null | undefined,
  fallback = 0
): number {
  if (value == null || value === '') {
    return fallback;
  }

  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function buildCreatePostingPayload(values: PostingFormValues): CreatePostingInput {
  const bondDetailsText = normalizeNullableString(values.bond_details);
  const bondDuration = buildNumberWithUnit(values.bond_value, values.bond_unit);
  const bondDetails = bondDetailsText
    ? (isSimpleDurationText(bondDetailsText) && bondDuration ? bondDuration : bondDetailsText)
    : bondDuration;

  const locations = values.locations.map((value) => value.trim()).filter(Boolean);
  // Pair URL + original name by index, then drop empty-URL entries so the two arrays never drift.
  const jobDescriptionPdfPairs = values.job_description_pdf_urls
    .map((url, index) => ({ url: url.trim(), name: (values.job_description_pdf_names[index] ?? '').trim() }))
    .filter((pair) => pair.url);
  const jobDescriptionPdfUrls = jobDescriptionPdfPairs.map((pair) => pair.url);
  const jobDescriptionPdfNames = jobDescriptionPdfPairs.map((pair) => pair.name);

  return {
    company_id: values.company_id,
    title: safeTrim(values.title),
    posting_type_master_id: values.posting_type_master_id,
    academic_year: safeTrim(values.academic_year),
    role_name: safeTrim(values.role_name),
    // `location` (legacy scalar) mirrors the first city; `locations` is the source of truth.
    location: locations[0] ?? '',
    locations,
    work_mode: values.work_mode as CreatePostingInput['work_mode'],
    // ctc/stipend hold the chosen preset range bucket string verbatim.
    ctc: normalizeNullableString(values.ctc),
    stipend: normalizeNullableString(values.stipend),
    duration: buildNumberWithUnit(values.duration_value, values.duration_unit),
    bond_details: bondDetails,
    job_description_pdf_url: jobDescriptionPdfUrls[0] ?? null,
    job_description_pdf_urls: jobDescriptionPdfUrls,
    job_description_pdf_names: jobDescriptionPdfNames,
    role_description: normalizeNullableString(values.role_description),
    target_institutes: values.target_institutes,
    target_courses: values.target_courses,
    target_branches: values.target_branches,
    target_semesters: values.target_semesters,
    eligible_branches: values.eligible_branches,
    eligible_batches: values.eligible_batches,
    min_cgpa: parseNumber(values.min_cgpa, 0),
    max_backlogs: parseInteger(values.max_backlogs, 0),
    skill_requirements: normalizeNullableString(values.skill_requirements),
    has_written_test: values.has_written_test,
    written_test_details: normalizeNullableString(values.written_test_details),
    has_gd: values.has_gd,
    gd_details: normalizeNullableString(values.gd_details),
    technical_rounds: parseInteger(values.technical_rounds, 0),
    hr_rounds: parseInteger(values.hr_rounds, 0),
    additional_info: normalizeNullableString(values.additional_info),
    application_start_date: normalizeNullableString(values.application_start_date),
    application_end_date: normalizeNullableString(values.application_end_date),
  };
}

export function buildUpdatePostingPayload(values: PostingFormValues): UpdatePostingInput {
  const createPayload = buildCreatePostingPayload(values);
  const { company_id: _ignored, ...updatePayload } = createPayload;
  return updatePayload;
}

export function buildPublishPostingPayload(
  values: Pick<PostingFormValues, 'application_start_date' | 'application_end_date'>
): PublishPostingInput {
  const payload: PublishPostingInput = {};

  if (values.application_start_date) {
    payload.application_start_date = values.application_start_date;
  }
  if (values.application_end_date) {
    payload.application_end_date = values.application_end_date;
  }

  return payload;
}

function normalizeComparable(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function matchesTargetValue(studentValue: string | number | null | undefined, targetValues: string[] | undefined) {
  if (!targetValues || targetValues.length === 0) return true;
  if (studentValue === null || studentValue === undefined || studentValue === '') return false;

  const normalizedStudent = normalizeComparable(String(studentValue));
  return targetValues.some((targetValue) => {
    const normalizedTarget = normalizeComparable(targetValue);
    return normalizedStudent === normalizedTarget
      || normalizedStudent.includes(normalizedTarget)
      || normalizedTarget.includes(normalizedStudent);
  });
}

function matchesPostingTargeting(
  posting: Pick<ApiPostingListItem | ApiPostingDetail, 'target_institutes' | 'target_courses' | 'target_branches' | 'target_semesters'>,
  context: StudentPostingContext,
) {
  return matchesTargetValue(context.institute, posting.target_institutes)
    && matchesTargetValue(context.course, posting.target_courses)
    && matchesTargetValue(context.department, posting.target_branches)
    && matchesTargetValue(context.semester == null ? null : String(context.semester), posting.target_semesters);
}

function addBatchToken(tokens: Set<string>, value: string | null | undefined) {
  if (!value) return;

  const trimmed = value.trim();
  if (!trimmed) return;

  tokens.add(trimmed);

  const normalized = normalizeComparable(trimmed);
  if (normalized) {
    tokens.add(normalized);
  }
}

function matchesBranch(studentDepartment: string, eligibleBranches: string[]) {
  const normalizedDepartment = normalizeComparable(studentDepartment);

  return eligibleBranches.some((branch) => {
    const normalizedBranch = normalizeComparable(branch);
    return normalizedDepartment === normalizedBranch
      || normalizedDepartment.includes(normalizedBranch)
      || normalizedBranch.includes(normalizedDepartment);
  });
}

function expandBatchYear(value: string, anchorYear?: string | null) {
  const digits = value.replace(/\D+/g, '');
  if (!digits) return null;
  if (digits.length === 4) return digits;

  if (digits.length === 2 && anchorYear && /^\d{4}$/.test(anchorYear)) {
    const centuryPrefix = anchorYear.slice(0, 2);
    let inferredYear = Number(`${centuryPrefix}${digits}`);
    const anchor = Number(anchorYear);

    if (inferredYear < anchor) {
      inferredYear += 100;
    }

    return String(inferredYear);
  }

  return digits;
}

function extractBatchTokens(batch: string): string[] {
  const trimmed = batch.trim();
  const tokens = new Set<string>();
  addBatchToken(tokens, trimmed);

  const segments = trimmed.split(/[-/]/).map((part) => part.trim()).filter(Boolean);
  const rawYears = segments
    .map((segment) => segment.replace(/\D+/g, ''))
    .filter(Boolean);
  const anchorYear = rawYears.find((segment) => segment.length === 4) ?? null;

  segments.forEach((segment) => {
    addBatchToken(tokens, segment);
    addBatchToken(tokens, expandBatchYear(segment, anchorYear));
  });

  rawYears.forEach((year) => addBatchToken(tokens, expandBatchYear(year, anchorYear)));

  return Array.from(tokens);
}

function matchesBatch(studentBatch: string, eligibleBatches: string[]) {
  const studentTokens = new Set(extractBatchTokens(studentBatch));

  return eligibleBatches.some((batch) => {
    const tokens = extractBatchTokens(batch);
    return tokens.some((token) => studentTokens.has(token));
  });
}

export function isPostingApplicationOpen(
  posting: Pick<ApiPostingListItem, 'status' | 'application_start_date' | 'application_end_date' | 'application_override_enabled'>,
  now = new Date()
): boolean {
  if (posting.status !== 'published') return false;
  if (posting.application_override_enabled) return true;
  if (!posting.application_start_date || !posting.application_end_date) return true;

  const start = new Date(posting.application_start_date);
  const end = new Date(posting.application_end_date);
  return now >= start && now <= end;
}

export function extractCompensationNumber(value: string | null | undefined): number | null {
  if (!value) return null;
  // Strip thousands separators first so "10,000 - 20,000 / month" parses to 10000, not 10
  // (the regex otherwise stops at the comma). CTC values like "3 - 6 LPA" have no commas → unchanged.
  const match = value.replace(/,/g, '').match(/(\d+(\.\d+)?)/);
  return match ? Number(match[1]) : null;
}

export function calculatePostingMatch(
  posting: Pick<ApiPostingDetail | ApiPostingListItem, 'eligible_branches' | 'target_institutes' | 'target_courses' | 'target_branches' | 'target_semesters'> & {
    skill_requirements?: string | null;
  },
  context: StudentPostingContext
): number {
  let score = 0;
  let total = 0;

  if (posting.target_institutes.length > 0) {
    total += 10;
    if (matchesTargetValue(context.institute, posting.target_institutes)) {
      score += 10;
    }
  }

  if (posting.target_courses.length > 0) {
    total += 10;
    if (matchesTargetValue(context.course, posting.target_courses)) {
      score += 10;
    }
  }

  if (posting.target_branches.length > 0) {
    total += 10;
    if (matchesTargetValue(context.department, posting.target_branches)) {
      score += 10;
    }
  }

  if (posting.target_semesters.length > 0) {
    total += 10;
    if (matchesTargetValue(context.semester == null ? null : String(context.semester), posting.target_semesters)) {
      score += 10;
    }
  }

  if (posting.eligible_branches.length > 0) {
    total += 30;
    if (matchesBranch(context.department, posting.eligible_branches)) {
      score += 30;
    }
  }

  const requiredKeywords = posting.skill_requirements
    ?.toLowerCase()
    .split(/[,\n/|]+|\s+/)
    .map((keyword) => keyword.trim())
    .filter((keyword) => keyword.length > 2) ?? [];

  if (requiredKeywords.length > 0 && context.technical_skills.length > 0) {
    total += 50;
    const normalizedSkills = context.technical_skills.map((skill) => skill.toLowerCase());
    const matchedKeywords = requiredKeywords.filter((keyword) =>
      normalizedSkills.some((skill) => skill.includes(keyword) || keyword.includes(skill))
    );

    score += Math.min(50, (matchedKeywords.length / Math.max(3, requiredKeywords.length)) * 50);
  }

  if (context.domain_interests.length > 0) {
    total += 20;
    score += context.domain_interests.length >= 2 ? 20 : 10;
  }

  return total > 0 ? Math.round((score / total) * 100) : 50;
}

export function evaluatePostingForStudent(
  posting: ApiPostingListItem | ApiPostingDetail,
  context: StudentPostingContext
): PostingEligibilityResult {
  const reasons: string[] = [];
  const minCgpa = parsePostingNumber(posting.min_cgpa);
  const maxBacklogs = parsePostingNumber(posting.max_backlogs);

  if (posting.target_institutes.length > 0 && !matchesTargetValue(context.institute, posting.target_institutes)) {
    reasons.push('Your institute is not listed in the targeted institutes.');
  }

  if (posting.target_courses.length > 0 && !matchesTargetValue(context.course, posting.target_courses)) {
    reasons.push('Your course is not listed in the targeted courses.');
  }

  if (posting.target_branches.length > 0 && !matchesTargetValue(context.department, posting.target_branches)) {
    reasons.push('Your branch is not listed in the targeted branches.');
  }

  if (posting.target_semesters.length > 0 && !matchesTargetValue(context.semester == null ? null : String(context.semester), posting.target_semesters)) {
    reasons.push('Your semester is not listed in the targeted semesters.');
  }

  if (posting.eligible_branches.length > 0 && !matchesBranch(context.department, posting.eligible_branches)) {
    reasons.push('Your department is not listed in the eligible branches.');
  }

  if (posting.eligible_batches.length > 0 && !matchesBatch(context.batch, posting.eligible_batches)) {
    reasons.push('Your batch is not listed in the eligible batches.');
  }

  if (context.cgpa == null) {
    reasons.push('Add your CGPA in the profile before applying.');
  } else if (context.cgpa < minCgpa) {
    reasons.push(`Minimum CGPA required is ${formatCGPA(minCgpa, '0.00')}.`);
  }

  if (context.backlog_count > maxBacklogs) {
    reasons.push(`Maximum allowed backlogs is ${maxBacklogs}.`);
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    matchPercentage: calculatePostingMatch(posting, context),
  };
}

export function selectRecommendedPostings<T extends RecommendedPostingCandidate>(
  postingInsights: T[],
  limit = 4
): T[] {
  return postingInsights
    .filter(
      ({ eligibility, applicationOpen }) =>
        eligibility.eligible && eligibility.matchPercentage >= 60 && applicationOpen
    )
    .sort((left, right) => right.eligibility.matchPercentage - left.eligibility.matchPercentage)
    .slice(0, limit);
}

export function toDateInputValue(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : '';
}
