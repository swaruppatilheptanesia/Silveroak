import { useDeferredValue, useMemo, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle2,
  Clock,
  Download,
  Edit,
  Eye,
  FileText,
  type LucideIcon,
  Loader2,
  RotateCcw,
  KeyRound,
  ShieldAlert,
  Upload,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import AdminListScopeFilters from '@/components/admin/AdminListScopeFilters';
import { ConfirmActionDialog } from '@/components/shared/ConfirmActionDialog';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageLoader } from '@/components/shared/PageLoader';
import { SearchInput } from '@/components/shared/SearchInput';
import { useAuth } from '@/contexts/AuthContext';
import {
  useEnableNoDuesEligibility,
  useIssueNdc,
  useImportNoDuesEligibility,
  useNoDuesDetail,
  useNoDuesRequests,
  useReviewNoDues,
  useUpdateNoDuesRequest,
} from '@/hooks/use-no-dues-api';
import {
  getNoDuesErrorMessage,
  getNoDuesStatusClassName,
  getNoDuesStatusVariant,
  getNoDuesSummary,
  normalizeNoDuesRequest,
} from '@/lib/noDuesModule';
import { formatDate, formatDateTime, formatLPA } from '@/lib/formatters';
import { resolveBackendAssetUrl } from '@/lib/studentModule';
import { downloadExcelTable } from '@/lib/spreadsheetExport';
import { noDuesService } from '@/services/noDuesService';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { AdminStudentDetailsDialog } from '@/components/admin/AdminStudentDetailsDialog';
import type { CreateNoDuesInput, NoDuesExitReason, NoDuesStatus, ReviewNoDuesInput } from '@/types/noDues';
import { EXIT_REASON_LABELS, NDC_STATUS_LABELS } from '@/types/noDues';

type ReviewActionStatus = ReviewNoDuesInput['status'];

type NoDuesEditFormState = {
  exit_reason: NoDuesExitReason;
  company_name: string;
  designation: string;
  package_lpa: string;
  joining_date: string;
  business_name: string;
  business_nature: string;
  business_address: string;
  institution_name: string;
  program_name: string;
  country: string;
};

const STATUS_FILTERS: Array<{ value: 'all' | Exclude<NoDuesStatus, 'draft'>; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'returned', label: 'Returned' },
  { value: 'issued', label: 'Issued' },
  { value: 'rejected', label: 'Rejected' },
];

const STATUS_CHANGE_OPTIONS: Array<{ value: ReviewActionStatus; label: string }> = [
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'under_review', label: 'Under Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'returned', label: 'Returned' },
  { value: 'rejected', label: 'Rejected' },
];

const emptyEditForm: NoDuesEditFormState = {
  exit_reason: 'employment',
  company_name: '',
  designation: '',
  package_lpa: '',
  joining_date: '',
  business_name: '',
  business_nature: '',
  business_address: '',
  institution_name: '',
  program_name: '',
  country: '',
};

function formFromRequest(request: ReturnType<typeof normalizeNoDuesRequest>): NoDuesEditFormState {
  return {
    exit_reason: request.exit_reason,
    company_name: request.company_name ?? '',
    designation: request.designation ?? '',
    package_lpa: request.package_lpa != null ? String(request.package_lpa) : '',
    joining_date: request.joining_date ? request.joining_date.slice(0, 10) : '',
    business_name: request.business_name ?? '',
    business_nature: request.business_nature ?? '',
    business_address: request.business_address ?? '',
    institution_name: request.institution_name ?? '',
    program_name: request.program_name ?? '',
    country: request.country ?? '',
  };
}

function buildEditPayload(form: NoDuesEditFormState): CreateNoDuesInput {
  if (form.exit_reason === 'employment') {
    return {
      exit_reason: 'employment',
      declaration_accepted: true,
      company_name: form.company_name.trim(),
      designation: form.designation.trim(),
      package_lpa: form.package_lpa ? Number(form.package_lpa) : null,
      joining_date: form.joining_date || null,
      business_name: null,
      business_nature: null,
      business_address: null,
      institution_name: null,
      program_name: null,
      country: null,
    };
  }

  if (form.exit_reason === 'family_business') {
    return {
      exit_reason: 'family_business',
      declaration_accepted: true,
      company_name: null,
      designation: null,
      package_lpa: null,
      joining_date: null,
      business_name: form.business_name.trim(),
      business_nature: form.business_nature.trim(),
      business_address: form.business_address.trim(),
      institution_name: null,
      program_name: null,
      country: null,
    };
  }

  return {
    exit_reason: 'higher_studies',
    declaration_accepted: true,
    company_name: null,
    designation: null,
    package_lpa: null,
    joining_date: null,
    business_name: null,
    business_nature: null,
    business_address: null,
    institution_name: form.institution_name.trim(),
    program_name: form.program_name.trim(),
    country: form.country.trim(),
  };
}

