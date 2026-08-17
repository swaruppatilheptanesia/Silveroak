/**
 * Country list for the No Dues create form (Planning / Admission exit reasons).
 * India is listed first because the form's India-vs-Abroad logic keys off the exact value
 * `'India'` (see NoDuesCertificate.tsx: language-test requirement + proof helper text).
 */
export const INDIA = 'India';

export const COUNTRIES: string[] = [
  INDIA,
  'United States of America',
  'United Kingdom',
  'Canada',
  'Australia',
  'Germany',
  'Ireland',
  'New Zealand',
  'France',
  'Netherlands',
  'Sweden',
  'Switzerland',
  'Singapore',
  'United Arab Emirates',
  'Italy',
  'Spain',
  'Finland',
  'Norway',
  'Denmark',
  'Belgium',
  'Austria',
  'Poland',
  'Japan',
  'South Korea',
  'China',
  'Hong Kong',
  'Malaysia',
  'Russia',
  'Ukraine',
  'Georgia',
  'Kazakhstan',
  'Philippines',
  'Mauritius',
  'South Africa',
  'Qatar',
  'Saudi Arabia',
  'Bahrain',
  'Kuwait',
  'Oman',
  'Other',
];

/** True when a chosen country counts as "abroad" (anything other than India). */
export function isAbroadCountry(country: string | null | undefined): boolean {
  return Boolean(country) && country !== INDIA;
}
