import { useDeferredValue, useEffect, useState } from 'react';
import {
  CheckCircle,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  Loader2,
  Search,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { NOCReviewDialog } from '@/components/noc/NOCReviewDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { ListPager } from '@/components/shared/ListPager';
import AdminListScopeFilters, { type DateRangeValue } from '@/components/admin/AdminListScopeFilters';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { SortableTableHead, type SortOrder } from '@/components/shared/SortableTableHead';
import { useServerSort } from '@/hooks/use-server-sort';
import { useNocs, useFacultyNocSummary } from '@/hooks/use-noc-api';
import { nocService } from '@/services/nocService';
import { getNocBranch, getNocProgramLabel, getNocStudentName } from '@/lib/nocModule';
import { toDateParam } from '@/lib/formatters';
import { resolveBackendAssetUrl } from '@/lib/studentModule';
import { downloadCsvTable, downloadExcelTable } from '@/lib/spreadsheetExport';
import { NOC_STATUS_CONFIG, NOC_TYPE_LABELS, type ApiNocListItem, type NOCStatus } from '@/types/noc';

const REVIEWED_STATUSES: NOCStatus[] = [
  'pending_tpo',
  'pending_company_verification',
  'approved',
  'issued',
  'rejected',
];
const EXPORT_PAGE_SIZE = 100;

function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

function StatCard({ title, value, hint }: { title: string; value: number; hint: string }) {
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

function NocTable({
  requests,
  emptyTitle,
  emptyDescription,
  onReview,
  sortBy,
  sortOrder,
  onSort,
}: {
  requests: ApiNocListItem[];
  emptyTitle: string;
  emptyDescription: string;
  onReview: (nocId: string) => void;
  sortBy?: string;
  sortOrder?: SortOrder;
  onSort: (columnKey: string) => void;
}) {
  if (requests.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <SortableTableHead label="Student" columnKey="student" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
            <SortableTableHead label="Request" columnKey="noc_type" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
            <SortableTableHead label="Company" columnKey="company" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
            <SortableTableHead label="Duration" columnKey="start_date" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
            <TableHead>NOC Number</TableHead>
            <SortableTableHead label="Status" columnKey="status" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
            <TableHead className="whitespace-nowrap">NOC Status</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell>
                <div>
                  <p className="font-medium text-foreground">{getNocStudentName(request)}</p>
                  <p className="text-xs text-muted-foreground">{request.student.enrollment_number}</p>
                  <p className="text-xs text-muted-foreground">{getNocBranch(request)}</p>
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1">
                  <Badge variant="secondary">{NOC_TYPE_LABELS[request.noc_type]}</Badge>
                  <p className="text-xs text-muted-foreground">{getNocProgramLabel(request.program)}</p>
                </div>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium text-foreground">{request.company_name}</p>
                  <p className="text-xs text-muted-foreground">{request.role_title}</p>
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(new Date(request.start_date), 'dd MMM')} - {format(new Date(request.end_date), 'dd MMM yyyy')}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {request.status === 'issued' && request.noc_number ? request.noc_number : '—'}
              </TableCell>
              <TableCell>
                <Badge className={NOC_STATUS_CONFIG[request.status].color}>
                  {NOC_STATUS_CONFIG[request.status].label}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex flex-col items-start gap-1">
                  <Badge variant={request.is_active === false ? 'outline' : 'default'} className="whitespace-nowrap">
                    {request.is_active === false ? 'Inactive' : 'Active'}
                  </Badge>
                  {request.is_reissue ? (
                    <Badge variant="secondary" className="whitespace-nowrap text-xs">Re-Issued</Badge>
                  ) : null}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" onClick={() => onReview(request.id)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Review
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export default function FacultyNOCApprovals() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNocId, setSelectedNocId] = useState<string | null>(null);
  const [postingTypeFilter, setPostingTypeFilter] = useState('all');
  const [academicYearFilter, setAcademicYearFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRangeValue>({ from: undefined, to: undefined });

  const deferredSearch = useDeferredValue(searchTerm);
  const search = deferredSearch.trim() || undefined;
  const [pendingPage, setPendingPage] = useState(1);
  const [reviewedPage, setReviewedPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);

  const { sort_by, sort_order, onSort } = useServerSort<
    'student' | 'noc_type' | 'company' | 'start_date' | 'status' | 'created_at'
  >('created_at', 'desc', () => { setPendingPage(1); setReviewedPage(1); });

  // NOC.program stores the posting-type VALUE — bind option.value below.
  const postingType = postingTypeFilter === 'all' ? undefined : postingTypeFilter;
  const academicYear = academicYearFilter === 'all' ? undefined : academicYearFilter;
  const dateFrom = toDateParam(dateRange.from);
  const dateTo = toDateParam(dateRange.to);

  useEffect(() => {
    setPendingPage(1);
    setReviewedPage(1);
  }, [deferredSearch, postingType, academicYear, dateFrom, dateTo]);

  // Stat cards come from a dedicated department-wide aggregate (the rejected-by-dept/tpo split needs
  // faculty_approved_at, which a page of rows can't provide).
  const summaryQuery = useFacultyNocSummary();
  const summary = summaryQuery.data ?? {
    pending_faculty: 0,
    approved_forwarded: 0,
    approved_by_tpo: 0,
    rejected_by_dept: 0,
    rejected_by_tpo: 0,
    total: 0,
  };

  const commonParams = {
    posting_type: postingType,
    academic_year: academicYear,
    date_from: dateFrom,
    date_to: dateTo,
    search,
    sort_by,
    sort_order,
  } as const;

  const pendingQuery = useNocs({ ...commonParams, page: pendingPage, limit: 20, statuses: ['pending_faculty'] });
  const reviewedQuery = useNocs({ ...commonParams, page: reviewedPage, limit: 20, statuses: REVIEWED_STATUSES });

  const pendingRequests = pendingQuery.data?.data ?? [];
  const reviewedRequests = reviewedQuery.data?.data ?? [];
  const pendingTotal = pendingQuery.data?.pagination.total ?? 0;
  const reviewedTotal = reviewedQuery.data?.pagination.total ?? 0;
  const requestsQuery = { error: pendingQuery.error ?? reviewedQuery.error };

  async function handleExport(exportFormat: 'csv' | 'excel') {
    setIsExporting(true);
    try {
      // Export every matching request across all statuses (current filters + search applied), paging
      // the list endpoint — nocService pagination is normalized, so read pagination.hasNext.
      const all: ApiNocListItem[] = [];
      let page = 1;
      for (;;) {
        const res = await nocService.getNocs({ ...commonParams, page, limit: EXPORT_PAGE_SIZE });
        all.push(...res.data);
        if (page >= (res.pagination.totalPages ?? 1) || res.data.length === 0) break;
        page += 1;
      }
      if (all.length === 0) {
        toast.info('No NOC requests match the current filters.');
        return;
      }
      const headers = [
        'Student Name', 'Enrollment No', 'Institute', 'Course', 'Branch', 'Semester', 'Posting Type', 'Company',
        'Technology / Domain', 'Stipend', 'Status', 'NOC Status', 'Re-Issued', 'Reason for Company Change',
        'Offer Letter Link', 'Termination Letter Link', 'NOC Certificate Number',
        'NOC Certificate Link', 'Completion Certificate Link',
      ];
      const rows = all.map((request) => [
        getNocStudentName(request),
        request.student.enrollment_number,
        request.student.institute ?? '',
        request.student.course ?? '',
        getNocBranch(request),
        request.student.current_semester ?? '',
        getNocProgramLabel(request.program),
        request.company_name,
        request.technology_domain ?? '',
        request.stipend_amount != null ? String(request.stipend_amount) : '',
        NOC_STATUS_CONFIG[request.status].label,
        request.is_active === false ? 'Inactive' : 'Active',
        request.is_reissue ? 'Yes' : 'No',
        request.reason_for_company_change ?? '',
        request.offer_letter_url ? resolveBackendAssetUrl(request.offer_letter_url) : '',
        request.termination_letter_url ? resolveBackendAssetUrl(request.termination_letter_url) : '',
        request.status === 'issued' ? (request.noc_number ?? '') : '',
        request.certificate_url ? resolveBackendAssetUrl(request.certificate_url) : '',
        '', // Completion Certificate Link — no such field on NOC records (read-only gap)
      ]);
      if (exportFormat === 'excel') {
        await downloadExcelTable(headers, rows, 'faculty_noc_requests');
      } else {
        downloadCsvTable(headers, rows, 'faculty_noc_requests');
      }
      toast.success(`Exported ${rows.length} NOC request(s).`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Unable to export NOC requests.'));
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <DashboardLayout
      title="NOC Approvals"
      subtitle="Review the live NOC requests for students in your department"
    >
      <div className="space-y-6">
        {requestsQuery.error && (
          <Alert variant="destructive">
            <FileText className="h-4 w-4" />
            <AlertTitle>Unable to load faculty NOC requests</AlertTitle>
            <AlertDescription>
              {getErrorMessage(requestsQuery.error, 'Please refresh and try again.')}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <StatCard title="Pending Approval" value={summary.pending_faculty} hint="Awaiting your action" />
          <StatCard title="Approved / Forwarded" value={summary.approved_forwarded} hint="Already moved ahead" />
          <StatCard title="Approved by TPO" value={summary.approved_by_tpo} hint="Cleared by the TPO cell" />
          <StatCard title="Rejected by Department" value={summary.rejected_by_dept} hint="Rejected at faculty review" />
          <StatCard title="Rejected by TPO" value={summary.rejected_by_tpo} hint="Rejected at TPO review" />
          <StatCard title="Total Department Requests" value={summary.total} hint="Department-scoped live records" />
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-lg">Filters</CardTitle>
                <CardDescription>
                  Filter your department-scoped NOC queue; search narrows the loaded rows.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" disabled={isExporting} onClick={() => void handleExport('csv')}>
                  {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                  Export CSV
                </Button>
                <Button variant="outline" disabled={isExporting} onClick={() => void handleExport('excel')}>
                  {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
                  Export Excel
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative min-w-[240px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search by student, company, role, or NOC number..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
            </div>
            <AdminListScopeFilters
              academicYear={{ value: academicYearFilter, onChange: setAcademicYearFilter }}
              postingType={{ value: postingTypeFilter, onChange: setPostingTypeFilter, bind: 'value' }}
              dateRange={{ value: dateRange, onChange: setDateRange }}
            />
          </CardContent>
        </Card>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pendingTotal})</TabsTrigger>
            <TabsTrigger value="history">History ({reviewedTotal})</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                  Pending Faculty Approvals
                </CardTitle>
                <CardDescription>
                  Requests in `pending_faculty` are ready for your review.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingQuery.isLoading ? (
                  <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading live department requests...
                  </div>
                ) : (
                  <>
                    <NocTable
                      requests={pendingRequests}
                      emptyTitle="No pending NOC requests"
                      emptyDescription="Your department does not have any requests waiting for faculty approval."
                      onReview={setSelectedNocId}
                      sortBy={sort_by}
                      sortOrder={sort_order}
                      onSort={onSort}
                    />
                    <ListPager
                      page={pendingQuery.data?.pagination.page ?? 1}
                      totalPages={pendingQuery.data?.pagination.totalPages ?? 1}
                      onPageChange={setPendingPage}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  Reviewed Requests
                </CardTitle>
                <CardDescription>
                  Department requests already moved forward, issued, or rejected.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reviewedQuery.isLoading ? (
                  <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading review history...
                  </div>
                ) : (
                  <>
                    <NocTable
                      requests={reviewedRequests}
                      emptyTitle="No reviewed requests"
                      emptyDescription="Approved, issued, and rejected requests will appear here."
                      onReview={setSelectedNocId}
                      sortBy={sort_by}
                      sortOrder={sort_order}
                      onSort={onSort}
                    />
                    <ListPager
                      page={reviewedQuery.data?.pagination.page ?? 1}
                      totalPages={reviewedQuery.data?.pagination.totalPages ?? 1}
                      onPageChange={setReviewedPage}
                    />
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <NOCReviewDialog
        nocId={selectedNocId}
        open={Boolean(selectedNocId)}
        onOpenChange={(open) => !open && setSelectedNocId(null)}
        mode="faculty"
      />
    </DashboardLayout>
  );
}
