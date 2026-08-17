import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Building2, CheckCircle2, XCircle, AlertTriangle, TrendingUp } from 'lucide-react';
import { useCompanyMasterReport, useOfferAcceptanceReport } from '@/hooks/use-report-analytics-api';
import { OFFER_STATUS_CONFIG } from '@/types/offer';
import { ReportToolbar, downloadCSV, type DateRange } from './ReportToolbar';
import PostingTypeFilter from './PostingTypeFilter';
import { uniqueNonEmptyStrings } from './reportUtils';

type QueryParams = {
  from?: Date;
  to?: Date;
  company_id?: string;
  department?: string;
  batch?: string;
  posting_type?: string;
};

export default function OfferAcceptanceSummary() {
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [companyFilter, setCompanyFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');
  const [postingTypeFilter, setPostingTypeFilter] = useState('all');

  const { data: companyData } = useCompanyMasterReport();

  const queryParams = useMemo<QueryParams>(() => ({
    from: dateRange.from,
    to: dateRange.to,
    company_id: companyFilter === 'all' ? undefined : companyFilter,
    batch: batchFilter === 'all' ? undefined : batchFilter,
    posting_type_master_id: postingTypeFilter === 'all' ? undefined : postingTypeFilter,
  }), [batchFilter, companyFilter, dateRange.from, dateRange.to, postingTypeFilter]);

  const { data, isLoading } = useOfferAcceptanceReport(queryParams);

  const companies = useMemo(() => {
    return (companyData?.companies ?? []).map((company: any) => ({
      id: company.company_id,
      name: company.name,
    }));
  }, [companyData]);

  const offers = useMemo(() => data?.offers ?? [], [data]);
  const batches = useMemo<string[]>(
    () => uniqueNonEmptyStrings(offers.map((offer: any) => offer.batch)),
    [offers],
  );
  const byCompany = data?.companies ?? [];
  const totals = data?.stats ?? { total: 0, pending: 0, accepted: 0, rejected: 0, rate: 0 };

  const handleExport = () => {
    const csv = `Student,Enrollment,Department,Batch,Company,Role,CTC/Stipend,Offer Date,Status\n` +
      offers.map((offer: any) =>
        `${offer.student_name},${offer.enrollment_number},${offer.department},${offer.batch},${offer.company_name},${offer.role},${offer.ctc || offer.stipend || '-'},${new Date(offer.offer_date).toLocaleDateString('en-IN')},${OFFER_STATUS_CONFIG[offer.status as keyof typeof OFFER_STATUS_CONFIG]?.label ?? offer.status}`
      ).join('\n');
    downloadCSV(csv, 'offer_acceptance_summary');
  };

  return (
    <div className="space-y-4">
      <ReportToolbar title="Offer Acceptance Summary" totalRecords={totals.total} dateRange={dateRange} onDateRangeChange={setDateRange} onExportCSV={handleExport}>
        <div className="flex flex-wrap gap-2">
          <PostingTypeFilter
            value={postingTypeFilter}
            onValueChange={setPostingTypeFilter}
            triggerClassName="h-9 w-[180px] text-xs"
          />
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="h-9 w-[160px] text-xs"><SelectValue placeholder="Company" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={batchFilter} onValueChange={setBatchFilter}>
            <SelectTrigger className="h-9 w-[100px] text-xs"><SelectValue placeholder="Batch" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Batches</SelectItem>
              {batches.map((batch) => (
                <SelectItem key={batch} value={batch}>{batch}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </ReportToolbar>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4 text-center"><Building2 className="h-5 w-5 mx-auto mb-1 text-primary" /><p className="text-2xl font-bold">{totals.total}</p><p className="text-xs text-muted-foreground">Total Offers</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><AlertTriangle className="h-5 w-5 mx-auto mb-1 text-amber-600" /><p className="text-2xl font-bold">{totals.pending}</p><p className="text-xs text-muted-foreground">Pending</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-green-600" /><p className="text-2xl font-bold">{totals.accepted}</p><p className="text-xs text-muted-foreground">Accepted</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><XCircle className="h-5 w-5 mx-auto mb-1 text-red-600" /><p className="text-2xl font-bold">{totals.rejected}</p><p className="text-xs text-muted-foreground">Rejected</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><TrendingUp className="h-5 w-5 mx-auto mb-1 text-emerald-600" /><p className="text-2xl font-bold">{totals.rate}%</p><p className="text-xs text-muted-foreground">Acceptance Rate</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Pending</TableHead>
                  <TableHead className="text-center">Accepted</TableHead>
                  <TableHead className="text-center">Rejected</TableHead>
                  <TableHead>Acceptance Rate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && byCompany.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">Loading offer acceptance data...</TableCell>
                  </TableRow>
                ) : byCompany.map((row: any) => (
                  <TableRow key={row.company_name}>
                    <TableCell className="font-medium">{row.company_name}</TableCell>
                    <TableCell className="text-center">{row.total}</TableCell>
                    <TableCell className="text-center"><Badge variant="outline" className="bg-amber-500/10 text-amber-600">{row.pending}</Badge></TableCell>
                    <TableCell className="text-center"><Badge variant="outline" className="bg-green-500/10 text-green-600">{row.accepted}</Badge></TableCell>
                    <TableCell className="text-center"><Badge variant="outline" className="bg-red-500/10 text-red-600">{row.rejected}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress value={row.acceptance_rate} className="h-2 w-20" />
                        <span className="text-sm font-medium">{row.acceptance_rate}%</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {byCompany.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">No data for selected filters</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
