import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Users, UserCheck, Award, XCircle } from 'lucide-react';
import { APPLICATION_STAGE_CONFIG } from '@/types/application';
import { useApplicantListReport, usePostingHistoryReport } from '@/hooks/use-report-analytics-api';
import { ReportToolbar, downloadCSV, type DateRange } from './ReportToolbar';
import PostingTypeFilter from './PostingTypeFilter';
import { uniqueNonEmptyStrings } from './reportUtils';

type QueryParams = {
  posting_id?: string;
  posting_type?: string;
  department?: string;
  stage?: string;
  search?: string;
  from?: Date;
  to?: Date;
};

export default function ApplicantListReport() {
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPosting, setSelectedPosting] = useState('all');
  const [postingTypeFilter, setPostingTypeFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');

  const { data: postingHistoryData } = usePostingHistoryReport();

  const postings = useMemo(() => {
    const map = new Map<string, { id: string; title: string; company: string }>();
    (postingHistoryData?.postings ?? []).forEach((posting: any) => {
      if (postingTypeFilter !== 'all' && posting.type !== postingTypeFilter) {
        return;
      }
      if (!map.has(posting.posting_id)) {
        map.set(posting.posting_id, {
          id: posting.posting_id,
          title: posting.title,
          company: posting.company_name,
        });
      }
    });
    return Array.from(map.values());
  }, [postingHistoryData, postingTypeFilter]);

  useEffect(() => {
    if (postings.length === 0) {
      if (selectedPosting !== 'all') {
        setSelectedPosting('all');
      }
      return;
    }

    if (selectedPosting === 'all' || !postings.some((posting) => posting.id === selectedPosting)) {
      setSelectedPosting(postings[0].id);
    }
  }, [postings, selectedPosting]);

  const queryParams = useMemo<QueryParams>(() => ({
    posting_id: selectedPosting === 'all' ? undefined : selectedPosting,
    posting_type_master_id: postingTypeFilter === 'all' ? undefined : postingTypeFilter,
    department: deptFilter === 'all' ? undefined : deptFilter,
    stage: stageFilter === 'all' ? undefined : stageFilter,
    search: searchQuery || undefined,
    from: dateRange.from,
    to: dateRange.to,
  }), [dateRange.from, dateRange.to, deptFilter, postingTypeFilter, searchQuery, selectedPosting, stageFilter]);

  const { data, isLoading } = useApplicantListReport(queryParams, Boolean(selectedPosting && selectedPosting !== 'all'));

  const applications = useMemo(() => {
    return (data?.applications ?? []).map((application: any) => ({
      id: application.application_id,
      student_name: application.student_name,
      enrollment_number: application.enrollment_number,
      department: application.department,
      batch: application.batch,
      cgpa: application.cgpa,
      posting_title: application.posting_title,
      company_name: application.company_name,
      current_stage: application.current_stage,
      applied_at: application.applied_at,
      updated_at: application.updated_at,
      feedback_remarks: application.feedback_remarks,
      feedback_decision: application.feedback_decision,
      feedback_recruiter: application.feedback_recruiter,
    }));
  }, [data]);

  const departments = useMemo<string[]>(
    () => uniqueNonEmptyStrings(applications.map((application) => application.department)),
    [applications],
  );

  const stats = data?.stats ?? { total: 0, shortlisted: 0, offers: 0, rejected: 0 };

  const handleExport = () => {
    const rows = applications.map((application) =>
      `${application.student_name},${application.enrollment_number},${application.department},${application.cgpa ?? '-'},${application.posting_title},${application.company_name},${APPLICATION_STAGE_CONFIG[application.current_stage as keyof typeof APPLICATION_STAGE_CONFIG]?.label ?? application.current_stage},${new Date(application.applied_at).toLocaleDateString('en-IN')},${new Date(application.updated_at).toLocaleDateString('en-IN')}`
    );
    const csv = `Student,Roll No,Department,CGPA,Opportunity,Company,Stage,Applied,Last Updated\n${rows.join('\n')}`;
    downloadCSV(csv, 'applicant_list');
  };

  const cards = [
    { label: 'Total Applicants', value: stats.total, icon: Users, color: 'text-primary' },
    { label: 'Shortlisted', value: stats.shortlisted, icon: UserCheck, color: 'text-green-600' },
    { label: 'Offers', value: stats.offers, icon: Award, color: 'text-blue-600' },
    { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'text-destructive' },
  ];

  return (
    <div className="space-y-4 lg:space-y-6">
      <ReportToolbar title="Applicant List" totalRecords={stats.total} dateRange={dateRange} onDateRangeChange={setDateRange} onExportCSV={handleExport} />

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <PostingTypeFilter
            value={postingTypeFilter}
            onValueChange={setPostingTypeFilter}
            triggerClassName="h-9 text-xs"
          />
          <Select value={selectedPosting} onValueChange={setSelectedPosting}>
            <SelectTrigger><SelectValue placeholder="Opportunity" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Opportunities</SelectItem>
                {postings.map((posting) => (
                  <SelectItem key={posting.id} value={posting.id}>{posting.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((department) => (
                  <SelectItem key={department} value={department}>{department}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stageFilter} onValueChange={setStageFilter}>
              <SelectTrigger><SelectValue placeholder="Stage" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stages</SelectItem>
                {Object.entries(APPLICATION_STAGE_CONFIG).map(([key, value]) => (
                  <SelectItem key={key} value={key}>{value.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search name or roll no..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-9" />
            </div>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[140px]">Student</TableHead>
                  <TableHead>Roll No.</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-center">CGPA</TableHead>
                  <TableHead className="min-w-[180px]">Opportunity</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && applications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Loading applicants...
                    </TableCell>
                  </TableRow>
                ) : applications.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No applicants match the filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  applications.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell className="font-medium text-sm">{application.student_name}</TableCell>
                      <TableCell className="text-sm">{application.enrollment_number}</TableCell>
                      <TableCell className="text-sm">{application.department}</TableCell>
                      <TableCell className="text-center font-medium">{application.cgpa ?? '—'}</TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm font-medium">{application.posting_title}</p>
                          <p className="text-xs text-muted-foreground">{application.company_name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${APPLICATION_STAGE_CONFIG[application.current_stage as keyof typeof APPLICATION_STAGE_CONFIG]?.color ?? ''}`}>
                          {APPLICATION_STAGE_CONFIG[application.current_stage as keyof typeof APPLICATION_STAGE_CONFIG]?.label ?? application.current_stage}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {new Date(application.applied_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {new Date(application.updated_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground">
            Showing {applications.length} of {data?.stats?.total ?? applications.length} applications
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
