import { useDeferredValue, useState } from 'react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EmptyState } from '@/components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHead } from '@/components/shared/SortableTableHead';
import { useServerSort } from '@/hooks/use-server-sort';
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  Loader2,
  Search,
  XCircle,
} from 'lucide-react';
import { OfferDetailSheet } from '@/components/offers/OfferDetailSheet';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import AdminListScopeFilters, { type DateRangeValue } from '@/components/admin/AdminListScopeFilters';
import { useAuth } from '@/contexts/AuthContext';
import { useOffers } from '@/hooks/use-offer-api';
import { usePostingTypeOptions } from '@/hooks/use-posting-type-options';
import { offerService } from '@/services/offerService';
import { getOfferCompensation, sortOffersByLatest } from '@/lib/offerModule';
import { downloadCsvTable, downloadExcelTable } from '@/lib/spreadsheetExport';
import {
  JOINING_STATUS_CONFIG,
  OFFER_STATUS_CONFIG,
  type OfferStatus,
} from '@/types/offer';

const FACULTY_OFFER_STATUS_OPTIONS: OfferStatus[] = [
  'pending_student_action',
  'accepted',
  'rejected_by_admin',
  'rejected_by_student',
];

export default function FacultyOffers() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearch = useDeferredValue(searchTerm);
  const [statusFilter, setStatusFilter] = useState<'all' | OfferStatus>('all');
  const [postingTypeFilter, setPostingTypeFilter] = useState('all');
  const [academicYearFilter, setAcademicYearFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRangeValue>({ from: undefined, to: undefined });
  const [isExporting, setIsExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const { sort_by, sort_order, onSort } = useServerSort<
    'student' | 'company' | 'role' | 'status' | 'joining' | 'offer_date'
  >('offer_date', 'desc', () => setPage(1));
  const { options: postingTypeOptions, isLoading: postingTypesLoading } = usePostingTypeOptions();

  const scopeParams = {
    posting_type_master_id: postingTypeFilter === 'all' ? undefined : postingTypeFilter,
    academic_year: academicYearFilter === 'all' ? undefined : academicYearFilter,
    date_from: dateRange.from ? dateRange.from.toISOString() : undefined,
    date_to: dateRange.to ? dateRange.to.toISOString() : undefined,
  };

  const offersQuery = useOffers({
    page,
    limit: 20,
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: deferredSearch || undefined,
    ...scopeParams,
    sort_by,
    sort_order,
  });
  const totalOffersQuery = useOffers({ page: 1, limit: 1 });
  // Counters stay department-wide (unfiltered) so they don't shift with the table filters.
  const statsQuery = useOffers({
    page: 1,
    limit: Math.max(totalOffersQuery.data?.pagination.total ?? 0, 1),
    sort_by: 'offer_date',
    sort_order: 'desc',
  });

  function openDetail(offerId: string) {
    setSelectedOfferId(offerId);
    setDetailSheetOpen(true);
  }

  const departmentOffers = sortOffersByLatest(offersQuery.data?.data ?? []);
  const statsSource = statsQuery.data?.data ?? [];
  const deptStats = {
    total: totalOffersQuery.data?.pagination.total ?? 0,
    accepted: statsSource.filter((offer) => offer.status === 'accepted').length,
    pending: statsSource.filter((offer) => offer.status === 'pending_student_action').length,
    rejected: statsSource.filter((offer) => offer.status === 'rejected_by_admin' || offer.status === 'rejected_by_student').length,
  };

  async function handleExport(exportFormat: 'csv' | 'excel') {
    setIsExporting(true);
    try {
      const result = await offerService.getOffers({
        ...scopeParams,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: deferredSearch || undefined,
        page: 1,
        limit: 1000,
        sort_by: 'offer_date',
        sort_order: 'desc',
      });
      const rows = (result.data ?? []).map((offer) => [
        offer.student.full_name,
        offer.student.enrollment_number,
        offer.student.institute ?? '',
        offer.student.course ?? '',
        offer.student.department,
        offer.student.current_semester ?? '',
        offer.posting.type,
        offer.company.name,
        offer.role,
        getOfferCompensation(offer),
        OFFER_STATUS_CONFIG[offer.status].label,
        JOINING_STATUS_CONFIG[offer.joining_status].label,
      ]);
      if (rows.length === 0) {
        toast.info('No offers match the current filters.');
        return;
      }
      const headers = ['Student Name', 'Enrollment No', 'Institute', 'Course', 'Branch', 'Semester', 'Posting Type', 'Company', 'Role', 'Stipend', 'Acceptance Status', 'Joining Status'];
      if (exportFormat === 'excel') {
        await downloadExcelTable(headers, rows, 'faculty_offers');
      } else {
        downloadCsvTable(headers, rows, 'faculty_offers');
      }
      toast.success(`Exported ${rows.length} offer(s).`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to export offers.');
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <DashboardLayout
      title="Offer & Joining Status"
      subtitle={`${user?.department || 'Faculty scope'} - read-only department offers`}
    >
      <div className="space-y-6">
        {(offersQuery.error || statsQuery.error || totalOffersQuery.error) && (
          <Card className="border-destructive/30">
            <CardContent className="flex items-start gap-3 p-4 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                {offersQuery.error instanceof Error
                  ? offersQuery.error.message
                  : statsQuery.error instanceof Error
                    ? statsQuery.error.message
                    : totalOffersQuery.error instanceof Error
                      ? totalOffersQuery.error.message
                      : 'Unable to load faculty offers right now.'}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Building2 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">
                  {totalOffersQuery.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : deptStats.total}
                </p>
                <p className="text-sm text-muted-foreground">Total Offers</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {statsQuery.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : deptStats.accepted}
                </p>
                <p className="text-sm text-muted-foreground">Accepted</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-2xl font-bold">
                  {statsQuery.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : deptStats.pending}
                </p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <XCircle className="h-5 w-5 text-red-600" />
              <div>
                <p className="text-2xl font-bold">
                  {statsQuery.isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : deptStats.rejected}
                </p>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search student, enrollment, company, or role..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as 'all' | OfferStatus);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {FACULTY_OFFER_STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>{OFFER_STATUS_CONFIG[status].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Offers filter by the posting-type master UUID — bind option.id. */}
            <Select value={postingTypeFilter} onValueChange={(value) => { setPostingTypeFilter(value); setPage(1); }} disabled={postingTypesLoading}>
              <SelectTrigger className="w-full sm:w-52"><SelectValue placeholder="Posting Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Posting Types</SelectItem>
                {postingTypeOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>{option.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" disabled={isExporting} onClick={() => handleExport('csv')}>
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Export CSV
            </Button>
            <Button variant="outline" disabled={isExporting} onClick={() => handleExport('excel')}>
              {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
              Export Excel
            </Button>
          </div>
          <AdminListScopeFilters
            academicYear={{ value: academicYearFilter, onChange: (value) => { setAcademicYearFilter(value); setPage(1); } }}
            dateRange={{ value: dateRange, onChange: (range) => { setDateRange(range); setPage(1); } }}
          />
        </div>

        <p className="text-sm text-muted-foreground">
          Showing {departmentOffers.length} of {offersQuery.data?.pagination.total ?? 0} offers
        </p>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {offersQuery.isLoading ? (
              <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading offers...
              </div>
            ) : departmentOffers.length === 0 ? (
              <EmptyState
                icon={Building2}
                title="No offers found"
                description="No department offers matched the current filters."
                className="py-16"
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead label="Student" columnKey="student" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <SortableTableHead label="Company" columnKey="company" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <SortableTableHead label="Role" columnKey="role" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <TableHead>CTC / Stipend</TableHead>
                      <SortableTableHead label="Status" columnKey="status" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <SortableTableHead label="Joining" columnKey="joining" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {departmentOffers.map((offer) => (
                      <TableRow key={offer.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{offer.student.full_name}</p>
                            <p className="text-xs text-muted-foreground">{offer.student.enrollment_number}</p>
                          </div>
                        </TableCell>
                        <TableCell>{offer.company.name}</TableCell>
                        <TableCell>{offer.role}</TableCell>
                        <TableCell>{getOfferCompensation(offer)}</TableCell>
                        <TableCell>
                          <Badge className={OFFER_STATUS_CONFIG[offer.status].color} variant="outline">
                            {OFFER_STATUS_CONFIG[offer.status].label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className={JOINING_STATUS_CONFIG[offer.joining_status].color} variant="outline">
                            {JOINING_STATUS_CONFIG[offer.joining_status].label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => openDetail(offer.id)} title="View offer details">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {(offersQuery.data?.pagination.totalPages ?? 1) > 1 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Page {offersQuery.data?.pagination.page} of {offersQuery.data?.pagination.totalPages}
            </p>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      if (page > 1) {
                        setPage((current) => current - 1);
                      }
                    }}
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      if (page < (offersQuery.data?.pagination.totalPages ?? 1)) {
                        setPage((current) => current + 1);
                      }
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

        {detailSheetOpen && (
          <OfferDetailSheet
            offerId={selectedOfferId}
            isOpen={detailSheetOpen}
            onClose={() => setDetailSheetOpen(false)}
            readOnly
          />
        )}
      </div>
    </DashboardLayout>
  );
}
