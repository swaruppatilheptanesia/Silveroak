import type { InterestType } from '@/types/student';

export const STUDENT_INTEREST_OPTIONS: Array<{
  value: InterestType;
  label: string;
  description: string;
}> = [
  {
    value: 'placement',
    label: 'Campus Placement',
    description: 'Full-time opportunities through the placement cell.',
  },
  {
    value: 'summer_internship',
    label: 'Summer Internship',
    description: 'Short-term internships during the summer break.',
  },
  {
    value: 'winter_internship',
    label: 'Winter Internship',
    description: 'Short-term internships during the winter break.',
  },
  {
    value: 'final_semester_internship',
    label: 'Final Semester Internship',
    description: 'Long-form internship during the final semester.',
  },
  {
    value: 'nep_internship',
    label: 'NEP Internship',
    description: 'Internship registration aligned with NEP requirements.',
  },
  {
    value: 'stipend_internship',
    label: 'Stipend Internship',
    description: 'On-the-job training or internship with stipend support.',
  },
  {
    value: 'dissertation',
    label: 'Dissertation',
    description: 'Research or dissertation work with an external organization.',
  },
];

export function formatInterestLabel(type: string): string {
  return STUDENT_INTEREST_OPTIONS.find((option) => option.value === type)?.label
    ?? type.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export interface PostingTypeInterestOption {
  value: string;
  label: string;
  description: string;
}

function cleanPostingTypeValue(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function getPostingTypeInterestOptions(values: string[] | null | undefined): PostingTypeInterestOption[] {
  if (!values || values.length === 0) return [];

  const seen = new Set<string>();
  return values
    .map((rawValue) => cleanPostingTypeValue(rawValue))
    .filter((value) => {
      if (!value || seen.has(value)) return false;
      seen.add(value);
      return true;
    })
    .map((value) => ({
      value,
      label: value,
      description: getPostingTypeInterestDescription(value),
    }));
}

export function getPostingTypeInterestLabel(value: string): string {
  return cleanPostingTypeValue(value).replace(/_/g, ' ');
}

export function getPostingTypeInterestDescription(value: string): string {
  const normalized = cleanPostingTypeValue(value).toLowerCase().replace(/[_-]+/g, ' ');

  if (normalized === 'job' || normalized === 'placement') {
    return 'Full-time opportunities through the placement cell.';
  }

  if (
    normalized === 'internship'
    || normalized === 'summer internship'
    || normalized === 'winter internship'
    || normalized === 'final semester internship'
    || normalized === 'nep internship'
  ) {
    return 'Internship opportunities published by the placement team.';
  }

  if (normalized === 'stipend internship') {
    return 'Internship opportunities with stipend support.';
  }

  return 'Register interest for this posting category.';
}

export function isSupportedPostingTypeInterest(value: string): boolean {
  return cleanPostingTypeValue(value).length > 0;
}

export function mapPostingTypeInterestToRegistrationValue(value: string): string {
  return cleanPostingTypeValue(value);
}

export function mapInterestRegistrationToPostingTypeValue(value: string): string {
  return cleanPostingTypeValue(value);
}

export function getPostingTypeInterestComparisonKey(value: string): string {
  return cleanPostingTypeValue(value).toLowerCase().replace(/[_-]+/g, ' ');
}

export function parseCommaSeparatedList(value: string): string[] {
  return Array.from(
    new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

export function formatCommaSeparatedList(values: string[] | null | undefined): string {
  return values?.join(', ') ?? '';
}

export function toDateInputValue(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : '';
}

export function resolveBackendAssetUrl(fileUrl: string): string {
  if (!fileUrl) return '';
  if (/^https?:\/\//i.test(fileUrl)) return fileUrl; // already absolute (e.g. external URLs)

  const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

  // Uploaded files are exposed under the API prefix (`/api/uploads`) so they resolve through the
  // same path as the API in every deployment topology — not only when the frontend host also
  // proxies `/uploads`. Prefix the stored `/uploads/...` path with the API base (origin + prefix).
  if (fileUrl.startsWith('/uploads') || fileUrl.startsWith('uploads')) {
    const assetPath = fileUrl.startsWith('/') ? fileUrl : `/${fileUrl}`;
    return `${apiBaseUrl}${assetPath}`;
  }

  // Fallback: prior behavior for any non-upload value.
  if (apiBaseUrl.startsWith('/')) return fileUrl;
  try {
    return new URL(fileUrl, new URL(apiBaseUrl).origin).toString();
  } catch {
    return fileUrl;
  }
}
