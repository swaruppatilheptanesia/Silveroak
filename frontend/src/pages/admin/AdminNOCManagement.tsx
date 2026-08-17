import { useDeferredValue, useMemo, useState } from 'react';
import {
  CheckCircle,
  Clock,
  ExternalLink,
  Eye,
  FileText,
  Loader2,
  Search,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AdminStudentDetailsDialog } from '@/components/admin/AdminStudentDetailsDialog';
import { NOCReviewDialog } from '@/components/noc/NOCReviewDialog';
import { CompletionReviewDialog } from '@/components/noc/CompletionReviewDialog';
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
import AdminListScopeFilters, { type DateRangeValue } from '@/components/admin/AdminListScopeFilters';
import { COMPLETION_STATUS_CONFIG, getNocDepartment, getNocProgramLabel, getNocSearchFields, getNocStageLabel, getNocStudentName } from '@/lib/nocModule';
import { resolveBackendAssetUrl } from '@/lib/studentModule';
import {
  NOC_STATUS_CONFIG,
  NOC_TYPE_LABELS,
  type ApiNocListItem,
  type NOCStatus,
  type NOCType,
} from '@/types/noc';

function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
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

function NocTable({
  requests,
  emptyTitle,
  emptyDescription,
  onReview,
  onViewStudent,
  sortBy,
  sortOrder,
  onSort,
  showCompletion = false,
}: {
  requests: ApiNocListItem[];
  emptyTitle: string;
  emptyDescription: string;
  onReview: (nocId: string) => void;
  onViewStudent: (studentId: string) => void;
  sortBy?: string;
  sortOrder?: SortOrder;
  onSort: (columnKey: string) => void;
  // Issued tab: consolidate all internship records (Offer/NOC/Completion links + completion review).
  showCompletion?: boolean;
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
            <SortableTableHead label="Posting Type" columnKey="program" className="whitespace-nowrap" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
            <SortableTableHead label="Status" columnKey="status" className="whitespace-nowrap" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />
            <TableHead className="whitespace-nowrap">Stage</TableHead>
            <TableHead>NOC Number</TableHead>
            <TableHead>Documents</TableHead>
            {showCompletion && <TableHead className="whitespace-nowrap">Completion</TableHead>}
            {showCompletion && <TableHead className="whitespace-nowrap">Approved On</TableHead>}
            {showCompletion && <TableHead>Remarks</TableHead>}
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
                <Badge variant="secondary">{NOC_TYPE_LABELS[request.noc_type]}</Badge>
              </TableCell>
              <TableCell>
                <div>
                  <p className="font-medium text-foreground">{request.company_name}</p>
                  <p className="text-xs text-muted-foreground">{request.role_title}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(request.start_date), 'dd MMM')} - {request.end_date ? format(new Date(request.end_date), 'dd MMM yyyy') : 'Ongoing'}
                  </p>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="whitespace-nowrap">{getNocProgramLabel(request.program)}</Badge>
              </TableCell>
              <TableCell>
                <Badge className={`${NOC_STATUS_CONFIG[request.status].color} whitespace-nowrap`}>
                  {NOC_STATUS_CONFIG[request.status].label}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                {getNocStageLabel(request.status)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {request.noc_number || '—'}
              </TableCell>
              <TableCell>
                {request.offer_letter_url || request.supporting_document_url || (showCompletion && (request.certificate_url || request.completion_certificate_url)) ? (
                  <div className="flex flex-col items-start gap-1">
                    {request.offer_letter_url && (
                      <Button variant="outline" size="sm" className="h-7 px-2" asChild>
                        <a
                          href={resolveBackendAssetUrl(request.offer_letter_url)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                          Offer letter
                        </a>
                      </Button>
                    )}
                    {request.supporting_document_url && (
                      <Button variant="outline" size="sm" className="h-7 px-2" asChild>
                        <a
                          href={resolveBackendAssetUrl(request.supporting_document_url)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                          {request.supporting_document_name || 'Company proof'}
                        </a>
                      </Button>
                    )}
                    {showCompletion && request.certificate_url && (
                      <Button variant="outline" size="sm" className="h-7 px-2" asChild>
                        <a href={resolveBackendAssetUrl(request.certificate_url)} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                          NOC certificate
                        </a>
                      </Button>
                    )}
                    {showCompletion && request.completion_certificate_url && (
                      <Button variant="outline" size="sm" className="h-7 px-2" asChild>
                        <a href={resolveBackendAssetUrl(request.completion_certificate_url)} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                          Completion certificate
                        </a>
                      </Button>
                    )}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </TableCell>
              {showCompletion && (
                <TableCell>
                  <Badge
                    variant="outline"
                    className={request.completion_status ? `${COMPLETION_STATUS_CONFIG[request.completion_status].color} whitespace-nowrap` : 'whitespace-nowrap'}
                  >
                    {request.completion_status ? COMPLETION_STATUS_CONFIG[request.completion_status].label : 'Not Submitted'}
                  </Badge>
                </TableCell>
              )}
              {showCompletion && (
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {request.completion_reviewed_at ? format(new Date(request.completion_reviewed_at), 'dd MMM yyyy') : '—'}
                </TableCell>
              )}
              {showCompletion && (
                <TableCell className="max-w-[200px] text-xs text-muted-foreground">
                  {request.completion_remarks || '—'}
                </TableCell>
              )}
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => onReview(request.id)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Review
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onViewStudent(request.student.id)}>
                    Student
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function CompletionRequestsTable({
  requests,
  onReview,
}: {
  requests: ApiNocListItem[];
  onReview: (noc: ApiNocListItem) => void;
}) {
  if (requests.length === 0) {
    return (
      <EmptyState
        icon={FileText}
        title="No completion certificates awaiting review"
        description="Certificates submitted by students will appear here for verification."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Company</TableHead>
            <TableHead className="whitespace-nowrap">Posting Type</TableHead>
            <TableHead className="whitespace-nowrap">Submitted On</TableHead>
            <TableHead>Certificate</TableHead>
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
                <div>
                  <p className="font-medium text-foreground">{request.company_name}</p>
                  <p className="text-xs text-muted-foreground">{request.role_title}</p>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="whitespace-nowrap">{getNocProgramLabel(request.program)}</Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                {request.completion_submitted_at ? format(new Date(request.completion_submitted_at), 'dd MMM yyyy') : '—'}
              </TableCell>
              <TableCell>
                {request.completion_certificate_url ? (
                  <Button variant="outline" size="sm" className="h-7 px-2" asChild>
                    <a href={resolveBackendAssetUrl(request.completion_certificate_url)} target="_blank" rel="noreferrer">
                      <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                      View
                    </a>
                  </Button>
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" onClick={() => onReview(request)}>
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

export default function AdminNOCManagement() {
  const [activeTab, setActiveTab] = useState<'pending_faculty' | 'pending' | 'completion' | 'issued' | 'rejected' | 'all'>('pending_faculty');
  const [typeFilter, setTypeFilter] = useState<'all' | NOCType>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | NOCStatus>('all');
  const [postingTypeFilter, setPostingTypeFilter] = useState('all');
  const [instituteFilter, setInstituteFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [academicYearFilter, setAcademicYearFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRangeValue>({ from: undefined, to: undefined });
  const [page, setPage] = useState(1);
  const { sort_by, sort_order, onSort } = useServerSort<
    'student' | 'noc_type' | 'company' | 'program' | 'status'
  >(undefined, 'desc', () => setPage(1));
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNocId, setSelectedNocId] = useState<string | null>(null);
  const [completionReviewNoc, setCompletionReviewNoc] = useState<ApiNocListItem | null>(null);
  const [studentDetailsId, setStudentDetailsId] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(searchTerm);
  const { options: postingTypeOptions, isLoading: postingTypesLoading } = usePostingTypeOptions();

  const tabStatus =
    activeTab === 'pending_faculty'
      ? 'pending_faculty'
      : activeTab === 'pending'
        ? 'pending_tpo'
        : activeTab === 'issued'
          ? 'issued'
          : activeTab === 'rejected'
            ? 'rejected'
            : statusFilter === 'all'
              ? undefined
              : statusFilter;

  const isCompletionTab = activeTab === 'completion';

  const requestsQuery = useNocs({
    page,
    limit: 50,
    // The Completion Certificates tab lists pending completion submissions regardless of NOC status.
    status: isCompletionTab ? undefined : tabStatus,
    completion_status: isCompletionTab ? 'pending' : undefined,
    noc_type: typeFilter === 'all' ? undefined : typeFilter,
    // NOC.program stores the posting-type VALUE string (not the uuid) — bind option.value below.
    posting_type: postingTypeFilter === 'all' ? undefined : postingTypeFilter,
    institute: instituteFilter || undefined,
    course: courseFilter || undefined,
    branch: branchFilter || undefined,
    academic_year: academicYearFilter === 'all' ? undefined : academicYearFilter,
    date_from: dateRange.from ? dateRange.from.toISOString() : undefined,
    date_to: dateRange.to ? dateRange.to.toISOString() : undefined,
    sort_by,
    sort_order,
  });
  const totalQuery = useNocs({ page: 1, limit: 1 });
  const pendingFacultyQuery = useNocs({ page: 1, limit: 1, status: 'pending_faculty' });
  const pendingQuery = useNocs({ page: 1, limit: 1, status: 'pending_tpo' });
  const approvedQuery = useNocs({ page: 1, limit: 1, status: 'approved' });
  const issuedQuery = useNocs({ page: 1, limit: 1, status: 'issued' });
  const rejectedQuery = useNocs({ page: 1, limit: 1, status: 'rejected' });

  const requests = requestsQuery.data?.data ?? [];
  const filteredRequests = useMemo(() => {
    if (!deferredSearch) return requests;
    const query = deferredSearch.toLowerCase();
    return requests.filter((request) =>
      getNocSearchFields(request).some((field) => field.toLowerCase().includes(query))
    );
  }, [deferredSearch, requests]);

  return (
    <DashboardLayout
      title="NOC Management"
      subtitle="Review, approve, issue, and track the live NOC workflow"
    >
      <div className="space-y-6">
        {requestsQuery.error && (
          <Alert variant="destructive">
            <FileText className="h-4 w-4" />
            <AlertTitle>Unable to load NOC requests</AlertTitle>
            <AlertDescription>
              {getErrorMessage(requestsQuery.error, 'Please refresh and try again.')}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          <StatCard title="Total Requests" value={String(totalQuery.data?.pagination.total ?? 0)} hint="Across the live module" />
          <StatCard title="Pending Faculty" value={String(pendingFacultyQuery.data?.pagination.total ?? 0)} hint="Awaiting faculty approval" />
          <StatCard title="Pending TPO" value={String(pendingQuery.data?.pagination.total ?? 0)} hint="Ready for final approval" />
          <StatCard title="Approved" value={String(approvedQuery.data?.pagination.total ?? 0)} hint="Ready to issue" />
          <StatCard title="Issued" value={String(issuedQuery.data?.pagination.total ?? 0)} hint="Certificate generated" />
          <StatCard title="Rejected" value={String(rejectedQuery.data?.pagination.total ?? 0)} hint="Closed requests" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
            <CardDescription>
              Backend filters apply first. Search narrows the currently loaded page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-4 lg:flex-row">
              <div className="relative min-w-[240px] flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search by student, company, role, or NOC number..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>

              <Select
                value={typeFilter}
                onValueChange={(value) => {
                  setTypeFilter(value as 'all' | NOCType);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full lg:w-48">
                  <SelectValue placeholder="NOC type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {(['internship', 'training', 'project'] as NOCType[]).map((type) => (
                    <SelectItem key={type} value={type}>
                      {NOC_TYPE_LABELS[type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* NOC.program stores the posting-type VALUE string, so bind option.value (not option.id). */}
              <Select
                value={postingTypeFilter}
                onValueChange={(value) => {
                  setPostingTypeFilter(value);
                  setPage(1);
                }}
                disabled={postingTypesLoading}
              >
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

              {activeTab === 'all' && (
                <Select
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(value as 'all' | NOCStatus);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-full lg:w-56">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {(['pending_faculty', 'pending_tpo', 'approved', 'issued', 'rejected'] as NOCStatus[]).map((status) => (
                      <SelectItem key={status} value={status}>
                        {NOC_STATUS_CONFIG[status].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <AdminListScopeFilters
              institute={{ value: instituteFilter, onChange: (value) => { setInstituteFilter(value); setPage(1); } }}
              course={{ value: courseFilter, onChange: (value) => { setCourseFilter(value); setPage(1); } }}
              branch={{ value: branchFilter, onChange: (value) => { setBranchFilter(value); setPage(1); } }}
              academicYear={{ value: academicYearFilter, onChange: (value) => { setAcademicYearFilter(value); setPage(1); } }}
              dateRange={{ value: dateRange, onChange: (range) => { setDateRange(range); setPage(1); } }}
            />
          </CardContent>
        </Card>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value as typeof activeTab);
            setPage(1);
          }}
          className="space-y-4"
        >
          <TabsList>
            <TabsTrigger value="pending_faculty">Pending by Faculty</TabsTrigger>
            <TabsTrigger value="pending">Pending TPO</TabsTrigger>
            <TabsTrigger value="completion">Completion Certificates</TabsTrigger>
            <TabsTrigger value="issued">Issued</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="all">All Requests</TabsTrigger>
          </TabsList>

          <TabsContent value="pending_faculty">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                  Pending by Faculty
                </CardTitle>
                <CardDescription>
                  NOC requests awaiting faculty-coordinator approval.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {requestsQuery.isLoading ? (
                  <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading faculty approvals...
                  </div>
                ) : (
                  <NocTable
                    requests={filteredRequests}
                    emptyTitle="No requests pending faculty approval"
                    emptyDescription="New self-sourced/drive NOCs awaiting faculty sign-off will appear here."
                    onReview={setSelectedNocId}
                    onViewStudent={setStudentDetailsId}
                    sortBy={sort_by}
                    sortOrder={sort_order}
                    onSort={onSort}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                  Pending TPO Approvals
                </CardTitle>
                <CardDescription>
                  Faculty-approved NOCs awaiting TPO approval.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {requestsQuery.isLoading ? (
                  <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading pending approvals...
                  </div>
                ) : (
                  <NocTable
                    requests={filteredRequests}
                    emptyTitle="No pending TPO approvals"
                    emptyDescription="Faculty-approved requests will appear here when they are ready for the TPO queue."
                    onReview={setSelectedNocId}
                    onViewStudent={setStudentDetailsId}
                    sortBy={sort_by}
                    sortOrder={sort_order}
                    onSort={onSort}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completion">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-amber-600" />
                  Completion Certificate Requests
                </CardTitle>
                <CardDescription>
                  Internship completion certificates submitted by students, awaiting verification & approval.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {requestsQuery.isLoading ? (
                  <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading completion certificates...
                  </div>
                ) : (
                  <CompletionRequestsTable
                    requests={filteredRequests}
                    onReview={setCompletionReviewNoc}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rejected">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-destructive" />
                  Rejected Requests
                </CardTitle>
                <CardDescription>
                  NOC requests that were rejected at faculty or TPO review.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {requestsQuery.isLoading ? (
                  <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading rejected requests...
                  </div>
                ) : (
                  <NocTable
                    requests={filteredRequests}
                    emptyTitle="No rejected requests"
                    emptyDescription="Rejected NOC requests will appear here."
                    onReview={setSelectedNocId}
                    onViewStudent={setStudentDetailsId}
                    sortBy={sort_by}
                    sortOrder={sort_order}
                    onSort={onSort}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="issued">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-emerald-600" />
                  Issued NOCs
                </CardTitle>
                <CardDescription>
                  Finalized NOC requests with generated certificate numbers.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {requestsQuery.isLoading ? (
                  <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading issued NOCs...
                  </div>
                ) : (
                  <NocTable
                    requests={filteredRequests}
                    emptyTitle="No issued NOCs"
                    emptyDescription="Issued requests will appear here once the workflow is completed."
                    onReview={setSelectedNocId}
                    onViewStudent={setStudentDetailsId}
                    sortBy={sort_by}
                    sortOrder={sort_order}
                    onSort={onSort}
                    showCompletion
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="all">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  All Requests
                </CardTitle>
                <CardDescription>
                  Full searchable NOC history for the current filter set. Approved NOCs are issued from here —
                  filter Status to “Approved”, then use Review on a row to generate its number.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {requestsQuery.isLoading ? (
                  <div className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading request history...
                  </div>
                ) : (
                  <NocTable
                    requests={filteredRequests}
                    emptyTitle="No requests found"
                    emptyDescription="Try adjusting the status, type, or search filters."
                    onReview={setSelectedNocId}
                    onViewStudent={setStudentDetailsId}
                    sortBy={sort_by}
                    sortOrder={sort_order}
                    onSort={onSort}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {(requestsQuery.data?.pagination.totalPages ?? 1) > 1 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Page {requestsQuery.data?.pagination.page} of {requestsQuery.data?.pagination.totalPages}
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
                disabled={page >= (requestsQuery.data?.pagination.totalPages ?? 1)}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <NOCReviewDialog
        nocId={selectedNocId}
        open={Boolean(selectedNocId)}
        onOpenChange={(open) => !open && setSelectedNocId(null)}
        mode="admin"
      />
      <CompletionReviewDialog
        noc={completionReviewNoc}
        open={Boolean(completionReviewNoc)}
        onOpenChange={(open) => !open && setCompletionReviewNoc(null)}
      />
      <AdminStudentDetailsDialog
        studentId={studentDetailsId}
        open={Boolean(studentDetailsId)}
        onOpenChange={(open) => {
          if (!open) setStudentDetailsId(null);
        }}
      />
    </DashboardLayout>
  );
}
