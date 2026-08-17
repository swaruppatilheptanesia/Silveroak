import { useDeferredValue, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Loader2,
  Search,
  ShieldAlert,
  Users,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatApiErrorMessage } from '@/lib/apiError';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AdminStudentDetailsDialog } from '@/components/admin/AdminStudentDetailsDialog';
import AdminListScopeFilters, { type DateRangeValue } from '@/components/admin/AdminListScopeFilters';
import { EmptyState } from '@/components/shared/EmptyState';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Textarea } from '@/components/ui/textarea';
import {
  useApplicationDetail,
  useApplications,
  useBulkMoveStage,
  useMoveStage,
  useSetMockRoundResult,
} from '@/hooks/use-application-api';
import { usePostingDetail } from '@/hooks/use-posting-api';
import { useEventDetail, useEvents } from '@/hooks/use-event-api';
import { SearchableSelect } from '@/components/shared/SearchableSelect';
import { formatDate, formatDateTime } from '@/lib/formatters';
import { isPostingApplicationOpen } from '@/lib/postingModule';
import { resolveBackendAssetUrl } from '@/lib/studentModule';
import { applicationService } from '@/services/applicationService';
import { APPLICATION_STAGE_CONFIG, PIPELINE_STAGES, type ApplicationStage } from '@/types/application';

const PIPELINE_TABS: Array<'all' | ApplicationStage> = [
  'all',
  ...PIPELINE_STAGES,
  'rejected',
];

function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

function ApplicationPipelineSkeleton() {
  return (
    <DashboardLayout
      title="Application Pipeline"
      subtitle="Loading posting pipeline"
    >
      <div className="space-y-6">
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-7 w-56 bg-muted" />
            <Skeleton className="mt-3 h-4 w-80 bg-muted" />
          </CardContent>
        </Card>
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
      </div>
    </DashboardLayout>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="mt-2 text-2xl font-semibold text-foreground">{value}</p>
      </CardContent>
    </Card>
  );
}

// Attendance badge for the selected event. null/undefined (no record for that event) → muted dash.
function renderAttendance(status: string | null | undefined) {
  if (status === 'present') {
    return <Badge variant="success">Present</Badge>;
  }
  if (status === 'absent') {
    return <Badge variant="destructive">Absent</Badge>;
  }
  if (status === 'late') {
    return <Badge variant="warning">Late</Badge>;
  }
  return <span className="text-muted-foreground">—</span>;
}

