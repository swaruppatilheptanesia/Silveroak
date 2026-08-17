import { useCallback, useMemo, useRef, useState } from 'react';

export type SortOrder = 'asc' | 'desc';

export type SortValue = string | number | boolean | Date | null | undefined;
export type SortAccessor<T> = (row: T) => SortValue;

export interface ClientSort<T, TKey extends string = string> {
  sort_by: TKey | undefined;
  sort_order: SortOrder;
  onSort: (columnKey: TKey) => void;
  /** The rows sorted by the active column (or the original array when no column is active). */
  sorted: T[];
}

/**
 * Client-side column sorting for tables whose rows are already fully loaded in memory
 * (no server pagination / no server sort). Provide an accessor per sortable column key;
 * the accessor returns the value to compare. Two-state toggle (asc/desc), nulls sort last,
 * strings compare with numeric-aware locale compare. Pair with {@link SortableTableHead}.
 *
 * The `accessors` object may be defined inline — it is read through a ref, so sorting only
 * recomputes when `rows`, `sort_by`, or `sort_order` change.
 */
export function useClientSort<T, TKey extends string = string>(
  rows: T[],
  accessors: Record<TKey, SortAccessor<T>>,
  defaultSortBy?: TKey,
  defaultSortOrder: SortOrder = 'asc',
): ClientSort<T, TKey> {
  const accessorsRef = useRef(accessors);
  accessorsRef.current = accessors;

  const [sort_by, setSortBy] = useState<TKey | undefined>(defaultSortBy);
  const [sort_order, setSortOrder] = useState<SortOrder>(defaultSortOrder);

  const onSort = useCallback((columnKey: TKey) => {
    setSortBy((prev) => {
      if (prev === columnKey) {
        setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortOrder('asc');
      return columnKey;
    });
  }, []);

  const sorted = useMemo(() => {
    if (!sort_by) return rows;
    const accessor = accessorsRef.current[sort_by];
    if (!accessor) return rows;
    const direction = sort_order === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const av = accessor(a);
      const bv = accessor(b);
      const aEmpty = av === null || av === undefined || av === '';
      const bEmpty = bv === null || bv === undefined || bv === '';
      if (aEmpty && bEmpty) return 0;
      if (aEmpty) return 1; // empties last, regardless of direction
      if (bEmpty) return -1;
      let comparison = 0;
      if (typeof av === 'number' && typeof bv === 'number') {
        comparison = av - bv;
      } else if (av instanceof Date && bv instanceof Date) {
        comparison = av.getTime() - bv.getTime();
      } else if (typeof av === 'boolean' && typeof bv === 'boolean') {
        comparison = av === bv ? 0 : av ? 1 : -1;
      } else {
        comparison = String(av).localeCompare(String(bv), undefined, { numeric: true });
      }
      return comparison * direction;
    });
  }, [rows, sort_by, sort_order]);

  return { sort_by, sort_order, onSort, sorted };
}
