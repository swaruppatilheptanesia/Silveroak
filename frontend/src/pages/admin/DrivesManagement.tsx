import { useDeferredValue, useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle,
  ClipboardCheck,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Loader2,
  MapPin,
  Plus,
  Search,
  Send,
  UserPlus,
} from 'lucide-react';
import { format } from 'date-fns';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ConfirmActionDialog } from '@/components/shared/ConfirmActionDialog';
import { EventAssignmentDialog } from '@/components/drives/EventAssignmentDialog';
import { EventAttendanceDialog } from '@/components/drives/EventAttendanceDialog';
import { EventDetailDialog } from '@/components/drives/EventDetailDialog';
import { EventEditorDialog } from '@/components/drives/EventEditorDialog';
import { EventPanelDialog } from '@/components/drives/EventPanelDialog';
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
import { useEvents, useUpdateEventStatus } from '@/hooks/use-event-api';
import { usePostingTypeOptions } from '@/hooks/use-posting-type-options';
import { driveService } from '@/services/driveService';
import { EVENT_STATUS_CONFIG, getAllowedEventStatusActions, getEventListSearchFields } from '@/lib/eventModule';
import { getEventTypeLabel, type ApiEventListItem, type ApiEventStatus, type ApiEventType } from '@/types/event';
import { formatDate } from '@/lib/formatters';
import { downloadCsvTable, downloadExcelTable } from '@/lib/spreadsheetExport';
import AdminListScopeFilters, { type DateRangeValue } from '@/components/admin/AdminListScopeFilters';
import { useEventTypeOptions } from '@/hooks/use-event-type-options';
import { toast } from 'sonner';
import { formatApiErrorMessage } from '@/lib/apiError';

function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