export default function ApplicationPipeline() {
  const { postingId } = useParams();
  const [searchTerm, setSearchTerm] = useState('');
  const [instituteFilter, setInstituteFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeValue>({ from: undefined, to: undefined });
  // Event whose attendance is shown as a column against the applicants (empty = none selected).
  const [attendanceEventId, setAttendanceEventId] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | ApplicationStage>('all');
  const [page, setPage] = useState(1);
  const { sort_by, sort_order, onSort } = useServerSort<
    'student' | 'stage' | 'applied_at'
  >('applied_at', 'desc', () => { setPage(1); resetSelection(); });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailApplicationId, setDetailApplicationId] = useState<string | null>(null);
  const [studentDetailsId, setStudentDetailsId] = useState<string | null>(null);
  const [moveDialog, setMoveDialog] = useState<{ id: string; name: string; stage: ApplicationStage } | null>(null);
  const [mockDialog, setMockDialog] = useState<{ id: string; name: string } | null>(null);
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const [bulkRejectOpen, setBulkRejectOpen] = useState(false);
  const [bulkMockOpen, setBulkMockOpen] = useState(false);
  const [moveStageValue, setMoveStageValue] = useState<ApplicationStage>('applied');
  const [moveRemarks, setMoveRemarks] = useState('');
  const [bulkStageValue, setBulkStageValue] = useState<ApplicationStage>('mock_round');
  const [bulkRemarks, setBulkRemarks] = useState('');
  const [mockResultValue, setMockResultValue] = useState<'passed' | 'failed'>('passed');
  const [bulkMockResultValue, setBulkMockResultValue] = useState<'passed' | 'failed'>('passed');
  const deferredSearch = useDeferredValue(searchTerm);

  const postingQuery = usePostingDetail(postingId ?? '');
  const applicationsQuery = useApplications({
    posting_id: postingId,
    stage: activeTab === 'all' ? undefined : activeTab,
    institute: instituteFilter || undefined,
    course: courseFilter || undefined,
    branch: branchFilter || undefined,
    date_from: dateRange.from ? dateRange.from.toISOString() : undefined,
    date_to: dateRange.to ? dateRange.to.toISOString() : undefined,
    page,
    limit: 100,
    sort_by,
    sort_order,
  });
  const applicationDetailQuery = useApplicationDetail(detailApplicationId ?? '');
  // Events for the attendance dropdown + the selected event's assignments (with attendance).
  const eventsQuery = useEvents({ page: 1, limit: 100, sort_by: 'date', sort_order: 'desc' });
  const eventDetailQuery = useEventDetail(attendanceEventId);
  const attendanceMap = useMemo(() => {
    const map = new Map<string, string | null>();
    (eventDetailQuery.data?.assigned_students ?? []).forEach((assignment) => {
      map.set(assignment.student_id, assignment.attendance);
    });
    return map;
  }, [eventDetailQuery.data]);
  const eventOptions = useMemo(
    () =>
      (eventsQuery.data?.data ?? []).map((event) => ({
        value: event.id,
        label: `${event.title} — ${formatDate(event.date)}`,
      })),
    [eventsQuery.data]
  );
  const moveStage = useMoveStage();
  const bulkMoveStage = useBulkMoveStage();
  const setMockResult = useSetMockRoundResult();

  const countQueries = useQueries({
    queries: PIPELINE_TABS.map((tab) => ({
      queryKey: ['applications', 'pipeline-count', postingId, tab],
      queryFn: () =>
        applicationService.getApplications({
          posting_id: postingId,
          stage: tab === 'all' ? undefined : tab,
          page: 1,
          limit: 1,
        }),
      enabled: Boolean(postingId),
      staleTime: 60 * 1000,
    })),
  });
  const postingData = postingQuery.data;
  const applicationsData = applicationsQuery.data;
  const postingPreview = postingData ?? null;
  const applicationsPreview = applicationsData?.data ?? [];
  const stageCounts = PIPELINE_TABS.reduce<Record<string, number>>((counts, tab, index) => {
    counts[tab] = countQueries[index]?.data?.pagination.total ?? 0;
    return counts;
  }, {});
  const stageTotal = stageCounts[activeTab] ?? stageCounts.all ?? applicationsData?.pagination.total ?? 0;
  const isClosedPosting = postingPreview?.status === 'closed';
  const applicationOpen = postingPreview ? isPostingApplicationOpen(postingPreview) : false;

  const filteredApplications = useMemo(() => {
    return applicationsPreview.filter((application) => {
      if (deferredSearch) {
        const query = deferredSearch.toLowerCase();
        const fields = [
          application.student.full_name,
          application.student.enrollment_number,
          application.student.department,
        ];
        if (!fields.some((field) => field.toLowerCase().includes(query))) {
          return false;
        }
      }

      return true;
    });
  }, [applicationsPreview, deferredSearch]);

  const selectedCount = selectedIds.size;

  if (postingQuery.isLoading || applicationsQuery.isLoading) {
    return <ApplicationPipelineSkeleton />;
  }

  if (postingQuery.error || !postingData) {
    return (
      <DashboardLayout
        title="Application Pipeline"
        subtitle="The requested posting could not be loaded"
      >
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Unable to load posting</AlertTitle>
          <AlertDescription>
            {getErrorMessage(postingQuery.error, 'Please refresh and try again.')}
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  if (applicationsQuery.error) {
    return (
      <DashboardLayout
        title="Application Pipeline"
        subtitle="The posting loaded, but its applications could not be loaded"
      >
        <Alert variant="destructive">
          <Users className="h-4 w-4" />
          <AlertTitle>Unable to load pipeline applications</AlertTitle>
          <AlertDescription>
            {getErrorMessage(applicationsQuery.error, 'Please refresh and try again.')}
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  const posting = postingData;
  const applications = applicationsPreview;

  function resetSelection() {
    setSelectedIds(new Set());
  }

  function handleTabChange(tab: string) {
    setActiveTab(tab as 'all' | ApplicationStage);
    setPage(1);
    resetSelection();
  }

  function toggleSelect(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredApplications.length) {
      resetSelection();
      return;
    }
    setSelectedIds(new Set(filteredApplications.map((application) => application.id)));
  }

  async function handleMoveStage() {
    if (!moveDialog) return;

    try {
      await moveStage.mutateAsync({
        applicationId: moveDialog.id,
        data: {
          stage: moveStageValue,
          remarks: moveRemarks.trim() ? moveRemarks.trim() : null,
        },
      });
      toast.success(`Moved ${moveDialog.name} to ${APPLICATION_STAGE_CONFIG[moveStageValue].label}.`);
      setMoveDialog(null);
      setMoveRemarks('');
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to move the application.'));
    }
  }

  async function handleBulkMove() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    try {
      const result = await bulkMoveStage.mutateAsync({
        application_ids: ids,
        stage: bulkStageValue,
        remarks: bulkRemarks.trim() ? bulkRemarks.trim() : null,
      });

      const moved = result.results.filter((entry) => entry.status === 'moved').length;
      const failed = result.results.length - moved;
      if (moved > 0) {
        toast.success(`${moved} application(s) moved to ${APPLICATION_STAGE_CONFIG[bulkStageValue].label}.`);
      }
      if (failed > 0) {
        toast.error(`${failed} application(s) could not be updated.`);
      }

      setBulkMoveOpen(false);
      setBulkRemarks('');
      resetSelection();
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to update the selected applications.'));
    }
  }

  async function handleBulkReject() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    try {
      const result = await bulkMoveStage.mutateAsync({
        application_ids: ids,
        stage: 'rejected',
        remarks: bulkRemarks.trim() ? bulkRemarks.trim() : null,
      });

      const moved = result.results.filter((entry) => entry.status === 'moved').length;
      const failed = result.results.length - moved;
      if (moved > 0) {
        toast.success(`${moved} application(s) rejected.`);
      }
      if (failed > 0) {
        toast.error(`${failed} application(s) could not be rejected.`);
      }

      setBulkRejectOpen(false);
      setBulkRemarks('');
      resetSelection();
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to reject the selected applications.'));
    }
  }

  async function handleSingleMockResult() {
    if (!mockDialog) return;

    try {
      await setMockResult.mutateAsync({
        applicationId: mockDialog.id,
        data: { result: mockResultValue },
      });
      toast.success(`Mock result recorded for ${mockDialog.name}.`);
      setMockDialog(null);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to update the mock result.'));
    }
  }

  async function handleBulkMockResult() {
    const mockRoundIds = filteredApplications
      .filter((application) => selectedIds.has(application.id) && application.current_stage === 'mock_round')
      .map((application) => application.id);

    if (mockRoundIds.length === 0) {
      toast.error('Select at least one application that is currently in mock round.');
      return;
    }

    const results = await Promise.allSettled(
      mockRoundIds.map((applicationId) =>
        setMockResult.mutateAsync({
          applicationId,
          data: { result: bulkMockResultValue },
        })
      )
    );

    const succeeded = results.filter((result) => result.status === 'fulfilled').length;
    const failed = results.length - succeeded;

    if (succeeded > 0) {
      toast.success(`Mock result updated for ${succeeded} application(s).`);
    }
    if (failed > 0) {
      toast.error(`${failed} application(s) could not be updated.`);
    }

    setBulkMockOpen(false);
    resetSelection();
  }

  return (
    <DashboardLayout
      title="Application Pipeline"
      subtitle="Manage the live application funnel for a single posting"
    >
      <div className="space-y-6">
        {countQueries.some((query) => query.error) && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Some summary counts could not be refreshed</AlertTitle>
            <AlertDescription>
              Stage counts may be partially stale, but the table and actions are still live.
            </AlertDescription>
          </Alert>
        )}

        {isClosedPosting && (
          <Alert>
            <XCircle className="h-4 w-4" />
            <AlertTitle>Posting closed</AlertTitle>
            <AlertDescription>
              This posting is read-only for pipeline actions because the posting itself is closed.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <Link to="/admin/applications">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">{posting.title}</h1>
                <Badge variant={posting.status === 'published' ? 'success' : posting.status === 'draft' ? 'warning' : 'secondary'}>
                  {posting.status}
                </Badge>
              </div>
              <p className="mt-2 text-muted-foreground">
                {posting.company.name} • {posting.role_name} • {posting.academic_year}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {applicationOpen ? 'Applications are open.' : 'Application window is closed.'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <StatCard title="Total" value={String(stageCounts.all ?? 0)} />
          <StatCard title="Applied" value={String(stageCounts.applied ?? 0)} />
          <StatCard title="Mock Round" value={String(stageCounts.mock_round ?? 0)} />
          <StatCard title="Shortlisted" value={String(stageCounts.shortlisted ?? 0)} />
          <StatCard title="Interview" value={String(stageCounts.interview ?? 0)} />
          <StatCard title="Rejected" value={String(stageCounts.rejected ?? 0)} />
        </div>

        <Card>
          <CardContent className="space-y-3 p-6">
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by student name, enrollment, or branch..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <AdminListScopeFilters
              institute={{ value: instituteFilter, onChange: (value) => { setInstituteFilter(value); setPage(1); resetSelection(); } }}
              course={{ value: courseFilter, onChange: (value) => { setCourseFilter(value); setPage(1); resetSelection(); } }}
              branch={{ value: branchFilter, onChange: (value) => { setBranchFilter(value); setPage(1); resetSelection(); } }}
              dateRange={{ value: dateRange, onChange: (range) => { setDateRange(range); setPage(1); resetSelection(); } }}
            />
            <div className="max-w-md space-y-1.5">
              <label className="text-sm font-medium">Attendance for Event</label>
              <SearchableSelect
                value={attendanceEventId}
                onValueChange={setAttendanceEventId}
                options={eventOptions}
                placeholder="Select an event to show attendance"
                searchPlaceholder="Search events..."
                emptyMessage="No events found."
                isLoading={eventsQuery.isLoading}
                clearable
              />
            </div>
          </CardContent>
        </Card>

        {selectedCount > 0 && !isClosedPosting && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Users className="h-4 w-4 text-primary" />
                {selectedCount} selected
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setBulkMoveOpen(true)}>
                  <ChevronRight className="mr-2 h-4 w-4" />
                  Move Stage
                </Button>
                {activeTab === 'mock_round' && (
                  <Button size="sm" variant="outline" onClick={() => setBulkMockOpen(true)}>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Set Mock Result
                  </Button>
                )}
                <Button size="sm" variant="outline" className="text-destructive" onClick={() => setBulkRejectOpen(true)}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button size="sm" variant="ghost" onClick={resetSelection}>
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="overflow-x-auto">
          <div className="inline-flex min-w-full gap-2">
            {PIPELINE_TABS.map((tab) => {
              const label = tab === 'all' ? 'All' : APPLICATION_STAGE_CONFIG[tab].label;
              return (
                <Button
                  key={tab}
                  variant={activeTab === tab ? 'default' : 'outline'}
                  size="sm"
                  className="rounded-full whitespace-nowrap"
                  onClick={() => handleTabChange(tab)}
                >
                  {label}
                  <Badge variant="secondary" className="ml-2 rounded-full px-1.5 py-0 text-xs">
                    {stageCounts[tab] ?? 0}
                  </Badge>
                </Button>
              );
            })}
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Application Records</CardTitle>
            <CardDescription>
              {filteredApplications.length} shown on this page. {stageTotal} application(s) match the selected stage.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 md:p-6">
            {filteredApplications.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No applications found"
                description={stageTotal === 0 ? 'No applications are currently in this stage for the posting.' : 'No applications on this page match the local search filters.'}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={filteredApplications.length > 0 && selectedIds.size === filteredApplications.length}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <SortableTableHead label="Profile" columnKey="student" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      {activeTab === 'all' && <SortableTableHead label="Stage" columnKey="stage" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />}
                      <TableHead>Mock Result</TableHead>
                      <SortableTableHead label="Applied On" columnKey="applied_at" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <TableHead>Attendance</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredApplications.map((application) => {
                      const stageConfig = APPLICATION_STAGE_CONFIG[application.current_stage];
                      return (
                        <TableRow key={application.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(application.id)}
                              onCheckedChange={() => toggleSelect(application.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">{application.student.full_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {application.student.enrollment_number} • {application.student.department}
                              </p>
                            </div>
                          </TableCell>
                          {activeTab === 'all' && (
                            <TableCell>
                              <Badge variant="outline" className={stageConfig.color}>
                                {stageConfig.label}
                              </Badge>
                            </TableCell>
                          )}
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
                          <TableCell>
                            {renderAttendance(attendanceEventId ? attendanceMap.get(application.student.id) : null)}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setDetailApplicationId(application.id)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!application.resume_url}
                                title={
                                  application.resume_url
                                    ? 'Open the resume submitted for this posting'
                                    : 'No resume submitted'
                                }
                                onClick={() =>
                                  application.resume_url &&
                                  window.open(
                                    resolveBackendAssetUrl(application.resume_url),
                                    '_blank',
                                    'noopener,noreferrer',
                                  )
                                }
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                View Resume
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setStudentDetailsId(application.student.id)}
                              >
                                Profile
                              </Button>
                              {!isClosedPosting && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setMoveDialog({
                                      id: application.id,
                                      name: application.student.full_name,
                                      stage: application.current_stage,
                                    });
                                    setMoveStageValue(application.current_stage);
                                    setMoveRemarks('');
                                  }}
                                >
                                  Move
                                </Button>
                              )}
                              {!isClosedPosting && application.current_stage === 'mock_round' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setMockDialog({
                                      id: application.id,
                                      name: application.student.full_name,
                                    });
                                    setMockResultValue(application.mock_round_result === 'failed' ? 'failed' : 'passed');
                                  }}
                                >
                                  Mock
                                </Button>
                              )}
                            </div>
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
                    onClick={() => {
                      setPage((current) => Math.max(1, current - 1));
                      resetSelection();
                    }}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={page >= (applicationsQuery.data?.pagination.totalPages ?? 1)}
                    onClick={() => {
                      setPage((current) => current + 1);
                      resetSelection();
                    }}
                  >
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={Boolean(detailApplicationId)} onOpenChange={(open) => { if (!open) setDetailApplicationId(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Application Detail</DialogTitle>
            <DialogDescription>View the application summary and stage history for this student.</DialogDescription>
          </DialogHeader>
          {applicationDetailQuery.isLoading ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading application detail...
            </div>
          ) : applicationDetailQuery.error || !applicationDetailQuery.data ? (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Unable to load application detail</AlertTitle>
              <AlertDescription>
                {getErrorMessage(applicationDetailQuery.error, 'Please close this dialog and try again.')}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Student</p>
                  <p className="font-medium text-foreground">{applicationDetailQuery.data.student.full_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {applicationDetailQuery.data.student.enrollment_number} • {applicationDetailQuery.data.student.department}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Stage</p>
                  <Badge variant="outline" className={APPLICATION_STAGE_CONFIG[applicationDetailQuery.data.current_stage].color}>
                    {APPLICATION_STAGE_CONFIG[applicationDetailQuery.data.current_stage].label}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Posting</p>
                  <p className="font-medium text-foreground">{applicationDetailQuery.data.posting.title}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Applied At</p>
                  <p className="font-medium text-foreground">{formatDateTime(applicationDetailQuery.data.applied_at)}</p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-foreground">Stage History</p>
                {applicationDetailQuery.data.stage_history.length === 0 ? (
                  <p className="mt-2 text-sm text-muted-foreground">No stage changes recorded yet.</p>
                ) : (
                  <div className="mt-3 space-y-3">
                    {applicationDetailQuery.data.stage_history.map((entry) => (
                      <div key={entry.id} className="rounded-lg border border-border p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="secondary">
                            {entry.from_stage ? APPLICATION_STAGE_CONFIG[entry.from_stage].label : 'Initial'}
                          </Badge>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          <Badge variant="outline" className={APPLICATION_STAGE_CONFIG[entry.to_stage].color}>
                            {APPLICATION_STAGE_CONFIG[entry.to_stage].label}
                          </Badge>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Changed at {formatDateTime(entry.changed_at)}
                        </p>
                        {entry.remarks && (
                          <p className="mt-2 text-sm text-foreground">{entry.remarks}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AdminStudentDetailsDialog
        studentId={studentDetailsId}
        open={Boolean(studentDetailsId)}
        onOpenChange={(open) => {
          if (!open) setStudentDetailsId(null);
        }}
      />

      <Dialog open={Boolean(moveDialog)} onOpenChange={(open) => { if (!open) setMoveDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move Application Stage</DialogTitle>
            <DialogDescription>
              Update the stage for {moveDialog?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Stage</Label>
              <Select value={moveStageValue} onValueChange={(value) => setMoveStageValue(value as ApplicationStage)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(APPLICATION_STAGE_CONFIG).map(([stage, config]) => (
                    <SelectItem key={stage} value={stage}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Remarks (Optional)</Label>
              <Textarea
                placeholder="Add audit remarks for this stage movement..."
                value={moveRemarks}
                onChange={(event) => setMoveRemarks(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleMoveStage} disabled={moveStage.isPending}>
              {moveStage.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(mockDialog)} onOpenChange={(open) => { if (!open) setMockDialog(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Mock Result</DialogTitle>
            <DialogDescription>
              Record the mock interview result for {mockDialog?.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Mock Result</Label>
              <Select value={mockResultValue} onValueChange={(value) => setMockResultValue(value as 'passed' | 'failed')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="passed">Passed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="text-sm text-muted-foreground">
              Recording a mock result does not change the application stage automatically.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMockDialog(null)}>
              Cancel
            </Button>
            <Button onClick={handleSingleMockResult} disabled={setMockResult.isPending}>
              {setMockResult.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Result
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkMoveOpen} onOpenChange={setBulkMoveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Move Stage</DialogTitle>
            <DialogDescription>
              Move {selectedCount} selected application(s) to a new stage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>New Stage</Label>
              <Select value={bulkStageValue} onValueChange={(value) => setBulkStageValue(value as ApplicationStage)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(APPLICATION_STAGE_CONFIG).map(([stage, config]) => (
                    <SelectItem key={stage} value={stage}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Remarks (Optional)</Label>
              <Textarea
                placeholder="Add audit remarks for this bulk update..."
                value={bulkRemarks}
                onChange={(event) => setBulkRemarks(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkMoveOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkMove} disabled={bulkMoveStage.isPending}>
              {bulkMoveStage.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Move Stage
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkRejectOpen} onOpenChange={setBulkRejectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Reject Selected Applications
            </DialogTitle>
            <DialogDescription>
              This will move {selectedCount} selected application(s) to the rejected stage.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Remarks (Optional)</Label>
              <Textarea
                placeholder="Add a rejection remark for the bulk update..."
                value={bulkRemarks}
                onChange={(event) => setBulkRemarks(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkRejectOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkReject} disabled={bulkMoveStage.isPending}>
              {bulkMoveStage.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkMockOpen} onOpenChange={setBulkMockOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Mock Result</DialogTitle>
            <DialogDescription>
              Record the same mock round result for the selected mock-round applications.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Mock Result</Label>
              <Select value={bulkMockResultValue} onValueChange={(value) => setBulkMockResultValue(value as 'passed' | 'failed')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="passed">Passed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkMockOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkMockResult} disabled={setMockResult.isPending}>
              {setMockResult.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Results
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
