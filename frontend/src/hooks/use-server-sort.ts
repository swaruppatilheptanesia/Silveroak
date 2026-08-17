import { useCallback, useState } from 'react';

export type SortOrder = 'asc' | 'desc';

export interface ServerSort<TKey extends string = string> {
  sort_by: TKey | undefined;
  sort_order: SortOrder;
  /** Toggle sort for a column: new column → asc, same column → flip asc/desc. */
  onSort: (columnKey: TKey) => void;
  /** Restore the default sort_by/sort_order. */
  reset: () => void;
}

/**
 * Server-side sort state for a paginated list table. Two-state toggle (asc/desc,
 * never "off" — the API always needs a defined order). Wire the returned
 * sort_by/sort_order into the list hook's params and pass onSort to
 * {@link SortableTableHead}. `onChange` runs after every sort change — pass
 * `() => setPage(1)` so sorting returns to the first page.
 */
export function useServerSort<TKey extends string = string>(
  defaultSortBy?: TKey,
  defaultSortOrder: SortOrder = 'desc',
  onChange?: () => void,
): ServerSort<TKey> {
  const [sort_by, setSortBy] = useState<TKey | undefined>(defaultSortBy);
  const [sort_order, setSortOrder] = useState<SortOrder>(defaultSortOrder);

  const onSort = useCallback(
    (columnKey: TKey) => {
      setSortBy((prev) => {
        if (prev === columnKey) {
          setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
          return prev;
        }
        setSortOrder('asc');
        return columnKey;
      });
      onChange?.();
    },
    [onChange],
  );

  const reset = useCallback(() => {
    setSortBy(defaultSortBy);
    setSortOrder(defaultSortOrder);
  }, [defaultSortBy, defaultSortOrder]);

  return { sort_by, sort_order, onSort, reset };
}