function getExitReasonIcon(exitReason: string) {
  if (exitReason === 'employment') return <Briefcase className="h-4 w-4" />;
  if (exitReason === 'family_business') return <Building2 className="h-4 w-4" />;
  return <BookOpen className="h-4 w-4" />;
}

function getActionCopy(status: ReviewActionStatus | null) {
  if (status === 'under_review') {
    return {
      title: 'Start Review',
      description: 'Add an optional internal note while moving this request into active review.',
      confirmLabel: 'Start Review',
      requireRemarks: false,
    };
  }

  if (status === 'returned') {
    return {
      title: 'Return for Clarification',
      description: 'Explain exactly what the student needs to correct before resubmitting.',
      confirmLabel: 'Return Request',
      requireRemarks: true,
    };
  }

  if (status === 'rejected') {
    return {
      title: 'Reject Request',
      description: 'Provide a reason so the student understands why the request was rejected.',
      confirmLabel: 'Reject Request',
      requireRemarks: true,
    };
  }

  return {
    title: 'Review Request',
    description: 'Update the request status.',
    confirmLabel: 'Save',
    requireRemarks: false,
  };
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: LucideIcon;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <div className="rounded-full bg-primary/10 p-3">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function NoDuesManagement() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | Exclude<NoDuesStatus, 'draft'>>('all');
  const [instituteFilter, setInstituteFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [passingYearFilter, setPassingYearFilter] = useState('all');
  const [page, setPage] = useState(1);
  const { sort_by, sort_order, onSort } = useServerSort<
    'student' | 'status' | 'created_at'
  >('created_at', 'desc', () => setPage(1));
  const [selectedRequestId, setSelectedRequestId] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<ReviewActionStatus | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusValue, setStatusValue] = useState<ReviewActionStatus>('pending_review');
  const [statusRemarks, setStatusRemarks] = useState('');
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState<NoDuesEditFormState>(emptyEditForm);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [eligibilityFile, setEligibilityFile] = useState<File | null>(null);
  const [singleEligibilityDialogOpen, setSingleEligibilityDialogOpen] = useState(false);
  const [singleEnrollmentNumber, setSingleEnrollmentNumber] = useState('');
  const [singleEligibilityConfirmOpen, setSingleEligibilityConfirmOpen] = useState(false);
  const [studentDetailsId, setStudentDetailsId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const deferredSearch = useDeferredValue(searchTerm);
  const isAdmin = user?.role === 'tpo_admin';

  const scopeParams = {
    institute: instituteFilter || undefined,
    course: courseFilter || undefined,
    branch: branchFilter || undefined,
    passing_year: passingYearFilter === 'all' ? undefined : passingYearFilter,
  };

  const requestsQuery = useNoDuesRequests({
    page,
    limit: 20,
    status: statusFilter === 'all' ? undefined : statusFilter,
    ...scopeParams,
    sort_by,
    sort_order,
  });
  const detailQuery = useNoDuesDetail(selectedRequestId);
  const reviewMutation = useReviewNoDues();
  const updateMutation = useUpdateNoDuesRequest();
  const issueMutation = useIssueNdc();
  const importEligibility = useImportNoDuesEligibility();
  const enableEligibility = useEnableNoDuesEligibility();

  const totalQuery = useNoDuesRequests({ page: 1, limit: 1 });
  const pendingQuery = useNoDuesRequests({ page: 1, limit: 1, status: 'pending_review' });
  const underReviewQuery = useNoDuesRequests({ page: 1, limit: 1, status: 'under_review' });
  const approvedQuery = useNoDuesRequests({ page: 1, limit: 1, status: 'approved' });
  const issuedQuery = useNoDuesRequests({ page: 1, limit: 1, status: 'issued' });
  const returnedQuery = useNoDuesRequests({ page: 1, limit: 1, status: 'returned' });
  const rejectedQuery = useNoDuesRequests({ page: 1, limit: 1, status: 'rejected' });

  const requests = useMemo(
    () => (requestsQuery.data?.data ?? []).map(normalizeNoDuesRequest),
    [requestsQuery.data]
  );

  const filteredRequests = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();

    if (!query) {
      return requests;
    }

    return requests.filter((request) => {
      const fields = [
        request.id,
        request.student_name,
        request.roll_number,
        request.department,
        request.company_name || '',
        request.institution_name || '',
        request.business_name || '',
      ];

      return fields.some((field) => field.toLowerCase().includes(query));
    });
  }, [deferredSearch, requests]);

  const selectedRequest = useMemo(() => {
    if (detailQuery.data) {
      return normalizeNoDuesRequest(detailQuery.data);
    }

    return requests.find((request) => request.id === selectedRequestId) ?? null;
  }, [detailQuery.data, requests, selectedRequestId]);

  if (requestsQuery.isLoading) {
    return (
      <DashboardLayout title="No Dues Management" subtitle="Review and issue student no-dues certificates">
        <PageLoader />
      </DashboardLayout>
    );
  }

  if (requestsQuery.error) {
    return (
      <DashboardLayout title="No Dues Management" subtitle="Review and issue student no-dues certificates">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load no-dues requests</AlertTitle>
          <AlertDescription>
            {getNoDuesErrorMessage(requestsQuery.error, 'Please refresh and try again.')}
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  function openDetail(requestId: string) {
    setSelectedRequestId(requestId);
    setSheetOpen(true);
  }

  async function handleExportAll() {
    setIsExporting(true);
    try {
      const status = statusFilter === 'all' ? undefined : statusFilter;
      const all: NoDuesRequest[] = [];
      let p = 1;
      for (;;) {
        const res = await noDuesService.getRequests({
          status,
          ...scopeParams,
          page: p,
          limit: 100,
          sort_by: 'created_at',
          sort_order: 'desc',
        });
        all.push(...res.data.map(normalizeNoDuesRequest));
        if (!res.pagination?.hasNext || res.data.length === 0) {
          break;
        }
        p += 1;
      }

      if (all.length === 0) {
        toast.info('No requests to export.');
        return;
      }

      const headers = [
        'Student Name', 'Roll Number', 'Department', 'Course', 'Batch', 'Email', 'Mobile',
        'Exit Reason', 'Company Name', 'Designation', 'Package (LPA)', 'Joining Date',
        'Business Name', 'Business Nature', 'Business Address', 'Institution', 'Program', 'Country',
        'Status', 'NDC Number', 'Declaration Accepted', 'Admin Remarks', 'Reviewed At', 'Issued At',
        'Submitted At', 'Offer Letter URL', 'Admission Letter URL', 'Proof URL', 'Certificate URL',
      ];
      const assetUrl = (url?: string | null) => (url ? resolveBackendAssetUrl(url) : '');
      const rows = all.map((request) => [
        request.student_name,
        request.roll_number,
        request.department,
        request.course_name ?? '',
        request.batch_year ?? '',
        request.email ?? '',
        request.mobile ?? '',
        EXIT_REASON_LABELS[request.exit_reason] ?? request.exit_reason,
        request.company_name ?? '',
        request.designation ?? '',
        request.package_lpa != null ? formatLPA(request.package_lpa) : '',
        request.joining_date ? formatDate(request.joining_date) : '',
        request.business_name ?? '',
        request.business_nature ?? '',
        request.business_address ?? '',
        request.institution_name ?? '',
        request.program_name ?? '',
        request.country ?? '',
        NDC_STATUS_LABELS[request.status] ?? request.status,
        request.ndc_number ?? '',
        request.declaration_accepted ? 'Yes' : 'No',
        request.admin_remarks ?? '',
        request.reviewed_at ? formatDateTime(request.reviewed_at) : '',
        request.issued_at ? formatDateTime(request.issued_at) : '',
        formatDateTime(request.created_at),
        assetUrl(request.offer_letter_url),
        assetUrl(request.admission_letter_url),
        assetUrl(request.proof_url),
        assetUrl(request.certificate_url),
      ]);

      await downloadExcelTable(headers, rows, 'no_dues_requests');
      toast.success(`Exported ${all.length} request${all.length === 1 ? '' : 's'}.`);
    } catch (error) {
      toast.error(getNoDuesErrorMessage(error, 'Unable to export No Dues requests.'));
    } finally {
      setIsExporting(false);
    }
  }

  function openReviewDialog(status: ReviewActionStatus) {
    setReviewStatus(status);
    setReviewRemarks(status === 'under_review' ? 'Verifying details and supporting evidence.' : '');
    setReviewDialogOpen(true);
  }

  function openStatusDialog() {
    if (!selectedRequest || selectedRequest.status === 'issued' || selectedRequest.status === 'approved' || selectedRequest.status === 'draft') return;
    setStatusValue(selectedRequest.status as ReviewActionStatus);
    setStatusRemarks(selectedRequest.admin_remarks ?? '');
    setStatusDialogOpen(true);
  }

  function openEditDialog() {
    if (!selectedRequest || selectedRequest.status === 'issued' || selectedRequest.status === 'approved') return;
    setEditForm(formFromRequest(selectedRequest));
    setEditDialogOpen(true);
  }

  function openSingleEligibilityDialog() {
    setSingleEnrollmentNumber('');
    setSingleEligibilityConfirmOpen(false);
    setSingleEligibilityDialogOpen(true);
  }

  async function handleApprove() {
    if (!selectedRequestId) return;

    try {
      await reviewMutation.mutateAsync({
        id: selectedRequestId,
        data: { status: 'approved', admin_remarks: null },
      });
      toast.success('No-dues request approved.');
    } catch (error) {
      toast.error(getNoDuesErrorMessage(error, 'Unable to approve this request right now.'));
    }
  }

  async function handleIssue() {
    if (!selectedRequestId) return;

    try {
      const response = await issueMutation.mutateAsync(selectedRequestId);
      toast.success(`NDC issued${response.ndc_number ? `: ${response.ndc_number}` : '.'}`);
    } catch (error) {
      toast.error(getNoDuesErrorMessage(error, 'Unable to issue the NDC right now.'));
    }
  }

  async function handleSubmitReviewAction() {
    if (!selectedRequestId || !reviewStatus) return;

    const actionCopy = getActionCopy(reviewStatus);
    const trimmedRemarks = reviewRemarks.trim();

    if (actionCopy.requireRemarks && !trimmedRemarks) {
      toast.error('Please add remarks before continuing.');
      return;
    }

    try {
      await reviewMutation.mutateAsync({
        id: selectedRequestId,
        data: {
          status: reviewStatus,
          admin_remarks: trimmedRemarks || null,
        },
      });

      toast.success(
        reviewStatus === 'under_review'
          ? 'Request moved to under review.'
          : reviewStatus === 'returned'
            ? 'Request returned to the student.'
            : 'Request rejected.'
      );

      setReviewDialogOpen(false);
      setReviewStatus(null);
      setReviewRemarks('');
    } catch (error) {
      toast.error(getNoDuesErrorMessage(error, 'Unable to update the review status right now.'));
    }
  }

  async function handleSubmitStatusChange() {
    if (!selectedRequestId) return;
    const trimmedRemarks = statusRemarks.trim();

    if ((statusValue === 'returned' || statusValue === 'rejected') && !trimmedRemarks) {
      toast.error('Please add remarks before continuing.');
      return;
    }

    try {
      await reviewMutation.mutateAsync({
        id: selectedRequestId,
        data: {
          status: statusValue,
          admin_remarks: trimmedRemarks || null,
        },
      });
      toast.success('No-dues status updated.');
      setStatusDialogOpen(false);
      setStatusRemarks('');
    } catch (error) {
      toast.error(getNoDuesErrorMessage(error, 'Unable to update the status right now.'));
    }
  }

  async function handleSubmitEdit() {
    if (!selectedRequestId) return;
    const payload = buildEditPayload(editForm);

    if (payload.exit_reason === 'employment' && (!payload.company_name || !payload.designation || !payload.joining_date)) {
      toast.error('Company, designation, and joining date are required for employment status.');
      return;
    }
    if (payload.exit_reason === 'family_business' && (!payload.business_name || !payload.business_nature || !payload.business_address)) {
      toast.error('Business name, nature, and address are required for family business status.');
      return;
    }
    if (payload.exit_reason === 'higher_studies' && (!payload.institution_name || !payload.program_name || !payload.country)) {
      toast.error('Institution, program, and country are required for higher studies status.');
      return;
    }

    try {
      await updateMutation.mutateAsync({ id: selectedRequestId, data: payload });
      toast.success('No-dues form updated.');
      setEditDialogOpen(false);
    } catch (error) {
      toast.error(getNoDuesErrorMessage(error, 'Unable to update the no-dues form right now.'));
    }
  }

  async function handleImportEligibility() {
    if (!eligibilityFile) {
      toast.error('Please select a CSV or XLSX file.');
      return;
    }

    try {
      const result = await importEligibility.mutateAsync(eligibilityFile);
      toast.success(`No Dues enabled for ${result.enabled_count} student(s).`);
      if (result.unmatched_enrollment_numbers.length > 0) {
        toast.error(`${result.unmatched_enrollment_numbers.length} enrollment number(s) were not found.`);
      }
      setEligibilityFile(null);
      setImportDialogOpen(false);
    } catch (error) {
      toast.error(getNoDuesErrorMessage(error, 'Unable to import the eligibility list right now.'));
    }
  }

  function handlePrepareSingleEligibility() {
    const enrollmentNumber = singleEnrollmentNumber.trim();

    if (!enrollmentNumber) {
      toast.error('Please enter an enrollment number.');
      return;
    }

    setSingleEligibilityConfirmOpen(true);
  }

  async function handleEnableSingleEligibility() {
    const enrollmentNumber = singleEnrollmentNumber.trim();

    if (!enrollmentNumber) {
      toast.error('Please enter an enrollment number.');
      return;
    }

    try {
      const result = await enableEligibility.mutateAsync(enrollmentNumber);
      if (result.matched_count > 0) {
        toast.success(`No Dues enabled for ${result.matched_count} student(s).`);
      } else {
        toast.error(`No student found for enrollment number ${result.enrollment_number}.`);
      }
      setSingleEligibilityConfirmOpen(false);
      setSingleEligibilityDialogOpen(false);
      setSingleEnrollmentNumber('');
    } catch (error) {
      toast.error(getNoDuesErrorMessage(error, 'Unable to enable No Dues for this enrollment number right now.'));
    }
  }

  const pagination = requestsQuery.data?.pagination;
  const selectedActionCopy = getActionCopy(reviewStatus);

  return (
    <DashboardLayout title="No Dues Management" subtitle="Review and issue student no-dues certificates">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
          <StatCard
            title="Total Requests"
            value={String(totalQuery.data?.pagination.total ?? requestsQuery.data?.pagination.total ?? 0)}
            description="Across every review state"
            icon={FileText}
          />
          <StatCard
            title="Pending Review"
            value={String(pendingQuery.data?.pagination.total ?? 0)}
            description="Freshly submitted"
            icon={Clock}
          />
          <StatCard
            title="Under Review"
            value={String(underReviewQuery.data?.pagination.total ?? 0)}
            description="Actively being processed"
            icon={Eye}
          />
          <StatCard
            title="Approved"
            value={String(approvedQuery.data?.pagination.total ?? 0)}
            description="Ready for issuance"
            icon={CheckCircle2}
          />
          <StatCard
            title="Issued"
            value={String(issuedQuery.data?.pagination.total ?? 0)}
            description="Final NDC released"
            icon={FileText}
          />
          <StatCard
            title="Returned"
            value={String(returnedQuery.data?.pagination.total ?? 0)}
            description="Sent back for clarification"
            icon={Clock}
          />
          <StatCard
            title="Rejected"
            value={String(rejectedQuery.data?.pagination.total ?? 0)}
            description="Closed requests"
            icon={XCircle}
          />
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={() => void handleExportAll()} disabled={isExporting}>
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export All
          </Button>
          <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Import Eligibility List
          </Button>
          <Button variant="outline" onClick={openSingleEligibilityDialog}>
            <KeyRound className="mr-2 h-4 w-4" />
            Enable Single Enrollment
          </Button>
        </div>

        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Search by student, roll number, company, or request ID..."
            />
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as typeof statusFilter);
                setPage(1);
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_FILTERS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AdminListScopeFilters
            institute={{ value: instituteFilter, onChange: (value) => { setInstituteFilter(value); setPage(1); } }}
            course={{ value: courseFilter, onChange: (value) => { setCourseFilter(value); setPage(1); } }}
            branch={{ value: branchFilter, onChange: (value) => { setBranchFilter(value); setPage(1); } }}
            passingYear={{ value: passingYearFilter, onChange: (value) => { setPassingYearFilter(value); setPage(1); } }}
          />
        </div>

        <Card>
          <CardContent className="p-0">
            {filteredRequests.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={FileText}
                  title="No requests found"
                  description="Try changing the status filter or clearing your search."
                  compact
                />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead label="Student" columnKey="student" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                    <TableHead>Exit Path</TableHead>
                    <SortableTableHead label="Submitted" columnKey="created_at" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                    <SortableTableHead label="Status" columnKey="status" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                    <TableHead>NDC Number</TableHead>
                    <TableHead className="w-[120px] text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRequests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{request.student_name || 'Student record'}</p>
                          <p className="text-sm text-muted-foreground">
                            {request.roll_number || 'Roll number unavailable'}
                          </p>
                          <p className="text-xs text-muted-foreground">{request.department || 'Department unavailable'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            {getExitReasonIcon(request.exit_reason)}
                            <span>{EXIT_REASON_LABELS[request.exit_reason]}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">{getNoDuesSummary(request)}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDateTime(request.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getNoDuesStatusVariant(request.status)}
                          className={getNoDuesStatusClassName(request.status)}
                        >
                          {NDC_STATUS_LABELS[request.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {request.ndc_number || <span className="text-muted-foreground">Not issued</span>}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openDetail(request.id)}>
                            View
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setStudentDetailsId(request.student_id)}>
                            Student
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {pagination ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Page {pagination.page} of {Math.max(pagination.totalPages, 1)} • {pagination.total} total requests
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
                disabled={!pagination.hasPrev}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                onClick={() => setPage((current) => current + 1)}
                disabled={!pagination.hasNext}
              >
                Next
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) {
            setSelectedRequestId('');
          }
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-2xl">
          {detailQuery.isLoading && !selectedRequest ? (
            <div className="flex min-h-[240px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : detailQuery.error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Unable to load request details</AlertTitle>
              <AlertDescription>
                {getNoDuesErrorMessage(detailQuery.error, 'Please close the panel and try again.')}
              </AlertDescription>
            </Alert>
          ) : selectedRequest ? (
            <>
              <SheetHeader>
                <SheetTitle className="flex flex-wrap items-center gap-2">
                  <span>{selectedRequest.student_name || 'Student record'}</span>
                  <Badge
                    variant={getNoDuesStatusVariant(selectedRequest.status)}
                    className={getNoDuesStatusClassName(selectedRequest.status)}
                  >
                    {NDC_STATUS_LABELS[selectedRequest.status]}
                  </Badge>
                </SheetTitle>
                <SheetDescription>
                  Submitted {formatDateTime(selectedRequest.created_at)}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card>
                    <CardContent className="space-y-2 p-4 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-foreground">Student Details</p>
                        <Button variant="ghost" size="sm" onClick={() => setStudentDetailsId(selectedRequest.student_id)}>
                          Full Details
                        </Button>
                      </div>
                      <p><span className="text-muted-foreground">Name:</span> {selectedRequest.student_name || 'Unavailable'}</p>
                      <p><span className="text-muted-foreground">Roll No:</span> {selectedRequest.roll_number || 'Unavailable'}</p>
                      <p><span className="text-muted-foreground">Department:</span> {selectedRequest.department || 'Unavailable'}</p>
                      <p><span className="text-muted-foreground">Course:</span> {selectedRequest.course_name || 'Unavailable'}</p>
                      <p><span className="text-muted-foreground">Batch:</span> {selectedRequest.batch_year || 'Unavailable'}</p>
                      <p><span className="text-muted-foreground">Email:</span> {selectedRequest.email || 'Unavailable'}</p>
                      <p><span className="text-muted-foreground">Mobile:</span> {selectedRequest.mobile || 'Unavailable'}</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="space-y-2 p-4 text-sm">
                      <p className="font-medium text-foreground">Request Details</p>
                      <p className="flex items-center gap-2">
                        {getExitReasonIcon(selectedRequest.exit_reason)}
                        <span>{EXIT_REASON_LABELS[selectedRequest.exit_reason]}</span>
                      </p>
                      <p><span className="text-muted-foreground">Summary:</span> {getNoDuesSummary(selectedRequest)}</p>
                      <p><span className="text-muted-foreground">Declaration:</span> {selectedRequest.declaration_accepted ? 'Accepted' : 'Not accepted'}</p>
                      {selectedRequest.reviewed_by ? (
                        <p><span className="text-muted-foreground">Reviewed By:</span> {selectedRequest.reviewed_by}</p>
                      ) : null}
                      {selectedRequest.reviewed_at ? (
                        <p><span className="text-muted-foreground">Reviewed At:</span> {formatDateTime(selectedRequest.reviewed_at)}</p>
                      ) : null}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardContent className="space-y-2 p-4 text-sm">
                    <p className="font-medium text-foreground">Exit Specific Information</p>

                    <p><span className="text-muted-foreground">SOU Passing Year:</span> {selectedRequest.sou_passing_year || 'Unavailable'}</p>

                    {selectedRequest.exit_reason === 'employment' ? (
                      <>
                        <p><span className="text-muted-foreground">Company:</span> {selectedRequest.company_name || 'Unavailable'}</p>
                        <p><span className="text-muted-foreground">Designation:</span> {selectedRequest.designation || 'Unavailable'}</p>
                        <p><span className="text-muted-foreground">Company Sector:</span> {selectedRequest.company_sector || 'Unavailable'}</p>
                        <p><span className="text-muted-foreground">Package (CTC):</span> {selectedRequest.package_lpa != null ? formatLPA(selectedRequest.package_lpa) : 'Unavailable'}</p>
                        <p><span className="text-muted-foreground">Company Address:</span> {selectedRequest.company_address || 'Unavailable'}</p>
                        <p><span className="text-muted-foreground">Joining Date:</span> {selectedRequest.joining_date ? formatDate(selectedRequest.joining_date) : 'Unavailable'}</p>
                      </>
                    ) : null}

                    {selectedRequest.exit_reason === 'family_business' ? (
                      <>
                        <p><span className="text-muted-foreground">Business / Company Name:</span> {selectedRequest.business_name || 'Unavailable'}</p>
                        <p><span className="text-muted-foreground">Sector:</span> {selectedRequest.business_nature || 'Unavailable'}</p>
                        <p><span className="text-muted-foreground">Address:</span> {selectedRequest.business_address || 'Unavailable'}</p>
                      </>
                    ) : null}

                    {selectedRequest.exit_reason === 'planning_studies' ? (
                      <>
                        <p><span className="text-muted-foreground">Country:</span> {selectedRequest.country || 'Unavailable'}</p>
                        <p><span className="text-muted-foreground">Intended Course:</span> {selectedRequest.program_name || 'Unavailable'}</p>
                        <p><span className="text-muted-foreground">Preferred University:</span> {selectedRequest.institution_name || 'Unavailable'}</p>
                        <p><span className="text-muted-foreground">Language Test:</span> {selectedRequest.language_test || 'Not provided'}</p>
                      </>
                    ) : null}

                    {selectedRequest.exit_reason === 'higher_studies' ? (
                      <>
                        <p><span className="text-muted-foreground">Country:</span> {selectedRequest.country || 'Unavailable'}</p>
                        <p><span className="text-muted-foreground">Course / Program:</span> {selectedRequest.program_name || 'Unavailable'}</p>
                        <p><span className="text-muted-foreground">University Name:</span> {selectedRequest.institution_name || 'Unavailable'}</p>
                        <p><span className="text-muted-foreground">University Address:</span> {selectedRequest.university_address || 'Unavailable'}</p>
                      </>
                    ) : null}

                    {selectedRequest.exit_reason === 'competitive_exam' ? (
                      <>
                        <p><span className="text-muted-foreground">Examination Name:</span> {selectedRequest.examination_name || 'Unavailable'}</p>
                        <p><span className="text-muted-foreground">Additional Details:</span> {selectedRequest.additional_details || 'Not provided'}</p>
                      </>
                    ) : null}

                    {selectedRequest.proof_url ? (
                      <div className="pt-2">
                        <p className="mb-1 text-muted-foreground">Proof Attachment:</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            window.open(resolveBackendAssetUrl(selectedRequest.proof_url || ''), '_blank', 'noopener,noreferrer');
                          }}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          View Proof Attachment
                        </Button>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                {selectedRequest.ndc_number ? (
                  <Card className="border-emerald-500/30 bg-emerald-500/5">
                    <CardContent className="space-y-2 p-4">
                      <p className="font-medium text-emerald-700 dark:text-emerald-300">
                        NDC Number: {selectedRequest.ndc_number}
                      </p>
                      {selectedRequest.issued_at ? (
                        <p className="text-sm text-muted-foreground">
                          Issued on {formatDateTime(selectedRequest.issued_at)}
                        </p>
                      ) : null}
                      {selectedRequest.certificate_url ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            window.open(resolveBackendAssetUrl(selectedRequest.certificate_url || ''), '_blank', 'noopener,noreferrer');
                          }}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download Certificate
                        </Button>
                      ) : null}
                    </CardContent>
                  </Card>
                ) : null}

                {selectedRequest.admin_remarks ? (
                  <Card className="border-orange-500/20 bg-orange-500/5">
                    <CardContent className="space-y-2 p-4">
                      <p className="font-medium text-orange-700 dark:text-orange-300">Admin Remarks</p>
                      <p className="text-sm text-orange-700 dark:text-orange-300">{selectedRequest.admin_remarks}</p>
                    </CardContent>
                  </Card>
                ) : null}

                {selectedRequest.status !== 'issued' && selectedRequest.status !== 'approved' ? (
                  <Card>
                    <CardContent className="space-y-3 p-4">
                      <p className="font-medium text-foreground">Actions</p>

                      <div className="flex flex-wrap gap-2">
                        {selectedRequest.status !== 'issued' ? (
                          <>
                            <Button variant="outline" onClick={openEditDialog} disabled={updateMutation.isPending}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Form
                            </Button>
                            <Button variant="outline" onClick={openStatusDialog} disabled={reviewMutation.isPending}>
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Change Status
                            </Button>
                          </>
                        ) : null}

                        {selectedRequest.status === 'pending_review' ? (
                          <Button variant="outline" onClick={() => openReviewDialog('under_review')} disabled={reviewMutation.isPending}>
                            <Eye className="mr-2 h-4 w-4" />
                            Start Review
                          </Button>
                        ) : null}

                        {(selectedRequest.status === 'pending_review' || selectedRequest.status === 'under_review') ? (
                          <>
                            <Button onClick={() => void handleApprove()} disabled={reviewMutation.isPending}>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Approve
                            </Button>
                            <Button variant="outline" onClick={() => openReviewDialog('returned')} disabled={reviewMutation.isPending}>
                              <RotateCcw className="mr-2 h-4 w-4" />
                              Return
                            </Button>
                            <Button variant="destructive" onClick={() => openReviewDialog('rejected')} disabled={reviewMutation.isPending}>
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject
                            </Button>
                          </>
                        ) : null}

                      </div>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedActionCopy.title}</DialogTitle>
            <DialogDescription>{selectedActionCopy.description}</DialogDescription>
          </DialogHeader>

          <Textarea
            value={reviewRemarks}
            onChange={(event) => setReviewRemarks(event.target.value)}
            rows={5}
            placeholder={
              reviewStatus === 'under_review'
                ? 'Optional internal note for this review...'
                : 'Add remarks for the student...'
            }
          />

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleSubmitReviewAction()} disabled={reviewMutation.isPending}>
              {reviewMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {selectedActionCopy.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change No-Dues Status</DialogTitle>
            <DialogDescription>
              Update the workflow status directly.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={statusValue} onValueChange={(value) => setStatusValue(value as ReviewActionStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_CHANGE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                value={statusRemarks}
                onChange={(event) => setStatusRemarks(event.target.value)}
                rows={4}
                placeholder="Add remarks for the student or internal review notes..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleSubmitStatusChange()} disabled={reviewMutation.isPending}>
              {reviewMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit No-Dues Form</DialogTitle>
            <DialogDescription>
              Correct the student submitted details and submit the updated request for review.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Current Status</Label>
              <Select
                value={editForm.exit_reason}
                onValueChange={(value) => setEditForm((current) => ({ ...current, exit_reason: value as NoDuesExitReason }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select current status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EXIT_REASON_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {editForm.exit_reason === 'employment' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input value={editForm.company_name} onChange={(event) => setEditForm((current) => ({ ...current, company_name: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Designation</Label>
                  <Input value={editForm.designation} onChange={(event) => setEditForm((current) => ({ ...current, designation: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Package (LPA)</Label>
                  <Input type="number" min="0" step="0.1" value={editForm.package_lpa} onChange={(event) => setEditForm((current) => ({ ...current, package_lpa: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Joining Date</Label>
                  <Input type="date" value={editForm.joining_date} onChange={(event) => setEditForm((current) => ({ ...current, joining_date: event.target.value }))} />
                </div>
              </div>
            ) : null}

            {editForm.exit_reason === 'family_business' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Business Name</Label>
                  <Input value={editForm.business_name} onChange={(event) => setEditForm((current) => ({ ...current, business_name: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Nature of Business</Label>
                  <Input value={editForm.business_nature} onChange={(event) => setEditForm((current) => ({ ...current, business_nature: event.target.value }))} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Business Address</Label>
                  <Textarea rows={3} value={editForm.business_address} onChange={(event) => setEditForm((current) => ({ ...current, business_address: event.target.value }))} />
                </div>
              </div>
            ) : null}

            {editForm.exit_reason === 'higher_studies' ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Institution Name</Label>
                  <Input value={editForm.institution_name} onChange={(event) => setEditForm((current) => ({ ...current, institution_name: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Program Name</Label>
                  <Input value={editForm.program_name} onChange={(event) => setEditForm((current) => ({ ...current, program_name: event.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input value={editForm.country} onChange={(event) => setEditForm((current) => ({ ...current, country: event.target.value }))} />
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleSubmitEdit()} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save Form
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload No-Dues Eligibility</DialogTitle>
            <DialogDescription>
              Upload CSV or XLSX with an enrollment number column. Matching students will get the No Dues option enabled.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <Input
              type="file"
              accept=".csv,.xlsx"
              onChange={(event) => setEligibilityFile(event.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">
              Supported headers: enrollment_number, enrollment_no, enrolment_no. If there is no header, the first column is used.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleImportEligibility()} disabled={importEligibility.isPending}>
              {importEligibility.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Upload List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={singleEligibilityDialogOpen}
        onOpenChange={(open) => {
          setSingleEligibilityDialogOpen(open);
          if (!open) {
            setSingleEligibilityConfirmOpen(false);
            setSingleEnrollmentNumber('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable No-Dues for One Enrollment Number</DialogTitle>
            <DialogDescription>
              Enter a single enrollment number to enable the No Dues option without uploading a spreadsheet.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="single-enrollment-number">Enrollment Number</Label>
              <Input
                id="single-enrollment-number"
                value={singleEnrollmentNumber}
                onChange={(event) => setSingleEnrollmentNumber(event.target.value)}
                placeholder="SOU2023CS001"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              This will enable No Dues for the matched student immediately. Use the bulk upload for multiple enrollment numbers.
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSingleEligibilityDialogOpen(false)}
              disabled={enableEligibility.isPending}
            >
              Cancel
            </Button>
            <Button onClick={() => handlePrepareSingleEligibility()} disabled={enableEligibility.isPending}>
              <KeyRound className="mr-2 h-4 w-4" />
              Review &amp; Enable
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmActionDialog
        open={singleEligibilityConfirmOpen}
        onOpenChange={setSingleEligibilityConfirmOpen}
        title="Enable No-Dues Eligibility?"
        description={
          <span>
            This will enable No Dues for enrollment number{' '}
            <strong className="text-foreground">{singleEnrollmentNumber.trim() || '—'}</strong>.
          </span>
        }
        confirmLabel="Enable"
        isPending={enableEligibility.isPending}
        onConfirm={() => void handleEnableSingleEligibility()}
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
