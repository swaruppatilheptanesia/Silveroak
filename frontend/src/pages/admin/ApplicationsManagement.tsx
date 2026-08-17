import { useDeferredValue, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Download,
  Eye,
  FileCheck,
  Search,
  TrendingUp,
  Users,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ApplicationsExportDialog } from '@/components/admin/ApplicationsExportDialog';
import AdminListScopeFilters, { type DateRangeValue } from '@/components/admin/AdminListScopeFilters';
import { EmptyState } from '@/components/shared/EmptyState';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SortableTableHead } from '@/components/shared/SortableTableHead';
import { useServerSort } from '@/hooks/use-server-sort';
import { useAllApplications, useApplications } from '@/hooks/use-application-api';
import { usePostings } from '@/hooks/use-posting-api';
import { usePostingTypeOptions } from '@/hooks/use-posting-type-options';
import { formatDate } from '@/lib/formatters';
import { formatPostingTypeLabel } from '@/lib/postingModule';
import { APPLICATION_STAGE_CONFIG } from '@/types/application';
import type { ApiApplicationListItem, ApplicationStage } from '@/types/application';

function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

function ApplicationsManagementSkeleton() {
  return (
    <DashboardLayout
      title="Applications Management"
      subtitle="Loading application pipeline data"
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <Card key={index}>
              <CardContent className="p-5">
                <Skeleton className="h-4 w-24 bg-muted" />
                <Skeleton className="mt-3 h-8 w-16 bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-10 w-full bg-muted" />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function StatCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}

function getApplicationSearchFields(application: ApiApplicationListItem) {
  return [
    application.student.full_name,
    application.student.enrollment_number,
    application.student.roll_number ?? '',
    application.student.email,
    application.student.department,
    application.student.batch,
    application.student.course ?? '',
    application.student.institute ?? '',
    application.student.current_semester ?? '',
    application.posting.title,
    application.posting.company.name,
    application.posting.type,
    application.current_stage,
    application.mock_round_result ?? '',
  ];
}

function filterApplicationsBySearch(applications: ApiApplicationListItem[], search: string) {
  if (!search) return applications;

  const query = search.toLowerCase();
  return applications.filter((application) =>
    getApplicationSearchFields(application).some((field) => field.toLowerCase().includes(query))
  );
}

export default function ApplicationsManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('all');
  const [postingFilter, setPostingFilter] = useState<string>('all');
  const [postingTypeFilter, setPostingTypeFilter] = useState<string>('all');
  const { options: postingTypeOptions, isLoading: postingTypesLoading, isEmpty: postingTypesEmpty } = usePostingTypeOptions();
  const [instituteFilter, setInstituteFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [academicYearFilter, setAcademicYearFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRangeValue>({ from: undefined, to: undefined });
  const [pipelinesCollapsed, setPipelinesCollapsed] = useState(true);
  const [exportOpen, setExportOpen] = useState(false);
  const [page, setPage] = useState(1);
  const { sort_by, sort_order, onSort } = useServerSort<
    'student' | 'posting' | 'stage' | 'applied_at'
  >('applied_at', 'desc', () => setPage(1));
  const deferredSearch = useDeferredValue(searchTerm);

  const scopeFilters = useMemo(() => ({
    institute: instituteFilter || undefined,
    course: courseFilter || undefined,
    branch: branchFilter || undefined,
    semester: semesterFilter === 'all' ? undefined : semesterFilter,
    academic_year: academicYearFilter === 'all' ? undefined : academicYearFilter,
    date_from: dateRange.from ? dateRange.from.toISOString() : undefined,
    date_to: dateRange.to ? dateRange.to.toISOString() : undefined,
  }), [academicYearFilter, branchFilter, courseFilter, dateRange.from, dateRange.to, instituteFilter, semesterFilter]);

  const applicationsQuery = useApplications({
    page,
    limit: 50,
    stage: stageFilter === 'all' ? undefined : stageFilter as ApplicationStage,
    posting_id: postingFilter === 'all' ? undefined : postingFilter,
    posting_type_master_id: postingTypeFilter === 'all' ? undefined : postingTypeFilter,
    ...scopeFilters,
    sort_by,
    sort_order,
  });
  const exportFilters = useMemo(() => ({
    stage: stageFilter === 'all' ? undefined : stageFilter as ApplicationStage,
    posting_id: postingFilter === 'all' ? undefined : postingFilter,
    posting_type_master_id: postingTypeFilter === 'all' ? undefined : postingTypeFilter,
    ...scopeFilters,
    sort_by: 'applied_at' as const,
    sort_order: 'desc' as const,
  }), [postingFilter, postingTypeFilter, scopeFilters, stageFilter]);
  const exportApplicationsQuery = useAllApplications(exportFilters, exportOpen);

  const postingsQuery = usePostings({
    limit: 100,
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  const totalQuery = useApplications({ page: 1, limit: 1 });
  const appliedQuery = useApplications({ page: 1, limit: 1, stage: 'applied' });
  const mockRoundQuery = useApplications({ page: 1, limit: 1, stage: 'mock_round' });
  const shortlistedQuery = useApplications({ page: 1, limit: 1, stage: 'shortlisted' });
  const interviewQuery = useApplications({ page: 1, limit: 1, stage: 'interview' });
  const offerQuery = useApplications({ page: 1, limit: 1, stage: 'offer_released' });
  const rejectedQuery = useApplications({ page: 1, limit: 1, stage: 'rejected' });

  const postings = postingsQuery.data?.data ?? [];
  const activePostings = postings.filter((posting) => posting.status === 'published' || posting.status === 'closed');
  const postingOptions = postingTypeFilter === 'all'
    ? activePostings
    : activePostings.filter((posting) => posting.posting_type_master_id === postingTypeFilter);
  const applications = applicationsQuery.data?.data ?? [];

  const filteredApplications = useMemo(() => {
    return filterApplicationsBySearch(applications, deferredSearch);
  }, [applications, deferredSearch]);

  const exportApplications = useMemo(() => {
    return filterApplicationsBySearch(exportApplicationsQuery.data ?? [], deferredSearch);
  }, [deferredSearch, exportApplicationsQuery.data]);

  if (applicationsQuery.isLoading || postingsQuery.isLoading) {
    return <ApplicationsManagementSkeleton />;
  }

  if (applicationsQuery.error) {
    return (
      <DashboardLayout
        title="Applications Management"
        subtitle="The application list could not be loaded"
      >
        <Alert variant="destructive">
          <Users className="h-4 w-4" />
          <AlertTitle>Unable to load applications</AlertTitle>
          <AlertDescription>
            {getErrorMessage(applicationsQuery.error, 'Please refresh and try again.')}
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Applications Management"
      subtitle="Review live application traffic and jump into posting-specific pipelines"
    >
      <div className="space-y-6">
        {postingsQuery.error && (
          <Alert>
            <Building2 className="h-4 w-4" />
            <AlertTitle>Posting quick links loaded partially</AlertTitle>
            <AlertDescription>
              {getErrorMessage(postingsQuery.error, 'The application table is still live, but recent posting shortcuts are unavailable right now.')}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-7">
          <StatCard
            title="Total applications"
            value={String(totalQuery.data?.pagination.total ?? 0)}
            hint="Across the full live application module"
          />
          <StatCard
            title="Applied"
            value={String(appliedQuery.data?.pagination.total ?? 0)}
            hint="Currently at applied stage"
          />
          <StatCard
            title="Mock round"
            value={String(mockRoundQuery.data?.pagination.total ?? 0)}
            hint="Currently in mock round"
          />
          <StatCard
            title="Shortlisted"
            value={String(shortlistedQuery.data?.pagination.total ?? 0)}
            hint="Candidates moved to shortlist"
          />
          <StatCard
            title="Interview"
            value={String(interviewQuery.data?.pagination.total ?? 0)}
            hint="Applications at interview stage"
          />
          <StatCard
            title="Offers"
            value={String(offerQuery.data?.pagination.total ?? 0)}
            hint="Offer released applications"
          />
          <StatCard
            title="Rejected"
            value={String(rejectedQuery.data?.pagination.total ?? 0)}
            hint="Rejected application records"
          />
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-lg">Recent Posting Pipelines</CardTitle>
                <CardDescription>Open a posting to review progress, move candidates, and monitor the pipeline.</CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setPipelinesCollapsed((current) => !current)}>
                {pipelinesCollapsed ? <ChevronDown className="mr-2 h-4 w-4" /> : <ChevronUp className="mr-2 h-4 w-4" />}
                {pipelinesCollapsed ? 'Expand' : 'Collapse'}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {pipelinesCollapsed ? (
              <p className="text-sm text-muted-foreground">
                Recent posting pipelines are hidden. Expand this card to review the latest pipeline shortcuts.
              </p>
            ) : activePostings.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No active or closed postings yet"
                description="Once postings exist, their application pipelines will appear here."
                compact
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {activePostings.slice(0, 6).map((posting) => (
                  <Link key={posting.id} to={`/admin/applications/${posting.id}`}>
                    <Card className="h-full cursor-pointer hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 className="h-4 w-4" />
                            <span>{posting.company.name}</span>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <h3 className="mt-3 font-medium text-foreground">{posting.role_name}</h3>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant="outline">{posting.type}</Badge>
                          <Badge variant={posting.status === 'published' ? 'success' : 'secondary'}>
                            {posting.status}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 p-6">
            <div className="flex flex-col gap-4 lg:flex-row">
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search student, enrollment, company, or posting..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <Select
              value={postingTypeFilter}
              onValueChange={(value) => {
                setPostingTypeFilter(value);
                setPostingFilter('all');
                setPage(1);
              }}
              disabled={postingTypesLoading}
            >
              <SelectTrigger className="w-full lg:w-52">
                <SelectValue placeholder="Posting Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Posting Types</SelectItem>
                {postingTypesEmpty ? (
                  <SelectItem value="__empty__" disabled>
                    No posting types defined
                  </SelectItem>
                ) : (
                  postingTypeOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Select value={postingFilter} onValueChange={(value) => { setPostingFilter(value); setPage(1); }}>
              <SelectTrigger className="w-full lg:w-64">
                <SelectValue placeholder="Filter by posting" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All postings</SelectItem>
                {postingOptions.map((posting) => (
                  <SelectItem key={posting.id} value={posting.id}>
                    {posting.company.name} - {posting.role_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={stageFilter} onValueChange={(value) => { setStageFilter(value); setPage(1); }}>
              <SelectTrigger className="w-full lg:w-52">
                <SelectValue placeholder="Filter by stage" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All stages</SelectItem>
                {Object.entries(APPLICATION_STAGE_CONFIG).map(([stage, config]) => (
                  <SelectItem key={stage} value={stage}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            </div>
            <AdminListScopeFilters
              institute={{ value: instituteFilter, onChange: (value) => { setInstituteFilter(value); setPage(1); } }}
              course={{ value: courseFilter, onChange: (value) => { setCourseFilter(value); setPage(1); } }}
              branch={{ value: branchFilter, onChange: (value) => { setBranchFilter(value); setPage(1); } }}
              semester={{ value: semesterFilter, onChange: (value) => { setSemesterFilter(value); setPage(1); } }}
              academicYear={{ value: academicYearFilter, onChange: (value) => { setAcademicYearFilter(value); setPage(1); } }}
              dateRange={{ value: dateRange, onChange: (range) => { setDateRange(range); setPage(1); } }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Latest Application Records</CardTitle>
                <CardDescription>
                  {applicationsQuery.data?.pagination.total ?? filteredApplications.length} records match the selected filters.
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => setExportOpen(true)}>
                <Download className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0 md:p-6">
            {filteredApplications.length === 0 ? (
              <EmptyState
                icon={FileCheck}
                title="No applications found"
                description="Try changing the stage or posting filters."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead label="Profile" columnKey="student" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <SortableTableHead label="Posting" columnKey="posting" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <SortableTableHead label="Stage" columnKey="stage" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <TableHead>Mock Result</TableHead>
                      <SortableTableHead label="Applied On" columnKey="applied_at" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApplications.map((application) => {
                      const stageConfig = APPLICATION_STAGE_CONFIG[application.current_stage];
                      return (
                        <TableRow key={application.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">{application.student.full_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {application.student.enrollment_number} • {application.student.department}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">{application.posting.title}</p>
                              <p className="text-sm text-muted-foreground">{application.posting.company.name}</p>
                              <Badge variant="secondary" className="mt-2 w-fit">
                                {formatPostingTypeLabel(application.posting.type)}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={stageConfig.color}>
                              {stageConfig.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {application.mock_round_result ? (
                              <Badge variant="secondary">{application.mock_round_result}</Badge>
                            ) : (
                              <span className="text-sm text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(application.applied_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button asChild variant="outline" size="sm">
                              <Link to={`/admin/applications/${application.posting.id}`}>
                                <Eye className="mr-2 h-4 w-4" />
                                Pipeline
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}

            {(applicationsQuery.data?.pagination.totalPages ?? 1) > 1 && (
              <div className="flex items-center justify-between border-t border-border px-6 py-4 text-sm">
                <span className="text-muted-foreground">
                  Page {applicationsQuery.data?.pagination.page} of {applicationsQuery.data?.pagination.totalPages}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= (applicationsQuery.data?.pagination.totalPages ?? 1)}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <ApplicationsExportDialog
          open={exportOpen}
          onOpenChange={setExportOpen}
          applications={exportApplications}
          isLoading={exportApplicationsQuery.isLoading || exportApplicationsQuery.isFetching}
        />
      </div>
    </DashboardLayout>
  );
}
