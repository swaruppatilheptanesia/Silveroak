import { useDeferredValue, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Archive,
  Briefcase,
  Building2,
  Calendar,
  Download,
  Eye,
  FileText,
  Loader2,
  Plus,
  Search,
  Send,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatApiErrorMessage } from '@/lib/apiError';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { RepublishPostingDialog } from '@/components/postings/RepublishPostingDialog';
import { ConfirmActionDialog } from '@/components/shared/ConfirmActionDialog';
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
import { useClosePosting, usePostings, usePublishPosting, useRepublishPosting } from '@/hooks/use-posting-api';
import { usePostingTypeOptions } from '@/hooks/use-posting-type-options';
import { postingService } from '@/services/postingService';
import { formatDate } from '@/lib/formatters';
import { formatPostingTypeLabel, isPostingApplicationOpen } from '@/lib/postingModule';
import { downloadCsvTable, downloadExcelTable } from '@/lib/spreadsheetExport';
import AdminListScopeFilters, { type DateRangeValue } from '@/components/admin/AdminListScopeFilters';
import { PostingTypeBadge } from '@/components/ui/status-badge';
import type {
  ApiPostingListItem,
  ApiPostingStatus,
  RepublishPostingInput,
} from '@/types/posting';

function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

function getStatusBadge(status: ApiPostingStatus) {
  if (status === 'draft') return <Badge variant="warning">Draft</Badge>;
  if (status === 'published') return <Badge variant="success">Published</Badge>;
  return <Badge variant="secondary">Closed</Badge>;
}

