import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCompanyCountReport } from '@/hooks/use-report-analytics-api';
import ReportScopeFilters from './ReportScopeFilters';
import ReportExportHeader from './ReportExportHeader';

const fmt = (value: unknown) => (value === null || value === undefined ? '—' : String(value));

export default function CompanyCountReport() {
  const [postingTypes, setPostingTypes] = useState<string[]>([]);

  const queryParams = useMemo(() => ({
    posting_type: postingTypes.length > 0 ? postingTypes : undefined,
  }), [postingTypes]);

  const { data, isLoading } = useCompanyCountReport(queryParams);
  const rows: any[] = data?.rows ?? [];

  const headers = ['Posting Type', 'Total Companies', 'Total Applications', 'Offers Released', 'Highest Package', 'Lowest Package'];
  const exportRows = rows.map((row) => [
    row.posting_type, row.total_companies, row.total_applications, row.offer_released_count, row.highest_package, row.lowest_package,
  ]);

  return (
    <div className="space-y-4 lg:space-y-6">
      <ReportExportHeader title="Company Data Count" subtitle="Company & application totals per posting type." totalRecords={rows.length} headers={headers} rows={exportRows} filename="company_count" />

      <Card>
        <CardContent className="p-4 space-y-4">
          <ReportScopeFilters postingTypes={{ values: postingTypes, onChange: setPostingTypes }} />

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {headers.map((header) => (<TableHead key={header} className="whitespace-nowrap text-center first:text-left">{header}</TableHead>))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && rows.length === 0 ? (
                  <TableRow><TableCell colSpan={headers.length} className="py-8 text-center text-muted-foreground">Loading company data...</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={headers.length} className="py-8 text-center text-muted-foreground">No data for the selected filters.</TableCell></TableRow>
                ) : (
                  rows.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium capitalize whitespace-nowrap">{fmt(row.posting_type)}</TableCell>
                      <TableCell className="text-center font-medium">{fmt(row.total_companies)}</TableCell>
                      <TableCell className="text-center">{fmt(row.total_applications)}</TableCell>
                      <TableCell className="text-center text-green-600">{fmt(row.offer_released_count)}</TableCell>
                      <TableCell className="text-center">{fmt(row.highest_package)}</TableCell>
                      <TableCell className="text-center">{fmt(row.lowest_package)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
