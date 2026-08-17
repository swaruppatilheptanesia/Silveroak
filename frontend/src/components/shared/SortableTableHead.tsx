import * as React from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { TableHead } from '@/components/ui/table';
import { cn } from '@/lib/utils';

export type SortOrder = 'asc' | 'desc';

interface SortableTableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  /** Column header label. */
  label: React.ReactNode;
  /** The sort_by key this column sends to the API. */
  columnKey: string;
  /** Currently active sort_by. */
  sortBy?: string;
  /** Currently active sort_order. */
  sortOrder?: SortOrder;
  /** Called with columnKey when the header is clicked. */
  onSort: (columnKey: string) => void;
}

/**
 * A clickable, sort-aware {@link TableHead}. Renders a full-cell button so the
 * whole header is the click target, with a neutral ArrowUpDown when inactive and
 * ArrowUp/ArrowDown when this column is the active sort. Layout utilities passed
 * via `className` (text-right, hidden md:table-cell, widths) still land on the
 * <th>; the button owns the h-12/px-4 padding.
 */
export function SortableTableHead({
  label,
  columnKey,
  sortBy,
  sortOrder = 'asc',
  onSort,
  className,
  ...props
}: SortableTableHeadProps) {
  const active = sortBy === columnKey;
  const alignRight = /text-right/.test(className ?? '');

  return (
    <TableHead
      className={cn('p-0', className)}
      aria-sort={active ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
      {...props}
    >
      <button
        type="button"
        onClick={() => onSort(columnKey)}
        className={cn(
          'flex h-12 w-full select-none items-center gap-1.5 px-4 font-medium text-muted-foreground',
          'hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          alignRight ? 'justify-end' : 'justify-start',
        )}
      >
        <span>{label}</span>
        {active ? (
          sortOrder === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5 shrink-0" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 shrink-0" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 shrink-0 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}