function DrivesManagementSkeleton() {
  return (
    <DashboardLayout title="Events & Drives" subtitle="Loading live campus events">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
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

function StatCard({ title, value, hint }: { title: string; value: string; hint: string }) {
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

function getStatusActionLabel(status: ApiEventStatus) {
  switch (status) {
    case 'published':
      return 'Publish';
    case 'ongoing':
      return 'Start';
    case 'completed':
      return 'Complete';
    case 'cancelled':
      return 'Event Cancel';
    default:
      return status;
  }
}

export default function AdminDrivesManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | ApiEventType>('all');
  const [postingTypeFilter, setPostingTypeFilter] = useState<string>('all');
  const { options: postingTypeOptions, isLoading: postingTypesLoading, isEmpty: postingTypesEmpty } = usePostingTypeOptions();
  const [statusFilter, setStatusFilter] = useState<'all' | ApiEventStatus>('all');
  const [instituteFilter, setInstituteFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeValue>({ from: undefined, to: undefined });
  const [isExporting, setIsExporting] = useState(false);
  const [page, setPage] = useState(1);
  const { sort_by, sort_order, onSort } = useServerSort<
    'title' | 'date' | 'status' | 'panels' | 'students'
  >('date', 'desc', () => setPage(1));
  const [detailEventId, setDetailEventId] = useState<string | null>(null);
  const [editorEventId, setEditorEventId] = useState<string | null>(null);
  const [assignmentEventId, setAssignmentEventId] = useState<string | null>(null);
  const [attendanceEventId, setAttendanceEventId] = useState<string | null>(null);
  const [panelEventId, setPanelEventId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    | { eventId: string; title: string; status: ApiEventStatus }
    | null
  >(null);
  const deferredSearch = useDeferredValue(searchTerm);
  const { options: eventTypeOptions } = useEventTypeOptions();

  const listFilters = {
    type: typeFilter === 'all' ? undefined : typeFilter,
    posting_type_master_id: postingTypeFilter === 'all' ? undefined : postingTypeFilter,
    status: statusFilter === 'all' ? undefined : statusFilter,
    institute: instituteFilter || undefined,
    course: courseFilter || undefined,
    branch: branchFilter || undefined,
    date_from: dateRange.from ? dateRange.from.toISOString() : undefined,
    date_to: dateRange.to ? dateRange.to.toISOString() : undefined,
  };

  const eventsQuery = useEvents({
    page,
    limit: 20,
    ...listFilters,
    sort_by,
    sort_order,
  });

  const totalEventsQuery = useEvents({ page: 1, limit: 1 });
  const draftEventsQuery = useEvents({ page: 1, limit: 1, status: 'draft' });
  const publishedEventsQuery = useEvents({ page: 1, limit: 1, status: 'published' });
  const ongoingEventsQuery = useEvents({ page: 1, limit: 1, status: 'ongoing' });
  const completedEventsQuery = useEvents({ page: 1, limit: 1, status: 'completed' });
  const cancelledEventsQuery = useEvents({ page: 1, limit: 1, status: 'cancelled' });

  const updateStatus = useUpdateEventStatus();
  const events = eventsQuery.data?.data ?? [];
  const filteredEvents = useMemo(() => {
    if (!deferredSearch) return events;
    const query = deferredSearch.toLowerCase();
    return events.filter((event) =>
      getEventListSearchFields(event).some((field) => field.toLowerCase().includes(query))
    );
  }, [deferredSearch, events]);

  if (eventsQuery.isLoading) {
    return <DrivesManagementSkeleton />;
  }

  if (eventsQuery.error) {
    return (
      <DashboardLayout title="Events & Drives" subtitle="The event list could not be loaded">
        <Alert variant="destructive">
          <Calendar className="h-4 w-4" />
          <AlertTitle>Unable to load events</AlertTitle>
          <AlertDescription>
            {getErrorMessage(eventsQuery.error, 'Please refresh and try again.')}
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  async function handleStatusUpdate(eventId: string, status: ApiEventStatus) {
    const event = events.find((item) => item.id === eventId);
    if (!event) return;

    setPendingAction({ eventId, title: event.title, status });
  }

  async function handleConfirmStatusUpdate() {
    if (!pendingAction) return;

    try {
      await updateStatus.mutateAsync({ eventId: pendingAction.eventId, data: { status: pendingAction.status } });
      toast.success(`Event marked as ${getStatusActionLabel(pendingAction.status).toLowerCase()}.`);
      setPendingAction(null);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to update the event status.'));
    }
  }

  function eventExportRow(event: ApiEventListItem) {
    return [
      event.title,
      event.company?.name ?? '',
      formatDate(event.date),
      event.start_time || '',
      event.end_time || '',
      event.venue || '',
      getEventTypeLabel(event.type),
      EVENT_STATUS_CONFIG[event.status]?.label ?? event.status,
      (event.faculty_coordinators ?? []).join('; '),
      event._count?.panels ?? 0,
      event._count?.assigned_students ?? 0,
      event.eligible_student_count ?? 0,
      (event.postings ?? []).map((posting) => posting.title).join('; '),
    ];
  }

  async function handleExport(exportFormat: 'csv' | 'excel') {
    setIsExporting(true);
    try {
      const result = await driveService.getEvents({ ...listFilters, limit: 1000, page: 1, sort_by: 'date', sort_order: 'desc' });
      const rows = (result.data ?? []).map(eventExportRow);
      if (rows.length === 0) {
        toast.info('No events match the current filters.');
        return;
      }
      const headers = [
        'Event Name', 'Company', 'Date', 'Start Time', 'End Time', 'Venue', 'Type', 'Status',
        'Faculty Coordinators', 'Panels', 'Registered', 'Eligible Students', 'Linked Roles',
      ];
      if (exportFormat === 'excel') {
        await downloadExcelTable(headers, rows, 'events_export');
      } else {
        downloadCsvTable(headers, rows, 'events_export');
      }
      toast.success(`Exported ${rows.length} event(s).`);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to export events.'));
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <DashboardLayout title="Events & Drives" subtitle="Manage live campus drives, panels, assignments, and attendance">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <StatCard
            title="Total events"
            value={String(totalEventsQuery.data?.pagination.total ?? 0)}
            hint="Across the live events module"
          />
          <StatCard
            title="Draft"
            value={String(draftEventsQuery.data?.pagination.total ?? 0)}
            hint="Still being prepared"
          />
          <StatCard
            title="Published"
            value={String(publishedEventsQuery.data?.pagination.total ?? 0)}
            hint="Visible to participants"
          />
          <StatCard
            title="Ongoing"
            value={String(ongoingEventsQuery.data?.pagination.total ?? 0)}
            hint="Currently in progress"
          />
          <StatCard
            title="Completed"
            value={String(completedEventsQuery.data?.pagination.total ?? 0)}
            hint="Lifecycle finished"
          />
          <StatCard
            title="Cancelled"
            value={String(cancelledEventsQuery.data?.pagination.total ?? 0)}
            hint="Called off"
          />
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-lg">Filters</CardTitle>
                <CardDescription>Backend filters apply first. Search narrows the current page.</CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={isExporting} onClick={() => handleExport('csv')}>
                  {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Export CSV
                </Button>
                <Button variant="outline" disabled={isExporting} onClick={() => handleExport('excel')}>
                  {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                  Export Excel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-4 lg:flex-row">
            <div className="relative min-w-[240px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search title, company, venue, type, or status..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>

            <Select
              value={typeFilter}
              onValueChange={(value) => {
                setTypeFilter(value as 'all' | ApiEventType);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full lg:w-56">
                <SelectValue placeholder="Event type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {eventTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as 'all' | ApiEventStatus);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {(['draft', 'published', 'ongoing', 'completed', 'cancelled'] as ApiEventStatus[]).map((status) => (
                  <SelectItem key={status} value={status}>
                    {EVENT_STATUS_CONFIG[status].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={postingTypeFilter}
              onValueChange={(value) => {
                setPostingTypeFilter(value);
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

            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Event
            </Button>
            </div>
            <AdminListScopeFilters
              institute={{ value: instituteFilter, onChange: (value) => { setInstituteFilter(value); setPage(1); } }}
              course={{ value: courseFilter, onChange: (value) => { setCourseFilter(value); setPage(1); } }}
              branch={{ value: branchFilter, onChange: (value) => { setBranchFilter(value); setPage(1); } }}
              dateRange={{ value: dateRange, onChange: (range) => { setDateRange(range); setPage(1); } }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Event Records</CardTitle>
            <CardDescription>
              {filteredEvents.length} event(s) visible on this page. Assignment uses the linked posting applications when available.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 md:p-6">
            {filteredEvents.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No events found"
                description={
                  events.length === 0
                    ? 'No events match the current filters.'
                    : 'No events on this page match the local search term.'
                }
                actionLabel={events.length === 0 ? 'Create Event' : undefined}
                onAction={events.length === 0 ? () => setCreateOpen(true) : undefined}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[1100px]">
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead label="Event" columnKey="title" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} className="min-w-[240px]" />
                      <SortableTableHead label="Schedule" columnKey="date" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} className="min-w-[240px]" />
                      <SortableTableHead label="Status" columnKey="status" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} className="min-w-[220px]" />
                      <SortableTableHead label="Panels" columnKey="panels" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <SortableTableHead label="Students" columnKey="students" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <TableHead>Eligible Students</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEvents.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{event.title}</p>
                            <p className="text-xs text-muted-foreground">{event.company.name}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <p className="flex items-center gap-1 text-foreground">
                              <Calendar className="h-3.5 w-3.5" />
                              {format(new Date(event.date), 'dd MMM yyyy')}
                            </p>
                            <p className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="h-3.5 w-3.5" />
                              {event.venue}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <Badge variant="outline" className={EVENT_STATUS_CONFIG[event.status].color}>
                              {EVENT_STATUS_CONFIG[event.status].label}
                            </Badge>
                            <p className="text-xs text-muted-foreground">{getEventTypeLabel(event.type)}</p>
                            {(() => {
                              const roles = event.postings?.length
                                ? event.postings
                                : event.posting
                                  ? [event.posting]
                                  : [];
                              if (roles.length === 0) return null;
                              return (
                                <div className="flex flex-wrap gap-1">
                                  {roles.map((role) => (
                                    <Badge key={role.id} variant="secondary" className="w-fit">
                                      {role.title}
                                    </Badge>
                                  ))}
                                </div>
                              );
                            })()}
                          </div>
                        </TableCell>
                        <TableCell>{event._count.panels}</TableCell>
                        <TableCell>{event._count.assigned_students}</TableCell>
                        <TableCell>{event.eligible_student_count ?? 0}</TableCell>
                        <TableCell className="text-right">
                          <div className="grid grid-cols-3 gap-2 w-max ml-auto">
                            <Button variant="ghost" size="sm" onClick={() => setDetailEventId(event.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Button>
                            {event.status !== 'completed' && event.status !== 'cancelled' && (
                              <Button variant="outline" size="sm" onClick={() => setEditorEventId(event.id)}>
                                Edit
                              </Button>
                            )}
                            <Button variant="outline" size="sm" onClick={() => setPanelEventId(event.id)}>
                              Panel
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setAssignmentEventId(event.id)}>
                              <UserPlus className="mr-2 h-4 w-4" />
                              Assign
                            </Button>
                            {event._count.assigned_students > 0 && (
                              <Button variant="outline" size="sm" onClick={() => setAttendanceEventId(event.id)}>
                                <ClipboardCheck className="mr-2 h-4 w-4" />
                                Attendance
                              </Button>
                            )}
                            {getAllowedEventStatusActions(event.status).map((nextStatus) => (
                              <Button
                                key={nextStatus}
                                size="sm"
                                variant={nextStatus === 'cancelled' ? 'destructive' : 'outline'}
                                onClick={() => handleStatusUpdate(event.id, nextStatus)}
                                disabled={updateStatus.isPending}
                              >
                                {nextStatus === 'published' && <Send className="mr-2 h-4 w-4" />}
                                {nextStatus === 'completed' && <CheckCircle className="mr-2 h-4 w-4" />}
                                {getStatusActionLabel(nextStatus)}
                              </Button>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {(eventsQuery.data?.pagination.totalPages ?? 1) > 1 && (
              <div className="flex items-center justify-between border-t border-border px-6 py-4 text-sm">
                <span className="text-muted-foreground">
                  Page {eventsQuery.data?.pagination.page} of {eventsQuery.data?.pagination.totalPages}
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
                    disabled={page >= (eventsQuery.data?.pagination.totalPages ?? 1)}
                    onClick={() => setPage((current) => current + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {detailEventId && (
        <EventDetailDialog eventId={detailEventId} open={Boolean(detailEventId)} onOpenChange={(open) => !open && setDetailEventId(null)} />
      )}
      {createOpen && (
        <EventEditorDialog open={createOpen} onOpenChange={setCreateOpen} />
      )}
      {editorEventId && (
        <EventEditorDialog eventId={editorEventId} open={Boolean(editorEventId)} onOpenChange={(open) => !open && setEditorEventId(null)} />
      )}
      {assignmentEventId && (
        <EventAssignmentDialog
          eventId={assignmentEventId}
          open={Boolean(assignmentEventId)}
          onOpenChange={(open) => !open && setAssignmentEventId(null)}
        />
      )}
      {attendanceEventId && (
        <EventAttendanceDialog
          eventId={attendanceEventId}
          open={Boolean(attendanceEventId)}
          onOpenChange={(open) => !open && setAttendanceEventId(null)}
        />
      )}
      {panelEventId && (
        <EventPanelDialog
          eventId={panelEventId}
          open={Boolean(panelEventId)}
          onOpenChange={(open) => !open && setPanelEventId(null)}
        />
      )}

      <ConfirmActionDialog
        open={Boolean(pendingAction)}
        onOpenChange={(open) => {
          if (!open) setPendingAction(null);
        }}
        title={`Update "${pendingAction?.title ?? 'event'}" status?`}
        description={
          pendingAction?.status
            ? `This will mark the event as ${getStatusActionLabel(pendingAction.status).toLowerCase()}.`
            : 'This will update the event status.'
        }
        confirmLabel={pendingAction?.status ? getStatusActionLabel(pendingAction.status) : 'Confirm'}
        confirmVariant={pendingAction?.status === 'cancelled' ? 'destructive' : 'default'}
        isPending={updateStatus.isPending}
        onConfirm={handleConfirmStatusUpdate}
      />
    </DashboardLayout>
  );
}
