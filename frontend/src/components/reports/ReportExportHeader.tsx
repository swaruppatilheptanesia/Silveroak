import { Download, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadCsvTable, downloadExcelTable, type SpreadsheetCellValue } from '@/lib/spreadsheetExport';

interface ReportExportHeaderProps {
  title: string;
  subtitle?: string;
  totalRecords?: number;
  headers: string[];
  rows: SpreadsheetCellValue[][];
  filename: string;
  disabled?: boolean;
}

export default function ReportExportHeader({
  title,
  subtitle,
  totalRecords,
  headers,
  rows,
  filename,
  disabled,
}: ReportExportHeaderProps) {
  const isDisabled = disabled || rows.length === 0;

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h3 className="text-xl font-semibold">{title}</h3>
        {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        {typeof totalRecords === 'number' ? (
          <p className="text-xs text-muted-foreground">{totalRecords} record{totalRecords === 1 ? '' : 's'}</p>
        ) : null}
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={isDisabled} onClick={() => downloadCsvTable(headers, rows, filename)} className="gap-2">
          <Download className="h-4 w-4" /> CSV
        </Button>
        <Button variant="outline" size="sm" disabled={isDisabled} onClick={() => { void downloadExcelTable(headers, rows, filename); }} className="gap-2">
          <FileSpreadsheet className="h-4 w-4" /> Excel
        </Button>
      </div>
    </div>
  );
}
