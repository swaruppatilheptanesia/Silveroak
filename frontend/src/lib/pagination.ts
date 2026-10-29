/**
 * Shared pagination normalizer for API list responses.
 *
 * The backend `paginate()` util sends snake_case (`total_pages`/`has_next`/`has_prev`), while the FE
 * paginated types declare camelCase (`totalPages`/`hasNext`/`hasPrev`). Services that cast the raw response
 * straight to their `Paginated*` type leave `totalPages` `undefined` at runtime, so every pager guard
 * `(totalPages ?? 1) > 1` is false and the pager never renders. Run the raw `pagination` block through
 * `normalizePagination` so both spellings are mapped (and derived from `total`/`limit` if neither is present).
 */

export interface RawPagination {
  page: number;
  limit: number;
  total: number;
  totalPages?: number;
  total_pages?: number;
  hasNext?: boolean;
  has_next?: boolean;
  hasPrev?: boolean;
  has_prev?: boolean;
}

export interface PageInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function normalizePagination(raw: RawPagination): PageInfo {
  const totalPages = (raw.totalPages ?? raw.total_pages ?? Math.ceil(raw.total / raw.limit)) || 1;
  return {
    page: raw.page,
    limit: raw.limit,
    total: raw.total,
    totalPages,
    hasNext: raw.hasNext ?? raw.has_next ?? raw.page < totalPages,
    hasPrev: raw.hasPrev ?? raw.has_prev ?? raw.page > 1,
  };
}
