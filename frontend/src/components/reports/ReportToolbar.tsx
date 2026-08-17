import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download } from 'lucide-react';
import { format } from 'date-fns';

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface ReportToolbarProps {
  title: string;
  totalRecords?: number;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  onExportCSV: () => void;
  children?: React.ReactNode;
}

export function ReportToolbar({
  title,
  totalRecords,
  dateRange,
  onDateRangeChange,
  onExportCSV,
  children,
}: ReportToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="text-base font-semibold">{title}</h3>
        {totalRecords !== undefined && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
            {totalRecords.toLocaleString('en-IN')} records
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Date Range Picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2 text-xs">
              <CalendarIcon className="h-3.5 w-3.5" />
              {dateRange.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, 'dd MMM')} – {format(dateRange.to, 'dd MMM yy')}
                  </>
                ) : (
                  format(dateRange.from, 'dd MMM yyyy')
                )
              ) : (
                'Date Range'
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="flex flex-col sm:flex-row">
              <Calendar
                mode="single"
                selected={dateRange.from}
                onSelect={(date) => onDateRangeChange({ ...dateRange, from: date })}
                initialFocus
              />
              <Calendar
                mode="single"
                selected={dateRange.to}
                onSelect={(date) => onDateRangeChange({ ...dateRange, to: date })}
              />
            </div>
            <div className="flex items-center justify-between p-3 border-t">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDateRangeChange({ from: undefined, to: undefined })}
              >
                Clear
              </Button>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const now = new Date();
                    const thirtyDaysAgo = new Date(now);
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    onDateRangeChange({ from: thirtyDaysAgo, to: now });
                  }}
                >
                  30 Days
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const now = new Date();
                    const ninetyDaysAgo = new Date(now);
                    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                    onDateRangeChange({ from: ninetyDaysAgo, to: now });
                  }}
                >
                  90 Days
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const now = new Date();
                    onDateRangeChange({ from: new Date(now.getFullYear(), 0, 1), to: now });
                  }}
                >
                  YTD
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Extra filters slot */}
        {children}

        <div className="flex items-center gap-1 border-l pl-2 ml-1">
          <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs" onClick={onExportCSV}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </div>
      </div>
    </div>
  );
}

// Helper to generate CSV and trigger download
export function downloadCSV(csvContent: string, filename: string) {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// Helper to filter items by date range
export function filterByDateRange<T>(
  items: T[],
  dateField: keyof T,
  range: DateRange
): T[] {
  if (!range.from && !range.to) return items;
  return items.filter(item => {
    const dateStr = item[dateField];
    if (typeof dateStr !== 'string') return true;
    const date = new Date(dateStr);
    if (range.from && date < range.from) return false;
    if (range.to) {
      const endOfDay = new Date(range.to);
      endOfDay.setHours(23, 59, 59, 999);
      if (date > endOfDay) return false;
    }
    return true;
  });
}
