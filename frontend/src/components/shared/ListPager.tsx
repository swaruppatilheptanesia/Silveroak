import { Button } from '@/components/ui/button';

interface ListPagerProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

/**
 * Shared server-pagination control: "Page X of Y" + Prev/Next. Renders nothing when there is a single page
 * (or none), so it can be dropped under any list without a guard. Pair with a server-paginated query whose
 * `pagination.page`/`pagination.totalPages` come through the normalized shape (see `@/lib/pagination`).
 */
export function ListPager({ page, totalPages, onPageChange, className }: ListPagerProps) {
  if (totalPages <= 1) return null;
  return (
    <div className={`flex items-center justify-between gap-2 pt-4 ${className ?? ''}`}>
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default ListPager;
