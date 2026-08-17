import { useDeferredValue, useState } from 'react';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Gift,
  Loader2,
  Lock,
  MapPin,
  Plus,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
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
import AdminListScopeFilters, { type DateRangeValue } from '@/components/admin/AdminListScopeFilters';
import { CreateOfferDialog } from '@/components/offers/CreateOfferDialog';
import { JoiningConfirmationDialog } from '@/components/offers/JoiningConfirmationDialog';
import { OfferDetailSheet } from '@/components/offers/OfferDetailSheet';
import { RejectOfferDialog } from '@/components/offers/RejectOfferDialog';
import { useCompanies } from '@/hooks/use-employer-api';
import { useOffers } from '@/hooks/use-offer-api';
import { usePostingTypeOptions } from '@/hooks/use-posting-type-options';
import { formatDate } from '@/lib/formatters';
import { formatPostingTypeLabel } from '@/lib/postingModule';
import { getOfferCompensation } from '@/lib/offerModule';
import {
  COMPLIANCE_STATUS_CONFIG,
  JOINING_STATUS_CONFIG,
  OFFER_STATUS_CONFIG,
  type OfferStatus,
} from '@/types/offer';
import { toast } from 'sonner';

function getErrorMessage(error: unknown, fallback = 'Something went wrong') {
  return error instanceof Error ? error.message : fallback;
}

