import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, FileCheck, Building2, Award } from 'lucide-react';
import { NOC_TYPE_LABELS } from '@/types/noc';
import { useIssuedNocRegisterReport } from '@/hooks/use-report-analytics-api';
import { ReportToolbar, downloadCSV, type DateRange } from './ReportToolbar';

type QueryParams = {
  from?: Date;
  to?: Date;
  department?: string;
  type?: string;
  search?: string;
};

export default function IssuedNOCRegister() {
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [searchQuery, setSearchQuery] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const queryParams = useMemo<QueryParams>(() => ({
    from: dateRange.from,
    to: dateRange.to,
    department: deptFilter === 'all' ? undefined : deptFilter,
    type: typeFilter === 'all' ? undefined : typeFilter,
    search: searchQuery || undefined,
  }), [dateRange.from, dateRange.to, deptFilter, searchQuery, typeFilter]);

  const { data, isLoading } = useIssuedNocRegisterReport(queryParams);

  const issuedNOCs = useMemo(() => {
    return (data?.requests ?? []).map((request: any) => ({
      id: request.noc_id,
      noc_number: request.noc_number,
      student_name: request.student_name,
      enrollment_number: request.enrollment_number,
      department: request.department,
      batch: request.batch,
      noc_type: request.noc_type,
      company_name: request.company_name,
      issued_at: request.issued_at,
      tpo_approver_name: request.approved_by,
      role_title: request.role_title,
    }));
  }, [data]);

  const departments = useMemo(() => Array.from(new Set(issuedNOCs.map((request) => request.department))).sort(), [issuedNOCs]);

  const stats = data?.stats ?? { total: 0, unique_companies: 0, by_type: { internship: 0, training: 0, project: 0 } };

  const handleExport = () => {
    const rows = issuedNOCs.map((request) =>
      `${request.noc_number || '—'},${request.student_name},${request.enrollment_number},${request.department},${request.company_name},${NOC_TYPE_LABELS[request.noc_type as keyof typeof NOC_TYPE_LABELS] ?? request.noc_type},${request.issued_at ? new Date(request.issued_at).toLocaleDateString('en-IN') : '—'},${request.tpo_approver_name || '—'}`
    );
    const csv = `NOC Number,Student,Roll No,Department,Company,Type,Issued Date,Approved By\n${rows.join('\n')}`;
    downloadCSV(csv, 'issued_noc_register');
  };

  const cards = [
    { label: 'Total Issued', value: stats.total, icon: Award, color: 'text-green-600' },
    { label: 'Unique Companies', value: stats.unique_companies, icon: Building2, color: 'text-primary' },
    { label: 'Internships', value: stats.by_type.internship || 0, icon: FileCheck, color: 'text-blue-600' },
    { label: 'Training / Projects', value: (stats.by_type.training || 0) + (stats.by_type.project || 0), icon: FileCheck, color: 'text-yellow-600' },
  ];

  return (
    <div className="space-y-4 lg:space-y-6">
      <ReportToolbar title="Issued NOC Register" totalRecords={stats.total} dateRange={dateRange} onDateRangeChange={setDateRange} onExportCSV={handleExport} />

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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search NOC ID, name, roll no..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-9" />
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
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">NOC Number</TableHead>
                  <TableHead className="min-w-[140px]">Student</TableHead>
                  <TableHead>Roll No.</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Issued Date</TableHead>
                  <TableHead>Approved By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && issuedNOCs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Loading issued NOCs...
                    </TableCell>
                  </TableRow>
                ) : issuedNOCs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No issued NOCs match the filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  issuedNOCs.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <Badge variant="secondary" className="font-mono text-xs">{request.noc_number || '—'}</Badge>
                      </TableCell>
                      <TableCell className="font-medium text-sm">{request.student_name}</TableCell>
                      <TableCell className="text-sm">{request.enrollment_number}</TableCell>
                      <TableCell className="text-sm">{request.department}</TableCell>
                      <TableCell className="text-sm">{request.company_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{NOC_TYPE_LABELS[request.noc_type as keyof typeof NOC_TYPE_LABELS] ?? request.noc_type}</Badge>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {request.issued_at ? new Date(request.issued_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{request.tpo_approver_name || '—'}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground">
            Showing {issuedNOCs.length} of {data?.stats?.total ?? issuedNOCs.length} issued NOCs
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
