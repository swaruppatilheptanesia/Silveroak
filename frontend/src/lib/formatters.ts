// Centralized formatting utilities for consistent data display

import { format as formatDateFns } from 'date-fns';

/**
 * Coerce any incoming value into a valid `Date`, or `null` when the value
 * is missing or unparseable. Defensive against API responses that may
 * return strings, numeric timestamps, Date objects, or unexpected shapes.
 */
function coerceDate(dateValue: unknown): Date | null {
  if (dateValue == null || dateValue === '') {
    return null;
  }

  let date: Date;
  if (dateValue instanceof Date) {
    date = dateValue;
  } else if (typeof dateValue === 'string' || typeof dateValue === 'number') {
    date = new Date(dateValue);
  } else {
    return null;
  }

  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Format a date with a date-fns pattern, falling back when the input is
 * missing or unparseable. Prevents `RangeError: Invalid time value` crashes
 * from `format(new Date(maybeBad), ...)` call sites.
 */
export function formatDatePattern(
  dateValue: string | Date | null | undefined,
  pattern: string,
  fallback = 'Not available'
): string {
  const date = coerceDate(dateValue);
  if (!date) {
    return fallback;
  }

  try {
    return formatDateFns(date, pattern);
  } catch {
    return fallback;
  }
}

export function formatDate(
  dateString: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }
): string {
  const date = coerceDate(dateString);
  if (!date) {
    return 'Not available';
  }

  return date.toLocaleDateString('en-IN', options);
}

/**
 * Format date with time
 */
export function formatDateTime(dateString: string | Date | null | undefined): string {
  const date = coerceDate(dateString);
  if (!date) {
    return 'Not available';
  }

  return date.toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Format relative time (e.g., "2 days ago")
 */
export function formatRelativeTime(dateString: string | Date | null | undefined): string {
  const date = coerceDate(dateString);
  if (!date) {
    return 'Not available';
  }

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} min ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} days ago`;
  
  return formatDate(date);
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
}

/**
 * Format currency in INR
 */
export function formatCurrency(
  amount: number,
  options: { compact?: boolean; showSymbol?: boolean } = {}
): string {
  const { compact = false, showSymbol = true } = options;
  
  if (compact) {
    if (amount >= 10000000) {
      return `${showSymbol ? '₹' : ''}${(amount / 10000000).toFixed(2)} Cr`;
    }
    if (amount >= 100000) {
      return `${showSymbol ? '₹' : ''}${(amount / 100000).toFixed(2)} L`;
    }
    if (amount >= 1000) {
      return `${showSymbol ? '₹' : ''}${(amount / 1000).toFixed(1)}K`;
    }
  }
  
  return new Intl.NumberFormat('en-IN', {
    style: showSymbol ? 'currency' : 'decimal',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format LPA (Lakhs Per Annum) - common in Indian recruitment.
 * Accepts numbers, numeric strings (Prisma Decimal serializes as string), or nullable values.
 */
export function formatLPA(
  lpa: number | string | null | undefined,
  fallback = 'Not provided'
): string {
  if (lpa == null || lpa === '') {
    return fallback;
  }

  const numericLpa = typeof lpa === 'string' ? Number(lpa) : lpa;

  return Number.isFinite(numericLpa) ? `₹${numericLpa.toFixed(1)} LPA` : fallback;
}

/**
 * Format stipend amount (monthly)
 */
export function formatStipend(amount: number): string {
  return `₹${formatCurrency(amount, { showSymbol: false })}/month`;
}

/**
 * Format percentage with optional decimal places
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format CGPA.
 * Per project rule: NULL/missing CGPA is treated as zero (default fallback '0.00').
 * Callers can override the fallback explicitly if they want a different empty-state.
 */
export function formatCGPA(
  cgpa: number | string | null | undefined,
  fallback = '0.00'
): string {
  if (cgpa == null || cgpa === '') {
    return fallback;
  }

  const numericCgpa = typeof cgpa === 'string' ? Number(cgpa) : cgpa;

  return Number.isFinite(numericCgpa) ? numericCgpa.toFixed(2) : fallback;
}

/**
 * Format phone number (Indian format)
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
  }
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    return `+${cleaned.slice(0, 2)} ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Get initials from full name
 */
export function getInitials(name: string, maxLength: number = 2): string {
  return name
    .split(' ')
    .map(word => word[0])
    .filter(Boolean)
    .slice(0, maxLength)
    .join('')
    .toUpperCase();
}