function PostingsManagementSkeleton() {
  return (
    <DashboardLayout
      title="Job and Internship Postings"
      subtitle="Loading posting management data"
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

export default function PostingsManagement() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ApiPostingStatus>('all');
  const [postingTypeMasterId, setPostingTypeMasterId] = useState<string>('all');
  const [instituteFilter, setInstituteFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [academicYearFilter, setAcademicYearFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRangeValue>({ from: undefined, to: undefined });
  const [isExporting, setIsExporting] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    | { type: 'publish'; posting: ApiPostingListItem }
    | { type: 'close'; posting: ApiPostingListItem }
    | null
  >(null);
  const [pendingRepublish, setPendingRepublish] = useState<ApiPostingListItem | null>(null);
  const deferredSearch = useDeferredValue(searchTerm);
  const postingTypeOptions = usePostingTypeOptions();

  const statsQuery = usePostings({
    limit: 100,
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  const listFilters = {
    search: deferredSearch || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
    posting_type_master_id: postingTypeMasterId === 'all' ? undefined : postingTypeMasterId,
    institute: instituteFilter || undefined,
    course: courseFilter || undefined,
    branch: branchFilter || undefined,
    academic_year: academicYearFilter === 'all' ? undefined : academicYearFilter,
    date_from: dateRange.from ? dateRange.from.toISOString() : undefined,
    date_to: dateRange.to ? dateRange.to.toISOString() : undefined,
  };

  const { sort_by, sort_order, onSort } = useServerSort<
    'title' | 'company' | 'posting_type' | 'status' | 'created_at'
  >('created_at', 'desc');
  const postingsQuery = usePostings({
    limit: 100,
    ...listFilters,
    sort_by,
    sort_order,
  });

  const publishPosting = usePublishPosting();
  const closePosting = useClosePosting();
  const republishPosting = useRepublishPosting();

  const allPostings = statsQuery.data?.data ?? [];
  const filteredPostings = postingsQuery.data?.data ?? [];

  const stats = useMemo(() => {
    return {
      total: allPostings.length,
      draft: allPostings.filter((posting) => posting.status === 'draft').length,
      published: allPostings.filter((posting) => posting.status === 'published').length,
      closed: allPostings.filter((posting) => posting.status === 'closed').length,
      jobs: allPostings.filter((posting) => posting.type === 'job').length,
      internships: allPostings.filter((posting) => posting.type !== 'job').length,
    };
  }, [allPostings]);

  if (statsQuery.isLoading || postingsQuery.isLoading) {
    return <PostingsManagementSkeleton />;
  }

  if (statsQuery.error || postingsQuery.error) {
    return (
      <DashboardLayout
        title="Job and Internship Postings"
        subtitle="Posting management could not be loaded"
      >
        <Alert variant="destructive">
          <Briefcase className="h-4 w-4" />
          <AlertTitle>Unable to load postings</AlertTitle>
          <AlertDescription>
            {getErrorMessage(postingsQuery.error || statsQuery.error, 'Please refresh and try again.')}
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  const POSTING_EXPORT_HEADERS = [
    'Company', 'Posting Title', 'Role', 'Posting Type', 'Academic Year', 'Bond',
    'Min CGPA', 'Max Backlogs', 'Application Start', 'Application End',
    'Package / Stipend', 'Status', 'Created On',
  ];

  function postingExportRow(posting: ApiPostingListItem) {
    return [
      posting.company.name,
      posting.title,
      posting.role_name,
      posting.type ? formatPostingTypeLabel(posting.type) : '',
      posting.academic_year ?? '',
      posting.bond_details ?? '',
      posting.min_cgpa,
      posting.max_backlogs,
      posting.application_start_date ? formatDate(posting.application_start_date) : '',
      posting.application_end_date ? formatDate(posting.application_end_date) : '',
      posting.ctc || posting.stipend || '',
      posting.status,
      formatDate(posting.created_at),
    ];
  }

  async function handleExport(exportFormat: 'csv' | 'excel') {
    setIsExporting(true);
    try {
      // Fetch the full matching set (the on-screen list is capped at 100) with the same filters.
      const result = await postingService.getPostings({ ...listFilters, limit: 1000, page: 1, sort_by: 'created_at', sort_order: 'desc' });
      const rows = (result.data ?? []).map(postingExportRow);
      if (rows.length === 0) {
        toast.info('No postings match the current filters.');
        return;
      }
      if (exportFormat === 'excel') {
        await downloadExcelTable(POSTING_EXPORT_HEADERS, rows, 'postings_export');
      } else {
        downloadCsvTable(POSTING_EXPORT_HEADERS, rows, 'postings_export');
      }
      toast.success(`Exported ${rows.length} posting(s).`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to export postings.'));
    } finally {
      setIsExporting(false);
    }
  }

  async function handlePublish(posting: ApiPostingListItem) {
    setPendingAction({ type: 'publish', posting });
  }

  async function handleClose(posting: ApiPostingListItem) {
    setPendingAction({ type: 'close', posting });
  }

  async function handleRepublishConfirm(data: RepublishPostingInput) {
    if (!pendingRepublish) return;
    try {
      await republishPosting.mutateAsync({ postingId: pendingRepublish.id, data });
      toast.success('Posting re-published successfully.');
      setPendingRepublish(null);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to re-publish the posting.'));
    }
  }

  async function handleConfirmAction() {
    if (!pendingAction) return;

    try {
      if (pendingAction.type === 'publish') {
        await publishPosting.mutateAsync({
          postingId: pendingAction.posting.id,
          data: {
            ...(pendingAction.posting.application_start_date
              ? { application_start_date: pendingAction.posting.application_start_date.slice(0, 10) }
              : {}),
            ...(pendingAction.posting.application_end_date
              ? { application_end_date: pendingAction.posting.application_end_date.slice(0, 10) }
              : {}),
          },
        });
        toast.success('Posting published successfully.');
      } else {
        await closePosting.mutateAsync(pendingAction.posting.id);
        toast.success('Posting closed successfully.');
      }
      setPendingAction(null);
    } catch (error) {
      toast.error(
        getErrorMessage(
          error,
          pendingAction.type === 'publish'
            ? 'Unable to publish the posting.'
            : 'Unable to close the posting.'
        )
      );
    }
  }

  return (
    <DashboardLayout
      title="Job and Internship Postings"
      subtitle="Create, publish, edit, and close placement opportunities"
    >
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Posting Operations</h2>
            <p className="text-sm text-muted-foreground">Track the current status of your placement and internship postings.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={isExporting} onClick={() => handleExport('csv')}>
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Export CSV
            </Button>
            <Button variant="outline" disabled={isExporting} onClick={() => handleExport('excel')}>
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Export Excel
            </Button>
            <Button onClick={() => navigate('/admin/postings/create')}>
              <Plus className="mr-2 h-4 w-4" />
              Create Posting
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Total</p>
              <p className="mt-2 text-2xl font-semibold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Drafts</p>
              <p className="mt-2 text-2xl font-semibold">{stats.draft}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Published</p>
              <p className="mt-2 text-2xl font-semibold">{stats.published}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Closed</p>
              <p className="mt-2 text-2xl font-semibold">{stats.closed}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">Placements</p>
              <p className="mt-2 text-2xl font-semibold">{stats.jobs}</p>
            </CardContent>
          </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">Internships</p>
            <p className="mt-2 text-2xl font-semibold">{stats.internships}</p>
          </CardContent>
        </Card>
        </div>

        <Card>
          <CardContent className="space-y-3 p-6">
            <div className="flex flex-col gap-4 lg:flex-row">
              <div className="relative min-w-[240px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search title, role, or company..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>

              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as 'all' | ApiPostingStatus)}>
                <SelectTrigger className="w-full lg:w-44">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={postingTypeMasterId} onValueChange={setPostingTypeMasterId}>
                <SelectTrigger className="w-full lg:w-56">
                  <SelectValue placeholder="Posting Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All posting types</SelectItem>
                  {postingTypeOptions.options.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <AdminListScopeFilters
              institute={{ value: instituteFilter, onChange: setInstituteFilter }}
              course={{ value: courseFilter, onChange: setCourseFilter }}
              branch={{ value: branchFilter, onChange: setBranchFilter }}
              academicYear={{ value: academicYearFilter, onChange: setAcademicYearFilter }}
              dateRange={{ value: dateRange, onChange: setDateRange }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>All Postings</CardTitle>
            <CardDescription>
              {postingsQuery.data?.pagination.total ?? filteredPostings.length} live records matched your filters.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 md:p-6">
            {filteredPostings.length === 0 ? (
              <EmptyState
                icon={Briefcase}
                title="No postings found"
                description="Adjust the filters or create a new posting to get started."
                actionLabel="Create Posting"
                onAction={() => navigate('/admin/postings/create')}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead label="Posting" columnKey="title" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <SortableTableHead label="Company" columnKey="company" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <SortableTableHead label="Posting Type" columnKey="posting_type" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <TableHead>Application Window</TableHead>
                      <SortableTableHead label="Status" columnKey="status" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <SortableTableHead label="Created" columnKey="created_at" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPostings.map((posting) => (
                      <TableRow key={posting.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{posting.title}</p>
                            <p className="text-sm text-muted-foreground">{posting.role_name} • {posting.location}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span>{posting.company.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {/* posting.type is the linked posting-type master's value (any admin-created
                              string), so it must go through the shared formatter — never a fixed list. */}
                          {posting.type ? (
                            <PostingTypeBadge status={posting.type} showIcon={false} />
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <p className="text-foreground">
                              {posting.application_start_date && posting.application_end_date
                                ? `${formatDate(posting.application_start_date)} - ${formatDate(posting.application_end_date)}`
                                : 'Open while published'}
                            </p>
                            {posting.status === 'published' && (
                              <p className="text-xs text-muted-foreground">
                                {isPostingApplicationOpen(posting) ? 'Currently open' : 'Window closed'}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(posting.status)}</TableCell>
                        <TableCell>{formatDate(posting.created_at)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => navigate(`/admin/postings/${posting.id}`)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View
                            </Button>
                            {posting.status !== 'closed' && (
                              <Button size="sm" variant="outline" onClick={() => navigate(`/admin/postings/${posting.id}/edit`)}>
                                <FileText className="mr-2 h-4 w-4" />
                                Edit
                              </Button>
                            )}
                            {posting.status === 'draft' && (
                              <Button
                                size="sm"
                                onClick={() => handlePublish(posting)}
                                disabled={publishPosting.isPending}
                              >
                                <Send className="mr-2 h-4 w-4" />
                                Publish
                              </Button>
                            )}
                            {posting.status === 'published' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleClose(posting)}
                                disabled={closePosting.isPending}
                              >
                                <Archive className="mr-2 h-4 w-4" />
                                Close
                              </Button>
                            )}
                            {posting.status === 'closed' && (
                              <Button
                                size="sm"
                                onClick={() => setPendingRepublish(posting)}
                                disabled={republishPosting.isPending}
                              >
                                <Send className="mr-2 h-4 w-4" />
                                Re-publish
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <ConfirmActionDialog
          open={Boolean(pendingAction)}
          onOpenChange={(open) => {
            if (!open) setPendingAction(null);
          }}
          title={
            pendingAction?.type === 'publish'
              ? `Publish "${pendingAction.posting.title}"?`
              : `Close "${pendingAction?.posting.title ?? 'posting'}"?`
          }
          description={
            pendingAction?.type === 'publish'
              ? 'This will make the posting visible to students.'
              : 'This will stop new applications and archive the posting.'
          }
          confirmLabel={pendingAction?.type === 'publish' ? 'Publish Posting' : 'Close Posting'}
          confirmVariant={pendingAction?.type === 'close' ? 'destructive' : 'default'}
          isPending={publishPosting.isPending || closePosting.isPending}
          onConfirm={handleConfirmAction}
        />

        <RepublishPostingDialog
          posting={pendingRepublish}
          onOpenChange={(open) => {
            if (!open) setPendingRepublish(null);
          }}
          onConfirm={handleRepublishConfirm}
          isPending={republishPosting.isPending}
        />
      </div>
    </DashboardLayout>
  );
}
