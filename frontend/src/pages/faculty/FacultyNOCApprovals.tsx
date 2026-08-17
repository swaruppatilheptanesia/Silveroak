import { useMemo, useState } from 'react';
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
import { useNocs } from '@/hooks/use-noc-api';
import { usePostingTypeOptions } from '@/hooks/use-posting-type-options';
import { getNocDepartment, getNocProgramLabel, getNocSearchFields, getNocStudentName } from '@/lib/nocModule';
import { resolveBackendAssetUrl } from '@/lib/studentModule';
import { downloadCsvTable, downloadExcelTable } from '@/lib/spreadsheetExport';
import { NOC_STATUS_CONFIG, NOC_TYPE_LABELS, type ApiNocListItem } from '@/types/noc';

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
                  <p className="text-xs text-muted-foreground">{getNocDepartment(request)}</p>
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
  const { options: postingTypeOptions, isLoading: postingTypesLoading } = usePostingTypeOptions();

  const { sort_by, sort_order, onSort } = useServerSort<
    'student' | 'noc_type' | 'company' | 'start_date' | 'status' | 'created_at'
  >('created_at', 'desc');

  // Counters come from the full department-scoped set so they stay stable regardless of table filters.
  const countsQuery = useNocs({ page: 1, limit: 100, sort_by: 'created_at', sort_order: 'desc' });
  const requestsQuery = useNocs({
    page: 1,
    limit: 100,
    // NOC.program stores the posting-type VALUE — bind option.value below.
    posting_type: postingTypeFilter === 'all' ? undefined : postingTypeFilter,
    academic_year: academicYearFilter === 'all' ? undefined : academicYearFilter,
    date_from: dateRange.from ? dateRange.from.toISOString() : undefined,
    date_to: dateRange.to ? dateRange.to.toISOString() : undefined,
    sort_by,
    sort_order,
  });

  const counts = countsQuery.data?.data ?? [];
  // ApiNocRecord carries no faculty/tpo decision flag — derive the stage from status + faculty_approved_at:
  // a rejected NOC that faculty already approved was rejected at TPO; otherwise it was rejected at faculty.
  const rejectedByDept = counts.filter((item) => item.status === 'rejected' && !item.faculty_approved_at).length;
  const rejectedByTpo = counts.filter((item) => item.status === 'rejected' && Boolean(item.faculty_approved_at)).length;
  const approvedByTpo = counts.filter((item) => item.status === 'approved' || item.status === 'issued').length;

  const requests = requestsQuery.data?.data ?? [];
  const filteredRequests = useMemo(() => {
    if (!searchTerm) return requests;
    const query = searchTerm.toLowerCase();
    return requests.filter((request) =>
      getNocSearchFields(request).some((field) => field.toLowerCase().includes(query))
    );
  }, [requests, searchTerm]);

  function handleExport(exportFormat: 'csv' | 'excel') {
    if (filteredRequests.length === 0) {
      toast.info('No NOC requests match the current filters.');
      return;
    }
    const headers = [
      'Student Name', 'Enrollment No', 'Institute', 'Course', 'Branch', 'Semester', 'Posting Type', 'Company',
      'Technology / Domain', 'Stipend', 'Status', 'Offer Letter Link', 'NOC Certificate Number',
      'NOC Certificate Link', 'Completion Certificate Link',
    ];
    const rows = filteredRequests.map((request) => [
      getNocStudentName(request),
      request.student.enrollment_number,
      request.student.institute ?? '',
      request.student.course ?? '',
      getNocDepartment(request),
      request.student.current_semester ?? '',
      getNocProgramLabel(request.program),
      request.company_name,
      request.technology_domain ?? '',
      request.stipend_amount != null ? String(request.stipend_amount) : '',
      NOC_STATUS_CONFIG[request.status].label,
      request.offer_letter_url ? resolveBackendAssetUrl(request.offer_letter_url) : '',
      request.status === 'issued' ? (request.noc_number ?? '') : '',
      request.certificate_url ? resolveBackendAssetUrl(request.certificate_url) : '',
      '', // Completion Certificate Link — no such field on NOC records (read-only gap)
    ]);
    if (exportFormat === 'excel') {
      void downloadExcelTable(headers, rows, 'faculty_noc_requests');
    } else {
      downloadCsvTable(headers, rows, 'faculty_noc_requests');
    }
    toast.success(`Exported ${rows.length} NOC request(s).`);
  }
  const pendingRequests = useMemo(
    () => filteredRequests.filter((request) => request.status === 'pending_faculty'),
    [filteredRequests]
  );
  const reviewedRequests = useMemo(
    () => filteredRequests.filter((request) => request.status !== 'pending_faculty'),
    [filteredRequests]
  );

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
          <StatCard title="Pending Approval" value={counts.filter((item) => item.status === 'pending_faculty').length} hint="Awaiting your action" />
          <StatCard title="Approved / Forwarded" value={counts.filter((item) => item.status === 'pending_tpo' || item.status === 'approved' || item.status === 'issued').length} hint="Already moved ahead" />
          <StatCard title="Approved by TPO" value={approvedByTpo} hint="Cleared by the TPO cell" />
          <StatCard title="Rejected by Department" value={rejectedByDept} hint="Rejected at faculty review" />
          <StatCard title="Rejected by TPO" value={rejectedByTpo} hint="Rejected at TPO review" />
          <StatCard title="Total Department Requests" value={counts.length} hint="Department-scoped live records" />
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
                <Button variant="outline" onClick={() => handleExport('csv')}>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
                <Button variant="outline" onClick={() => handleExport('excel')}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
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
              {/* NOC.program stores the posting-type VALUE string — bind option.value (not option.id). */}
              <Select value={postingTypeFilter} onValueChange={setPostingTypeFilter} disabled={postingTypesLoading}>
                <SelectTrigger className="w-full lg:w-56">
                  <SelectValue placeholder="Posting Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Posting Types</SelectItem>
                  {postingTypeOptions.map((option) => (
                    <SelectItem key={option.id} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <AdminListScopeFilters
              academicYear={{ value: academicYearFilter, onChange: setAcademicYearFilter }}
              dateRange={{ value: dateRange, onChange: setDateRange }}
            />
          </CardContent>
        </Card>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">Pending ({pendingRequests.length})</TabsTrigger>
            <TabsTrigger value="history">History ({reviewedRequests.length})</TabsTrigger>
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
                {requestsQuery.isLoading ? (
                  <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading live department requests...
                  </div>
                ) : (
                  <NocTable
                    requests={pendingRequests}
                    emptyTitle="No pending NOC requests"
                    emptyDescription="Your department does not have any requests waiting for faculty approval."
                    onReview={setSelectedNocId}
                    sortBy={sort_by}
                    sortOrder={sort_order}
                    onSort={onSort}
                  />
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
                {requestsQuery.isLoading ? (
                  <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading review history...
                  </div>
                ) : (
                  <NocTable
                    requests={reviewedRequests}
                    emptyTitle="No reviewed requests"
                    emptyDescription="Approved, issued, and rejected requests will appear here."
                    onReview={setSelectedNocId}
                    sortBy={sort_by}
                    sortOrder={sort_order}
                    onSort={onSort}
                  />
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
