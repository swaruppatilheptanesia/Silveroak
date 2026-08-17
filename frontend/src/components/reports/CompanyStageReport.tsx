import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useCompanyStageReport } from '@/hooks/use-report-analytics-api';
import ReportScopeFilters from './ReportScopeFilters';
import ReportExportHeader from './ReportExportHeader';

const fmt = (value: unknown) => (value === null || value === undefined ? '—' : String(value));

export default function CompanyStageReport() {
  const [postingTypes, setPostingTypes] = useState<string[]>([]);

  const queryParams = useMemo(() => ({
    posting_type: postingTypes.length > 0 ? postingTypes : undefined,
  }), [postingTypes]);

  const { data, isLoading } = useCompanyStageReport(queryParams);
  const rows: any[] = data?.rows ?? [];

  const headers = [
    'Posting Type', 'Total Companies', 'Total Applications', 'Applied', 'Mock Round', 'Shortlisted', 'Test Scheduled',
    'Interview', 'HR Round', 'Offer Released', 'Rejected',
  ];
  const exportRows = rows.map((row) => [
    row.posting_type, row.total_companies, row.total_applications, row.applied, row.mock_round, row.shortlisted,
    row.test_scheduled, row.interview, row.hr_round, row.offer_released, row.rejected,
  ]);

  return (
    <div className="space-y-4 lg:space-y-6">
      <ReportExportHeader title="Company Data — Stage-wise" subtitle="Application stage counts per posting type." totalRecords={rows.length} headers={headers} rows={exportRows} filename="company_stage" />

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
                  <TableRow><TableCell colSpan={headers.length} className="py-8 text-center text-muted-foreground">Loading stage data...</TableCell></TableRow>
                ) : rows.length === 0 ? (
                  <TableRow><TableCell colSpan={headers.length} className="py-8 text-center text-muted-foreground">No data for the selected filters.</TableCell></TableRow>
                ) : (
                  rows.map((row, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium capitalize whitespace-nowrap">{fmt(row.posting_type)}</TableCell>
                      <TableCell className="text-center font-medium">{fmt(row.total_companies)}</TableCell>
                      <TableCell className="text-center">{fmt(row.total_applications)}</TableCell>
                      <TableCell className="text-center">{fmt(row.applied)}</TableCell>
                      <TableCell className="text-center">{fmt(row.mock_round)}</TableCell>
                      <TableCell className="text-center">{fmt(row.shortlisted)}</TableCell>
                      <TableCell className="text-center">{fmt(row.test_scheduled)}</TableCell>
                      <TableCell className="text-center">{fmt(row.interview)}</TableCell>
                      <TableCell className="text-center">{fmt(row.hr_round)}</TableCell>
                      <TableCell className="text-center text-green-600">{fmt(row.offer_released)}</TableCell>
                      <TableCell className="text-center text-destructive">{fmt(row.rejected)}</TableCell>
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
