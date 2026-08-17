import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronDown, ChevronUp, Users, UserCheck, XCircle, Clock } from 'lucide-react';
import { APPLICATION_STAGE_CONFIG } from '@/types/application';
import { useCompanyMasterReport, useShortlistRejectionReport } from '@/hooks/use-report-analytics-api';
import { ReportToolbar, downloadCSV, type DateRange } from './ReportToolbar';
import PostingTypeFilter from './PostingTypeFilter';

interface OpportunitySummary {
  postingId: string;
  postingTitle: string;
  companyName: string;
  total: number;
  shortlisted: number;
  rejected: number;
  pending: number;
  shortlistRate: number;
  rejectionRate: number;
  students: {
    id: string;
    name: string;
    rollNo: string;
    department: string;
    stage: string;
    outcome: 'shortlisted' | 'rejected' | 'pending';
    remarks?: string;
  }[];
}

type QueryParams = {
  company_id?: string;
  posting_type?: string;
  department?: string;
  search?: string;
};

export default function ShortlistRejectionReport() {
  const [dateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [companyFilter, setCompanyFilter] = useState('all');
  const [postingTypeFilter, setPostingTypeFilter] = useState('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: companyData } = useCompanyMasterReport();

  const queryParams = useMemo<QueryParams>(() => ({
    company_id: companyFilter === 'all' ? undefined : companyFilter,
    posting_type_master_id: postingTypeFilter === 'all' ? undefined : postingTypeFilter,
  }), [companyFilter, postingTypeFilter]);

  const { data, isLoading } = useShortlistRejectionReport(queryParams);

  const companies = useMemo(() => {
    return (companyData?.companies ?? []).map((company: any) => ({
      id: company.company_id,
      name: company.name,
    }));
  }, [companyData]);

  const summaries: OpportunitySummary[] = useMemo(() => {
    return (data?.postings ?? []).map((posting: any) => ({
      postingId: posting.posting_id,
      postingTitle: posting.posting_title,
      companyName: posting.company_name,
      total: posting.total,
      shortlisted: posting.shortlisted,
      rejected: posting.rejected,
      pending: posting.pending,
      shortlistRate: posting.shortlist_rate,
      rejectionRate: posting.rejection_rate,
      students: (posting.students ?? []).map((student: any) => ({
        id: student.id,
        name: student.name,
        rollNo: student.rollNo,
        department: student.department,
        stage: student.stage,
        outcome: student.outcome,
        remarks: student.remarks,
      })),
    })).sort((a, b) => b.total - a.total);
  }, [data]);

  const overallStats = useMemo(() => {
    const total = summaries.reduce((sum, summary) => sum + summary.total, 0);
    const shortlisted = summaries.reduce((sum, summary) => sum + summary.shortlisted, 0);
    const rejected = summaries.reduce((sum, summary) => sum + summary.rejected, 0);
    const pending = summaries.reduce((sum, summary) => sum + summary.pending, 0);
    const decided = shortlisted + rejected;
    const overallRate = decided > 0 ? Math.round((shortlisted / decided) * 100) : 0;
    return { total, shortlisted, rejected, pending, overallRate };
  }, [summaries]);

  const handleExport = () => {
    const rows = summaries.map((summary) =>
      `"${summary.postingTitle}",${summary.companyName},${summary.total},${summary.shortlisted},${summary.rejected},${summary.pending},${summary.shortlistRate}%,${summary.rejectionRate}%`
    );
    const csv = `Opportunity,Company,Total,Shortlisted,Rejected,Pending,Shortlist %,Rejection %\n${rows.join('\n')}`;
    downloadCSV(csv, 'shortlist_rejection_summary');
  };

  const cards = [
    { label: 'Total Applicants', value: overallStats.total, icon: Users, color: 'text-primary' },
    { label: 'Shortlisted', value: overallStats.shortlisted, icon: UserCheck, color: 'text-green-600' },
    { label: 'Rejected', value: overallStats.rejected, icon: XCircle, color: 'text-destructive' },
    { label: 'Pending Decision', value: overallStats.pending, icon: Clock, color: 'text-yellow-600' },
  ];

  return (
    <div className="space-y-4 lg:space-y-6">
      <ReportToolbar title="Shortlist vs Rejection" totalRecords={overallStats.total} dateRange={dateRange} onDateRangeChange={() => {}} onExportCSV={handleExport} />

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <PostingTypeFilter
              value={postingTypeFilter}
              onValueChange={setPostingTypeFilter}
              triggerClassName="w-full"
            />
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger><SelectValue placeholder="Company" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Opportunity</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Shortlisted</TableHead>
                  <TableHead className="text-center">Rejected</TableHead>
                  <TableHead className="text-center">Pending</TableHead>
                  <TableHead className="min-w-[130px]">Shortlist %</TableHead>
                  <TableHead className="min-w-[130px]">Rejection %</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && summaries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Loading shortlist/rejection analytics...
                    </TableCell>
                  </TableRow>
                ) : summaries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No data matches the filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  summaries.map((summary) => {
                    const isExpanded = expandedId === summary.postingId;

                    return (
                      <>
                        <TableRow
                          key={summary.postingId}
                          className="cursor-pointer"
                          onClick={() => setExpandedId(isExpanded ? null : summary.postingId)}
                        >
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{summary.postingTitle}</p>
                              <p className="text-xs text-muted-foreground">{summary.companyName}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-center font-medium">{summary.total}</TableCell>
                          <TableCell className="text-center text-green-600 font-medium">{summary.shortlisted}</TableCell>
                          <TableCell className="text-center text-destructive font-medium">{summary.rejected}</TableCell>
                          <TableCell className="text-center text-yellow-600 font-medium">{summary.pending}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={summary.shortlistRate} className="h-2 flex-1" />
                              <span className="text-sm font-medium w-10 text-right">{summary.shortlistRate}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={summary.rejectionRate} className="h-2 flex-1 [&>div]:bg-destructive" />
                              <span className="text-sm font-medium w-10 text-right">{summary.rejectionRate}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow key={`${summary.postingId}-detail`}>
                            <TableCell colSpan={8} className="bg-muted/30 p-0">
                              <div className="p-4">
                                <p className="text-sm font-medium mb-3">Student-level Details</p>
                                <div className="rounded-md border bg-background overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Student</TableHead>
                                        <TableHead>Roll No.</TableHead>
                                        <TableHead>Department</TableHead>
                                        <TableHead>Current Stage</TableHead>
                                        <TableHead>Outcome</TableHead>
                                        <TableHead>Remarks</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {summary.students
                                        .sort((a, b) => {
                                          const order = { shortlisted: 0, pending: 1, rejected: 2 };
                                          return order[a.outcome] - order[b.outcome];
                                        })
                                        .map((student) => (
                                          <TableRow key={student.id}>
                                            <TableCell className="font-medium text-sm">{student.name}</TableCell>
                                            <TableCell className="text-sm">{student.rollNo}</TableCell>
                                            <TableCell className="text-sm">{student.department}</TableCell>
                                            <TableCell>
                                              <Badge className={`text-xs ${APPLICATION_STAGE_CONFIG[student.stage as keyof typeof APPLICATION_STAGE_CONFIG]?.color ?? ''}`}>
                                                {APPLICATION_STAGE_CONFIG[student.stage as keyof typeof APPLICATION_STAGE_CONFIG]?.label ?? student.stage}
                                              </Badge>
                                            </TableCell>
                                            <TableCell>
                                              {student.outcome === 'shortlisted' && <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">Shortlisted</Badge>}
                                              {student.outcome === 'rejected' && <Badge variant="destructive" className="text-xs">Rejected</Badge>}
                                              {student.outcome === 'pending' && <Badge variant="outline" className="text-xs">Pending</Badge>}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                                              {student.remarks || '—'}
                                            </TableCell>
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
            Showing {summaries.length} opportunities • Click a row to expand student details
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
