// Centralized filtering and pagination utilities

import { DEFAULT_PAGE_SIZE } from './constants';

/**
 * Generic search filter - searches multiple fields
 */
export function filterBySearch<T extends Record<string, unknown>>(
  items: T[],
  searchQuery: string,
  fields: (keyof T)[]
): T[] {
  if (!searchQuery.trim()) return items;
  
  const query = searchQuery.toLowerCase().trim();
  
  return items.filter(item =>
    fields.some(field => {
      const value = item[field];
      if (typeof value === 'string') {
        return value.toLowerCase().includes(query);
      }
      if (typeof value === 'number') {
        return value.toString().includes(query);
      }
      return false;
    })
  );
}

/**
 * Filter by exact match on a field
 */
export function filterByField<T extends Record<string, unknown>>(
  items: T[],
  field: keyof T,
  value: unknown,
  allValue: string = 'all'
): T[] {
  if (value === allValue || value === undefined || value === null) return items;
  return items.filter(item => item[field] === value);
}

/**
 * Filter by range (min/max)
 */
export function filterByRange<T extends Record<string, unknown>>(
  items: T[],
  field: keyof T,
  min?: number,
  max?: number
): T[] {
  return items.filter(item => {
    const value = item[field];
    if (typeof value !== 'number') return true;
    if (min !== undefined && value < min) return false;
    if (max !== undefined && value > max) return false;
    return true;
  });
}

/**
 * Filter by array contains (item field is in allowed values)
 */
export function filterByIncludes<T extends Record<string, unknown>>(
  items: T[],
  field: keyof T,
  allowedValues: unknown[]
): T[] {
  if (!allowedValues.length) return items;
  return items.filter(item => allowedValues.includes(item[field]));
}

/**
 * Filter by array overlap (item field array has any of allowed values)
 */
export function filterByArrayOverlap<T extends Record<string, unknown>>(
  items: T[],
  field: keyof T,
  requiredValues: string[]
): T[] {
  if (!requiredValues.length) return items;
  return items.filter(item => {
    const itemValues = item[field];
    if (!Array.isArray(itemValues)) return false;
    return requiredValues.some(v => itemValues.includes(v));
  });
}

/**
 * Combine multiple filters
 */
export function combineFilters<T>(
  items: T[],
  ...filterFns: ((items: T[]) => T[])[]
): T[] {
  return filterFns.reduce((result, filterFn) => filterFn(result), items);
}

// ============================================
// PAGINATION
// ============================================

export interface PaginationState {
  currentPage: number;
  pageSize: number;
  totalItems: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    startIndex: number;
    endIndex: number;
  };
}

/**
 * Paginate an array of items
 */
export function paginate<T>(
  items: T[],
  page: number = 1,
  pageSize: number = DEFAULT_PAGE_SIZE
): PaginatedResult<T> {
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  const currentPage = Math.max(1, Math.min(page, totalPages || 1));
  
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  
  return {
    items: items.slice(startIndex, endIndex),
    pagination: {
      currentPage,
      pageSize,
      totalItems,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPrevPage: currentPage > 1,
      startIndex: startIndex + 1, // 1-indexed for display
      endIndex,
    },
  };
}

/**
 * Get page numbers to display in pagination UI
 */
export function getPageNumbers(
  currentPage: number,
  totalPages: number,
  maxVisible: number = 5
): (number | 'ellipsis')[] {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  
  const pages: (number | 'ellipsis')[] = [];
  const halfVisible = Math.floor(maxVisible / 2);
  
  let start = Math.max(1, currentPage - halfVisible);
  let end = Math.min(totalPages, currentPage + halfVisible);
  
  if (currentPage <= halfVisible) {
    end = maxVisible - 1;
  }
  if (currentPage > totalPages - halfVisible) {
    start = totalPages - maxVisible + 2;
  }
  
  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push('ellipsis');
  }
  
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  
  if (end < totalPages) {
    if (end < totalPages - 1) pages.push('ellipsis');
    pages.push(totalPages);
  }
  
  return pages;
}

// ============================================
// SORTING
// ============================================

export type SortDirection = 'asc' | 'desc';

export interface SortConfig<T> {
  field: keyof T;
  direction: SortDirection;
}

/**
 * Sort items by a field
 */
export function sortBy<T extends Record<string, unknown>>(
  items: T[],
  field: keyof T,
  direction: SortDirection = 'asc'
): T[] {
  return [...items].sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];
    
    if (aVal === bVal) return 0;
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;
    
    let comparison = 0;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      comparison = aVal.localeCompare(bVal);
    } else if (typeof aVal === 'number' && typeof bVal === 'number') {
      comparison = aVal - bVal;
    } else if (aVal instanceof Date && bVal instanceof Date) {
      comparison = aVal.getTime() - bVal.getTime();
    } else {
      comparison = String(aVal).localeCompare(String(bVal));
    }
    
    return direction === 'asc' ? comparison : -comparison;
  });
}
