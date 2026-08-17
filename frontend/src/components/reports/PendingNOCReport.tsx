import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Clock, AlertTriangle, UserCheck, Users } from 'lucide-react';
import { NOC_TYPE_LABELS, NOC_STATUS_CONFIG } from '@/types/noc';
import { usePendingNocReport } from '@/hooks/use-report-analytics-api';
import { ReportToolbar, downloadCSV, type DateRange } from './ReportToolbar';

type QueryParams = {
  from?: Date;
  to?: Date;
  department?: string;
  type?: string;
  status?: string;
  search?: string;
};

export default function PendingNOCReport() {
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');

  const queryParams = useMemo<QueryParams>(() => ({
    from: dateRange.from,
    to: dateRange.to,
    department: deptFilter === 'all' ? undefined : deptFilter,
    type: typeFilter === 'all' ? undefined : typeFilter,
    status: stageFilter === 'all' ? undefined : stageFilter,
    search: searchQuery || undefined,
  }), [dateRange.from, dateRange.to, deptFilter, searchQuery, stageFilter, typeFilter]);

  const { data, isLoading } = usePendingNocReport(queryParams);

  const pendingRequests = useMemo(() => {
    return (data?.requests ?? []).map((request: any) => ({
      id: request.noc_id,
      student_name: request.student_name,
      enrollment_number: request.enrollment_number,
      department: request.department,
      batch: request.batch,
      noc_type: request.noc_type,
      company_name: request.company_name,
      role_title: request.role_title,
      status: request.status,
      created_at: request.created_at,
      days_pending: request.days_pending,
      company_verification_status: request.company_verification_status,
    }));
  }, [data]);

  const departments = useMemo(() => {
    return Array.from(new Set(pendingRequests.map((request) => request.department))).sort();
  }, [pendingRequests]);

  const stats = data?.stats ?? { total: 0, at_faculty: 0, at_tpo: 0, at_verification: 0, overdue: 0 };

  const handleExport = () => {
    const rows = pendingRequests.map((request) =>
      `${request.student_name},${request.enrollment_number},${request.department},${NOC_TYPE_LABELS[request.noc_type as keyof typeof NOC_TYPE_LABELS] ?? request.noc_type},${request.company_name},${new Date(request.created_at).toLocaleDateString('en-IN')},${NOC_STATUS_CONFIG[request.status as keyof typeof NOC_STATUS_CONFIG]?.label ?? request.status},${request.days_pending}`
    );
    const csv = `Student,Roll No,Department,NOC Type,Company,Submitted,Stage,Days Pending\n${rows.join('\n')}`;
    downloadCSV(csv, 'pending_noc_requests');
  };

  const cards = [
    { label: 'Total Pending', value: stats.total, icon: Clock, color: 'text-primary' },
    { label: 'At Faculty', value: stats.at_faculty, icon: UserCheck, color: 'text-yellow-600' },
    { label: 'At TPO', value: stats.at_tpo, icon: Users, color: 'text-blue-600' },
    { label: 'Overdue (>7 days)', value: stats.overdue, icon: AlertTriangle, color: 'text-destructive' },
  ];

  return (
    <div className="space-y-4 lg:space-y-6">
      <ReportToolbar title="Pending NOC Requests" totalRecords={stats.total} dateRange={dateRange} onDateRangeChange={setDateRange} onExportCSV={handleExport} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <card.icon className={`h-5 w-5 shrink-0 ${card.color}`} />
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search name, roll no, company..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-9" />
            </div>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((department) => (
                  <SelectItem key={department} value={department}>{department}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue placeholder="NOC Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(NOC_TYPE_LABELS).map(([key, value]) => (
                  <SelectItem key={key} value={key}>{value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger><SelectValue placeholder="Approval Stage" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                <SelectItem value="pending_faculty">Faculty Approval</SelectItem>
                <SelectItem value="pending_tpo">TPO Approval</SelectItem>
                <SelectItem value="pending_company_verification">Company Verification</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Student</TableHead>
                  <TableHead>Roll No.</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>NOC Type</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead className="text-center">Days Pending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && pendingRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Loading pending NOC requests...
                    </TableCell>
                  </TableRow>
                ) : pendingRequests.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No pending NOC requests match the filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  pendingRequests.map((request) => {
                    const days = request.days_pending;
                    return (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium text-sm">{request.student_name}</TableCell>
                        <TableCell className="text-sm">{request.enrollment_number}</TableCell>
                        <TableCell className="text-sm">{request.department}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{NOC_TYPE_LABELS[request.noc_type as keyof typeof NOC_TYPE_LABELS] ?? request.noc_type}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{request.company_name}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {new Date(request.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </TableCell>
                        <TableCell>
                          <Badge className={`text-xs ${NOC_STATUS_CONFIG[request.status as keyof typeof NOC_STATUS_CONFIG]?.color ?? 'bg-muted text-foreground'}`}>
                            {NOC_STATUS_CONFIG[request.status as keyof typeof NOC_STATUS_CONFIG]?.label ?? request.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`font-medium ${days > 7 ? 'text-destructive' : days > 3 ? 'text-yellow-600' : 'text-muted-foreground'}`}>
                            {days}d
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground">
            Showing {pendingRequests.length} of {data?.stats?.total ?? pendingRequests.length} pending requests • Sorted oldest-first
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
