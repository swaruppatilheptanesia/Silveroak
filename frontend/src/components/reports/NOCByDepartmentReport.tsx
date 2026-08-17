import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronUp, Building, Users, CheckCircle, Clock } from 'lucide-react';
import { usePostingTypeOptions } from '@/hooks/use-posting-type-options';
import { useNocByDepartmentReport } from '@/hooks/use-report-analytics-api';
import { ReportToolbar, downloadCSV, type DateRange } from './ReportToolbar';

type QueryParams = {
  from?: Date;
  to?: Date;
  posting_type?: string;
  status?: string;
  academic_year?: string;
};

interface DeptSummary {
  department: string;
  total: number;
  pending: number;
  approved: number;
  issued: number;
  rejected: number;
  approvalRate: number;
  batches: BatchSummary[];
}

interface BatchSummary {
  batch: string;
  total: number;
  pending: number;
  approved: number;
  issued: number;
  rejected: number;
}

export default function NOCByDepartmentReport() {
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [postingTypeFilter, setPostingTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedDept, setExpandedDept] = useState<string | null>(null);

  const { options: postingTypeOptions, isLoading: postingTypesLoading, isEmpty: postingTypesEmpty } = usePostingTypeOptions();

  const queryParams = useMemo<QueryParams>(() => ({
    from: dateRange.from,
    to: dateRange.to,
    posting_type: postingTypeFilter === 'all' ? undefined : postingTypeFilter,
    status: statusFilter === 'all' ? undefined : statusFilter,
  }), [dateRange.from, dateRange.to, statusFilter, postingTypeFilter]);

  const { data, isLoading } = useNocByDepartmentReport(queryParams);

  const deptSummaries: DeptSummary[] = useMemo(() => {
    return (data?.departments ?? []).map((department: any) => ({
      department: department.department,
      total: department.total,
      pending: department.pending,
      approved: department.approved,
      issued: department.issued,
      rejected: department.rejected,
      approvalRate: department.approval_rate,
      batches: (department.batches ?? []).map((batch: any) => ({
        batch: batch.batch,
        total: batch.total,
        pending: batch.pending,
        approved: batch.approved,
        issued: batch.issued,
        rejected: batch.rejected,
      })),
    })).sort((a, b) => b.total - a.total);
  }, [data]);

  const overallStats = data?.stats ?? { total: 0, departments: 0, pending: 0, issued: 0 };

  const handleExport = () => {
    const rows: string[] = [];
    deptSummaries.forEach((department) => {
      rows.push(`${department.department},—,${department.total},${department.pending},${department.approved + department.issued},${department.rejected},${department.approvalRate}%`);
      department.batches.forEach((batch) => {
        rows.push(`${department.department},${batch.batch},${batch.total},${batch.pending},${batch.approved + batch.issued},${batch.rejected},—`);
      });
    });
    const csv = `Department,Batch,Total,Pending,Approved/Issued,Rejected,Approval Rate\n${rows.join('\n')}`;
    downloadCSV(csv, 'noc_by_department_batch');
  };

  const cards = [
    { label: 'Total Requests', value: overallStats.total, icon: Users, color: 'text-primary' },
    { label: 'Departments', value: overallStats.departments, icon: Building, color: 'text-blue-600' },
    { label: 'Pending', value: overallStats.pending, icon: Clock, color: 'text-yellow-600' },
    { label: 'Issued', value: overallStats.issued, icon: CheckCircle, color: 'text-green-600' },
  ];

  return (
    <div className="space-y-4 lg:space-y-6">
      <ReportToolbar title="NOC by Department / Batch" totalRecords={overallStats.total} dateRange={dateRange} onDateRangeChange={setDateRange} onExportCSV={handleExport} />

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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select value={postingTypeFilter} onValueChange={setPostingTypeFilter} disabled={postingTypesLoading}>
              <SelectTrigger><SelectValue placeholder="Posting Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Posting Types</SelectItem>
                {postingTypesEmpty ? (
                  <SelectItem value="__empty__" disabled>No posting types defined</SelectItem>
                ) : (
                  postingTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="issued">Issued</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Department</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Pending</TableHead>
                  <TableHead className="text-center">Approved / Issued</TableHead>
                  <TableHead className="text-center">Rejected</TableHead>
                  <TableHead className="min-w-[140px]">Approval Rate</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && deptSummaries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Loading NOC analytics...
                    </TableCell>
                  </TableRow>
                ) : deptSummaries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No NOC data matches the filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  deptSummaries.map((department) => {
                    const isExpanded = expandedDept === department.department;

                    return (
                      <>
                        <TableRow
                          key={department.department}
                          className="cursor-pointer"
                          onClick={() => setExpandedDept(isExpanded ? null : department.department)}
                        >
                          <TableCell className="font-medium text-sm">{department.department}</TableCell>
                          <TableCell className="text-center font-medium">{department.total}</TableCell>
                          <TableCell className="text-center text-yellow-600 font-medium">{department.pending}</TableCell>
                          <TableCell className="text-center text-green-600 font-medium">{department.approved + department.issued}</TableCell>
                          <TableCell className="text-center text-destructive font-medium">{department.rejected}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={department.approvalRate} className="h-2 flex-1" />
                              <span className="text-sm font-medium w-10 text-right">{department.approvalRate}%</span>
                            </div>
                          </TableCell>
                          <TableCell>{isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow key={`${department.department}-batches`}>
                            <TableCell colSpan={7} className="bg-muted/30 p-0">
                              <div className="p-4">
                                <p className="text-sm font-medium mb-3">Batch-wise Breakdown</p>
                                <div className="rounded-md border bg-background overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Batch</TableHead>
                                        <TableHead className="text-center">Total</TableHead>
                                        <TableHead className="text-center">Pending</TableHead>
                                        <TableHead className="text-center">Approved / Issued</TableHead>
                                        <TableHead className="text-center">Rejected</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {department.batches.map((batch) => (
                                        <TableRow key={batch.batch}>
                                          <TableCell className="font-medium text-sm">{batch.batch}</TableCell>
                                          <TableCell className="text-center">{batch.total}</TableCell>
                                          <TableCell className="text-center text-yellow-600">{batch.pending}</TableCell>
                                          <TableCell className="text-center text-green-600">{batch.approved + batch.issued}</TableCell>
                                          <TableCell className="text-center text-destructive">{batch.rejected}</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground">
            Showing {deptSummaries.length} departments • Click a row to expand batch details
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