function OffersManagementSkeleton() {
  return (
    <DashboardLayout
      title="Offer & Joining Management"
      subtitle="Loading live offer data"
    >
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <Card key={index}>
              <CardContent className="p-5">
                <Skeleton className="h-4 w-24 bg-muted" />
                <Skeleton className="mt-3 h-8 w-20 bg-muted" />
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

export default function OffersManagement() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OfferStatus>('all');
  const [postingTypeFilter, setPostingTypeFilter] = useState<string>('all');
  const { options: postingTypeOptions, isLoading: postingTypesLoading, isEmpty: postingTypesEmpty } = usePostingTypeOptions();
  const [companyFilter, setCompanyFilter] = useState('all');
  const [instituteFilter, setInstituteFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [academicYearFilter, setAcademicYearFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRangeValue>({ from: undefined, to: undefined });
  const [page, setPage] = useState(1);
  const { sort_by, sort_order, onSort } = useServerSort<
    'student' | 'company' | 'joining' | 'offer_date'
  >('offer_date', 'desc', () => setPage(1));

  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [joiningDialogOpen, setJoiningDialogOpen] = useState(false);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  const deferredSearch = useDeferredValue(searchTerm);

  const offersQuery = useOffers({
    page,
    limit: 20,
    status: statusFilter === 'all' ? undefined : statusFilter,
    posting_type_master_id: postingTypeFilter === 'all' ? undefined : postingTypeFilter,
    company_id: companyFilter === 'all' ? undefined : companyFilter,
    institute: instituteFilter || undefined,
    course: courseFilter || undefined,
    branch: branchFilter || undefined,
    semester: semesterFilter === 'all' ? undefined : semesterFilter,
    academic_year: academicYearFilter === 'all' ? undefined : academicYearFilter,
    date_from: dateRange.from ? dateRange.from.toISOString() : undefined,
    date_to: dateRange.to ? dateRange.to.toISOString() : undefined,
    // Server-side: searches every offer (role / company / student name / enrolment), not just the
    // rows already loaded on this page.
    search: deferredSearch.trim() || undefined,
    sort_by,
    sort_order,
  });

  const companiesQuery = useCompanies({
    page: 1,
    limit: 100,
    status: 'active',
  });

  const totalOffersQuery = useOffers({ page: 1, limit: 1 });
  const pendingOffersQuery = useOffers({ page: 1, limit: 1, status: 'pending_student_action' });
  const acceptedOffersQuery = useOffers({ page: 1, limit: 1, status: 'accepted' });
  const rejectedOffersQuery = useOffers({ page: 1, limit: 1, status: 'rejected_by_admin' });
  const rejectedByStudentOffersQuery = useOffers({ page: 1, limit: 1, status: 'rejected_by_student' });

  const companies = companiesQuery.data?.data ?? [];
  const offers = offersQuery.data?.data ?? [];

  // Search is applied by the backend now, so the rendered rows are exactly the current page.
  const filteredOffers = offers;
  const pagination = offersQuery.data?.pagination;
  const totalPages = pagination?.totalPages ?? 1;

  if (offersQuery.isLoading) {
    return <OffersManagementSkeleton />;
  }

  if (offersQuery.error) {
    return (
      <DashboardLayout
        title="Offer & Joining Management"
        subtitle="The live offer list could not be loaded"
      >
        <Alert variant="destructive">
          <Gift className="h-4 w-4" />
          <AlertTitle>Unable to load offers</AlertTitle>
          <AlertDescription>
            {getErrorMessage(offersQuery.error, 'Please refresh and try again.')}
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  function openDetail(offerId: string) {
    setSelectedOfferId(offerId);
    setDetailSheetOpen(true);
  }

  function openReject(offerId: string) {
    setSelectedOfferId(offerId);
    setRejectDialogOpen(true);
  }

  function openJoining(offerId: string) {
    setSelectedOfferId(offerId);
    setJoiningDialogOpen(true);
  }

  function handleExport() {
    const csvRows = filteredOffers.map((offer) => {
      const complianceLabel = COMPLIANCE_STATUS_CONFIG[offer.compliance_status].label;
      return [
        offer.student.full_name,
        offer.student.enrollment_number,
        offer.company.name,
        offer.posting.title,
        offer.role,
        getOfferCompensation(offer),
        offer.location || '-',
        formatDate(offer.offer_date),
        OFFER_STATUS_CONFIG[offer.status].label,
        JOINING_STATUS_CONFIG[offer.joining_status].label,
        complianceLabel,
        offer.applications_blocked ? 'Yes' : 'No',
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(',');
    });

    const csv = [
      'Student,Enrollment,Company,Posting,Role,Compensation,Location,Offer Date,Status,Joining,Compliance,Applications Blocked',
      ...csvRows,
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'offers_export.csv';
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success('The currently visible offer rows were exported.');
  }

  return (
    <DashboardLayout
      title="Offer & Joining Management"
      subtitle="Track live offers, joining confirmations, and compliance updates"
    >
      <div className="space-y-6">
        {companiesQuery.error && (
          <Alert>
            <Building2 className="h-4 w-4" />
            <AlertTitle>Company filters loaded partially</AlertTitle>
            <AlertDescription>
              {getErrorMessage(
                companiesQuery.error,
                'The offer table is live, but company filter options are unavailable right now.'
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <StatCard
            title="Total offers"
            value={String(totalOffersQuery.data?.pagination.total ?? 0)}
            hint="Across the full live offers module"
          />
          <StatCard
            title="Pending acceptance"
            value={String(pendingOffersQuery.data?.pagination.total ?? 0)}
            hint="Awaiting student action"
          />
          <StatCard
            title="Accepted"
            value={String(acceptedOffersQuery.data?.pagination.total ?? 0)}
            hint="Accepted by students"
          />
          <StatCard
            title="Rejected by admin"
            value={String(rejectedOffersQuery.data?.pagination.total ?? 0)}
            hint="Placement-office rejections"
          />
          <StatCard
            title="Rejected by student"
            value={String(rejectedByStudentOffersQuery.data?.pagination.total ?? 0)}
            hint="Declined by students"
          />
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle className="text-lg">Filters</CardTitle>
                <CardDescription>
                  Search runs across all offer records, not just the page on screen.
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={handleExport}>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Offer
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
                  placeholder="Search student, enrollment, company, or role..."
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value);
                    setPage(1);
                  }}
                />
              </div>

              <Select
                value={statusFilter}
                onValueChange={(value) => {
                  setStatusFilter(value as 'all' | OfferStatus);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full lg:w-56">
                  <SelectValue placeholder="Offer status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending_student_action">Pending acceptance</SelectItem>
                  <SelectItem value="accepted">Accepted</SelectItem>
                  <SelectItem value="rejected_by_admin">Rejected by admin</SelectItem>
                  <SelectItem value="rejected_by_student">Rejected by student</SelectItem>
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
                <SelectTrigger className="w-full lg:w-44">
                  <SelectValue placeholder="Posting Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Posting Types</SelectItem>
                  {postingTypesEmpty ? (
                    <SelectItem value="__empty__" disabled>
                      No posting types defined
                    </SelectItem>
                  ) : (
                    // Bind the master UUID: this filter is sent as `posting_type_master_id`, which the
                    // API validates as a uuid. Binding option.value 400s the whole list.
                    postingTypeOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>

              <Select
                value={companyFilter}
                onValueChange={(value) => {
                  setCompanyFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full lg:w-56">
                  <SelectValue placeholder="Company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All companies</SelectItem>
                  {companies.map((company) => (
                    <SelectItem key={company.id} value={company.id}>
                      {company.name}
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
            <CardTitle>Offer Records</CardTitle>
            <CardDescription>
              {pagination?.total
                ? `Showing ${filteredOffers.length} of ${pagination.total} offer(s).`
                : `${filteredOffers.length} offer(s).`}{' '}
              Joining and compliance changes can be updated from the detail drawer.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 md:p-6">
            {filteredOffers.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No offers found"
                description={
                  deferredSearch.trim()
                    ? `No offers match "${deferredSearch.trim()}" with the selected filters.`
                    : 'No offers match the selected filters.'
                }
                actionLabel={deferredSearch.trim() ? undefined : 'Create Offer'}
                onAction={deferredSearch.trim() ? undefined : () => setCreateDialogOpen(true)}
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead label="Student" columnKey="student" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <SortableTableHead label="Company & Role" columnKey="company" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <TableHead className="hidden md:table-cell">Compensation</TableHead>
                      <TableHead className="hidden lg:table-cell">Offer</TableHead>
                      <SortableTableHead label="Joining" columnKey="joining" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <TableHead className="hidden xl:table-cell">Compliance</TableHead>
                      <SortableTableHead label="Offer Date" columnKey="offer_date" className="hidden md:table-cell" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOffers.map((offer) => (
                      <TableRow
                        key={offer.id}
                        className="cursor-pointer hover:bg-accent/50"
                        onClick={() => openDetail(offer.id)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{offer.student.full_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {offer.student.enrollment_number}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{offer.company.name}</p>
                            <p className="text-xs text-muted-foreground">{offer.role}</p>
                            <p className="text-xs text-muted-foreground">{offer.posting.title}</p>
                            <Badge variant="secondary" className="mt-2 w-fit">
                              {formatPostingTypeLabel(offer.posting.type)}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="text-sm text-foreground">{getOfferCompensation(offer)}</div>
                          {offer.location && (
                            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {offer.location}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline" className={OFFER_STATUS_CONFIG[offer.status].color}>
                              {OFFER_STATUS_CONFIG[offer.status].label}
                            </Badge>
                            {offer.is_locked && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Lock className="h-3 w-3" />
                                Locked
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={JOINING_STATUS_CONFIG[offer.joining_status].color}>
                            {JOINING_STATUS_CONFIG[offer.joining_status].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant="outline"
                              className={COMPLIANCE_STATUS_CONFIG[offer.compliance_status].color}
                            >
                              {COMPLIANCE_STATUS_CONFIG[offer.compliance_status].label}
                            </Badge>
                            {offer.applications_blocked ? (
                              <span className="flex items-center gap-1 text-xs text-destructive">
                                <ShieldAlert className="h-3 w-3" />
                                Applications blocked
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <ShieldCheck className="h-3 w-3" />
                                Applications open
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDate(offer.offer_date)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div
                            className="flex items-center justify-end gap-2"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <Button variant="ghost" size="sm" onClick={() => openDetail(offer.id)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            {offer.status === 'pending_student_action' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive"
                                onClick={() => openReject(offer.id)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            )}
                            {offer.status === 'accepted' && offer.joining_status === 'pending' && (
                              <Button variant="outline" size="sm" onClick={() => openJoining(offer.id)}>
                                <UserCheck className="mr-2 h-4 w-4" />
                                Joining
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

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-border px-6 py-4 text-sm">
                <span className="text-muted-foreground">
                  Page {pagination?.page ?? page} of {totalPages}
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
                    disabled={page >= totalPages}
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

      {createDialogOpen && (
        <CreateOfferDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} />
      )}
      {rejectDialogOpen && (
        <RejectOfferDialog
          open={rejectDialogOpen}
          onOpenChange={setRejectDialogOpen}
          offerId={selectedOfferId}
        />
      )}
      {joiningDialogOpen && (
        <JoiningConfirmationDialog
          open={joiningDialogOpen}
          onOpenChange={setJoiningDialogOpen}
          offerId={selectedOfferId}
        />
      )}
      {detailSheetOpen && (
        <OfferDetailSheet
          offerId={selectedOfferId}
          isOpen={detailSheetOpen}
          onClose={() => setDetailSheetOpen(false)}
          onReject={openReject}
          onUpdateJoining={openJoining}
        />
      )}
    </DashboardLayout>
  );
}
