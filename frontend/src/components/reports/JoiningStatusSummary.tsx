import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserCheck, Clock, Ban, TrendingUp } from 'lucide-react';
import { useCompanyMasterReport, useJoiningStatusReport } from '@/hooks/use-report-analytics-api';
import { JOINING_STATUS_CONFIG } from '@/types/offer';
import { ReportToolbar, downloadCSV, type DateRange } from './ReportToolbar';
import PostingTypeFilter from './PostingTypeFilter';
import { uniqueNonEmptyStrings } from './reportUtils';

type QueryParams = {
  from?: Date;
  to?: Date;
  company_id?: string;
  department?: string;
  posting_type?: string;
};

export default function JoiningStatusSummary() {
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [companyFilter, setCompanyFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [postingTypeFilter, setPostingTypeFilter] = useState('all');

  const { data: companyData } = useCompanyMasterReport();

  const queryParams = useMemo<QueryParams>(() => ({
    from: dateRange.from,
    to: dateRange.to,
    company_id: companyFilter === 'all' ? undefined : companyFilter,
    department: deptFilter === 'all' ? undefined : deptFilter,
    posting_type_master_id: postingTypeFilter === 'all' ? undefined : postingTypeFilter,
  }), [companyFilter, dateRange.from, dateRange.to, deptFilter, postingTypeFilter]);

  const { data, isLoading } = useJoiningStatusReport(queryParams);

  const companies = useMemo(() => {
    return (companyData?.companies ?? []).map((company: any) => ({
      id: company.company_id,
      name: company.name,
    }));
  }, [companyData]);

  const offers = useMemo(() => {
    return (data?.offers ?? []).map((offer: any) => ({
      id: offer.offer_id,
      student_name: offer.student_name,
      enrollment_number: offer.enrollment_number,
      department: offer.department,
      company_name: offer.company_name,
      role: offer.role,
      joining_status: offer.joining_status,
      joining_date: offer.joining_date,
      joining_verified_by: offer.joining_verified_by,
      dnj_reason: offer.dnj_reason,
      status: offer.status,
    }));
  }, [data]);

  const departments = useMemo<string[]>(
    () => uniqueNonEmptyStrings(offers.map((offer) => offer.department)),
    [offers],
  );
  const stats = data?.stats ?? { total: 0, joined: 0, pending: 0, dnj: 0, rate: 0 };

  const handleExport = () => {
    const csv = `Student,Enrollment,Department,Company,Role,Joining Status,Joining Date,Verified By,DNJ Reason\n` +
      offers.map((offer) =>
        `${offer.student_name},${offer.enrollment_number},${offer.department},${offer.company_name},${offer.role},${JOINING_STATUS_CONFIG[offer.joining_status as keyof typeof JOINING_STATUS_CONFIG]?.label ?? offer.joining_status},${offer.joining_date ? new Date(offer.joining_date).toLocaleDateString('en-IN') : '—'},${offer.joining_verified_by || '-'},"${offer.dnj_reason || '-'}"`
      ).join('\n');
    downloadCSV(csv, 'joining_status_summary');
  };

  return (
    <div className="space-y-4">
      <ReportToolbar title="Joining Status Summary" totalRecords={stats.total} dateRange={dateRange} onDateRangeChange={setDateRange} onExportCSV={handleExport}>
        <div className="flex flex-wrap gap-2">
          <PostingTypeFilter
            value={postingTypeFilter}
            onValueChange={setPostingTypeFilter}
            triggerClassName="h-9 w-[180px] text-xs"
          />
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="h-9 w-[160px] text-xs"><SelectValue placeholder="Department" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((department) => (
                <SelectItem key={department} value={department}>{department}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="h-9 w-[160px] text-xs"><SelectValue placeholder="Company" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Companies</SelectItem>
              {companies.map((company) => (
                <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </ReportToolbar>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4 text-center"><UserCheck className="h-5 w-5 mx-auto mb-1 text-primary" /><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total Accepted</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><UserCheck className="h-5 w-5 mx-auto mb-1 text-emerald-600" /><p className="text-2xl font-bold">{stats.joined}</p><p className="text-xs text-muted-foreground">Joined</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Clock className="h-5 w-5 mx-auto mb-1 text-amber-600" /><p className="text-2xl font-bold">{stats.pending}</p><p className="text-xs text-muted-foreground">Pending</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Ban className="h-5 w-5 mx-auto mb-1 text-red-600" /><p className="text-2xl font-bold">{stats.dnj}</p><p className="text-xs text-muted-foreground">Did Not Join</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><TrendingUp className="h-5 w-5 mx-auto mb-1 text-emerald-600" /><p className="text-2xl font-bold">{stats.rate}%</p><p className="text-xs text-muted-foreground">Joining Rate</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joining Status</TableHead>
                  <TableHead>Joining Date</TableHead>
                  <TableHead>Verified By</TableHead>
                  <TableHead>DNJ Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && offers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">Loading joining status data...</TableCell>
                  </TableRow>
                ) : offers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No data for selected filters</TableCell>
                  </TableRow>
                ) : (
                  offers.map((offer) => (
                    <TableRow key={offer.id}>
                      <TableCell><div><p className="font-medium">{offer.student_name}</p><p className="text-xs text-muted-foreground">{offer.enrollment_number}</p></div></TableCell>
                      <TableCell>{offer.department}</TableCell>
                      <TableCell>{offer.company_name}</TableCell>
                      <TableCell>{offer.role}</TableCell>
                      <TableCell><Badge className={JOINING_STATUS_CONFIG[offer.joining_status as keyof typeof JOINING_STATUS_CONFIG]?.color ?? ''} variant="outline">{JOINING_STATUS_CONFIG[offer.joining_status as keyof typeof JOINING_STATUS_CONFIG]?.label ?? offer.joining_status}</Badge></TableCell>
                      <TableCell>{offer.joining_date ? new Date(offer.joining_date).toLocaleDateString('en-IN') : '—'}</TableCell>
                      <TableCell>{offer.joining_verified_by || '—'}</TableCell>
                      <TableCell className="max-w-48 truncate">{offer.dnj_reason || '—'}</TableCell>
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
