// Reusable DataTable component with built-in search, filters, and pagination
import { useState, useMemo, type ReactNode } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchInput } from './SearchInput';
import { paginate, getPageNumbers, filterBySearch, sortBy, type SortDirection } from '@/lib/filters';
import { PAGE_SIZE_OPTIONS, DEFAULT_PAGE_SIZE } from '@/lib/constants';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';

// Column definition
export interface Column<T> {
  id: string;
  header: string | ReactNode;
  accessorKey?: keyof T;
  cell?: (row: T) => ReactNode;
  sortable?: boolean;
  className?: string;
  headerClassName?: string;
}

// Filter option
export interface FilterOption {
  value: string;
  label: string;
}

// Filter definition
export interface FilterConfig {
  id: string;
  label: string;
  options: FilterOption[];
  defaultValue?: string;
}

interface DataTableProps<T extends Record<string, unknown>> {
  data: T[];
  columns: Column<T>[];
  searchFields?: (keyof T)[];
  searchPlaceholder?: string;
  filters?: FilterConfig[];
  defaultPageSize?: number;
  showPagination?: boolean;
  showSearch?: boolean;
  showPageSizeSelect?: boolean;
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  rowClassName?: string | ((row: T) => string);
  stickyHeader?: boolean;
  maxHeight?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  data,
  columns,
  searchFields = [],
  searchPlaceholder = 'Search...',
  filters = [],
  defaultPageSize = DEFAULT_PAGE_SIZE,
  showPagination = true,
  showSearch = true,
  showPageSizeSelect = true,
  emptyMessage = 'No data found',
  onRowClick,
  rowClassName,
  stickyHeader = false,
  maxHeight,
}: DataTableProps<T>) {
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);
  const [filterValues, setFilterValues] = useState<Record<string, string>>(() => {
    const defaults: Record<string, string> = {};
    filters.forEach(f => {
      defaults[f.id] = f.defaultValue || 'all';
    });
    return defaults;
  });
  const [sortConfig, setSortConfig] = useState<{ field: keyof T; direction: SortDirection } | null>(null);

  // Filter and search data
  const filteredData = useMemo(() => {
    let result = [...data];

    // Apply search
    if (searchQuery && searchFields.length > 0) {
      result = filterBySearch(result, searchQuery, searchFields);
    }

    // Apply filters
    filters.forEach(filter => {
      const value = filterValues[filter.id];
      if (value && value !== 'all') {
        result = result.filter(item => {
          const itemValue = item[filter.id as keyof T];
          return String(itemValue) === value;
        });
      }
    });

    // Apply sorting
    if (sortConfig) {
      result = sortBy(result, sortConfig.field, sortConfig.direction);
    }

    return result;
  }, [data, searchQuery, searchFields, filterValues, filters, sortConfig]);

  // Paginate
  const { items: paginatedData, pagination } = useMemo(() => {
    return paginate(filteredData, currentPage, pageSize);
  }, [filteredData, currentPage, pageSize]);

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (filterId: string, value: string) => {
    setFilterValues(prev => ({ ...prev, [filterId]: value }));
    setCurrentPage(1);
  };

  const handleSort = (field: keyof T) => {
    setSortConfig(prev => {
      if (prev?.field === field) {
        if (prev.direction === 'asc') return { field, direction: 'desc' };
        if (prev.direction === 'desc') return null;
      }
      return { field, direction: 'asc' };
    });
  };

  const pageNumbers = getPageNumbers(pagination.currentPage, pagination.totalPages);

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      {(showSearch || filters.length > 0) && (
        <div className="flex flex-col md:flex-row gap-4">
          {showSearch && searchFields.length > 0 && (
            <SearchInput
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder={searchPlaceholder}
              className="flex-1 md:max-w-sm"
            />
          )}
          {filters.map(filter => (
            <Select
              key={filter.id}
              value={filterValues[filter.id]}
              onValueChange={(value) => handleFilterChange(filter.id, value)}
            >
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder={filter.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {filter.label}</SelectItem>
                {filter.options.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>
      )}

      {/* Table */}
      <div 
        className={cn(
          'rounded-md border',
          maxHeight && 'overflow-auto',
        )}
        style={maxHeight ? { maxHeight } : undefined}
      >
        <Table>
          <TableHeader className={stickyHeader ? 'sticky top-0 bg-background z-10' : undefined}>
            <TableRow>
              {columns.map(column => {
                const isSortable = column.sortable && column.accessorKey;
                const isSorted = sortConfig?.field === column.accessorKey;
                
                return (
                  <TableHead 
                    key={column.id} 
                    className={cn(column.headerClassName, isSortable && 'cursor-pointer select-none')}
                    onClick={isSortable ? () => handleSort(column.accessorKey!) : undefined}
                  >
                    <div className="flex items-center gap-2">
                      {column.header}
                      {isSortable && (
                        isSorted ? (
                          sortConfig.direction === 'asc' ? (
                            <ArrowUp className="h-4 w-4" />
                          ) : (
                            <ArrowDown className="h-4 w-4" />
                          )
                        ) : (
                          <ArrowUpDown className="h-4 w-4 opacity-50" />
                        )
                      )}
                    </div>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell 
                  colSpan={columns.length} 
                  className="h-24 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((row, index) => (
                <TableRow
                  key={index}
                  className={cn(
                    onRowClick && 'cursor-pointer hover:bg-muted/50',
                    typeof rowClassName === 'function' ? rowClassName(row) : rowClassName
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map(column => (
                    <TableCell key={column.id} className={column.className}>
                      {column.cell 
                        ? column.cell(row)
                        : column.accessorKey 
                          ? String(row[column.accessorKey] ?? '')
                          : null
                      }
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {showPagination && pagination.totalPages > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>
              Showing {pagination.startIndex}-{pagination.endIndex} of {pagination.totalItems}
            </span>
            {showPageSizeSelect && (
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[70px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAGE_SIZE_OPTIONS.map(size => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(1)}
              disabled={!pagination.hasPrevPage}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(p => p - 1)}
              disabled={!pagination.hasPrevPage}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-1">
              {pageNumbers.map((page, idx) => (
                page === 'ellipsis' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-muted-foreground">...</span>
                ) : (
                  <Button
                    key={page}
                    variant={page === pagination.currentPage ? 'default' : 'outline'}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                )
              ))}
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={!pagination.hasNextPage}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setCurrentPage(pagination.totalPages)}
              disabled={!pagination.hasNextPage}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
