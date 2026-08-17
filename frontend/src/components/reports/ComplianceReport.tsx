import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldCheck, ShieldAlert, Ban, RefreshCw, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { useComplianceReport } from '@/hooks/use-report-analytics-api';
import { OFFER_STATUS_CONFIG } from '@/types/offer';
import { ReportToolbar, downloadCSV, type DateRange } from './ReportToolbar';
import PostingTypeFilter from './PostingTypeFilter';
import { uniqueNonEmptyStrings } from './reportUtils';

type QueryParams = {
  department?: string;
  posting_type?: string;
  search?: string;
};

export default function ComplianceReport() {
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [deptFilter, setDeptFilter] = useState('all');
  const [complianceFilter, setComplianceFilter] = useState('all');
  const [postingTypeFilter, setPostingTypeFilter] = useState('all');

  const queryParams = useMemo<QueryParams>(() => ({
    department: deptFilter === 'all' ? undefined : deptFilter,
    posting_type_master_id: postingTypeFilter === 'all' ? undefined : postingTypeFilter,
  }), [deptFilter, postingTypeFilter]);

  const { data, isLoading } = useComplianceReport(queryParams);

  const offers = useMemo(() => {
    return (data?.offers ?? []).map((offer: any) => ({
      id: offer.offer_id,
      student_name: offer.student_name,
      enrollment_number: offer.enrollment_number,
      department: offer.department,
      company_name: offer.company_name,
      status: offer.status,
      applications_blocked: offer.applications_blocked,
      admin_override_enabled: offer.admin_override_enabled,
      admin_override_by: offer.admin_override_by,
      admin_override_at: offer.admin_override_at,
      compliance_status: offer.compliance_status,
    }));
  }, [data]);

  const departments = useMemo<string[]>(
    () => uniqueNonEmptyStrings(offers.map((offer) => offer.department)),
    [offers],
  );

  const filtered = useMemo(() => {
    return offers.filter((offer) => {
      if (complianceFilter === 'blocked') return offer.applications_blocked;
      if (complianceFilter === 'override') return offer.admin_override_enabled;
      if (complianceFilter === 'compliant') return !offer.applications_blocked && !offer.admin_override_enabled;
      return true;
    });
  }, [complianceFilter, offers]);

  const stats = data?.stats ?? { total: 0, compliant: 0, blocked: 0, overrides: 0, rate: 0 };

  const handleExport = () => {
    const csv = `Student,Enrollment,Department,Company,Offer Status,Applications,Override,Override By,Override Date\n` +
      filtered.map((offer) =>
        `${offer.student_name},${offer.enrollment_number},${offer.department},${offer.company_name},${OFFER_STATUS_CONFIG[offer.status as keyof typeof OFFER_STATUS_CONFIG]?.label ?? offer.status},${offer.applications_blocked ? 'Blocked' : 'Active'},${offer.admin_override_enabled ? 'Yes' : 'No'},${offer.admin_override_by || '-'},${offer.admin_override_at ? format(new Date(offer.admin_override_at), 'dd MMM yyyy HH:mm') : '-'}`
      ).join('\n');
    downloadCSV(csv, 'compliance_report');
  };

  return (
    <div className="space-y-4">
      <ReportToolbar title="Active Offer Compliance" totalRecords={stats.total} dateRange={dateRange} onDateRangeChange={setDateRange} onExportCSV={handleExport}>
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
          <Select value={complianceFilter} onValueChange={setComplianceFilter}>
            <SelectTrigger className="h-9 w-[160px] text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="compliant">Compliant</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="override">Override Active</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </ReportToolbar>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="p-4 text-center"><ShieldCheck className="h-5 w-5 mx-auto mb-1 text-primary" /><p className="text-2xl font-bold">{stats.total}</p><p className="text-xs text-muted-foreground">Total Offers</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><ShieldCheck className="h-5 w-5 mx-auto mb-1 text-green-600" /><p className="text-2xl font-bold">{stats.compliant}</p><p className="text-xs text-muted-foreground">Compliant</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><Ban className="h-5 w-5 mx-auto mb-1 text-red-600" /><p className="text-2xl font-bold">{stats.blocked}</p><p className="text-xs text-muted-foreground">Blocked</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><RefreshCw className="h-5 w-5 mx-auto mb-1 text-amber-600" /><p className="text-2xl font-bold">{stats.overrides}</p><p className="text-xs text-muted-foreground">Overrides</p></CardContent></Card>
        <Card><CardContent className="p-4 text-center"><TrendingUp className="h-5 w-5 mx-auto mb-1 text-emerald-600" /><p className="text-2xl font-bold">{stats.rate}%</p><p className="text-xs text-muted-foreground">Compliance Rate</p></CardContent></Card>
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
                  <TableHead>Offer Status</TableHead>
                  <TableHead>Applications</TableHead>
                  <TableHead>Override</TableHead>
                  <TableHead>Override By</TableHead>
                  <TableHead>Override Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-6 text-muted-foreground">Loading compliance data...</TableCell>
                  </TableRow>
                ) : filtered.map((offer) => (
                  <TableRow key={offer.id}>
                    <TableCell><div><p className="font-medium">{offer.student_name}</p><p className="text-xs text-muted-foreground">{offer.enrollment_number}</p></div></TableCell>
                    <TableCell>{offer.department}</TableCell>
                    <TableCell>{offer.company_name}</TableCell>
                    <TableCell><Badge className={OFFER_STATUS_CONFIG[offer.status as keyof typeof OFFER_STATUS_CONFIG]?.color ?? ''} variant="outline">{OFFER_STATUS_CONFIG[offer.status as keyof typeof OFFER_STATUS_CONFIG]?.label ?? offer.status}</Badge></TableCell>
                    <TableCell>
                      {offer.applications_blocked ? (
                        <Badge variant="destructive" className="text-xs"><ShieldAlert className="h-3 w-3 mr-1" />Blocked</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs"><ShieldCheck className="h-3 w-3 mr-1" />Active</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {offer.admin_override_enabled ? (
                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20" variant="outline">Yes</Badge>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-sm">{offer.admin_override_by || '—'}</TableCell>
                    <TableCell className="text-sm">{offer.admin_override_at ? format(new Date(offer.admin_override_at), 'dd MMM yyyy') : '—'}</TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && !isLoading && (
                  <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No data for selected filters</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
