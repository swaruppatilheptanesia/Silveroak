import { useDeferredValue, useState } from 'react';
import { format } from 'date-fns';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  FileCheck,
  GraduationCap,
  IndianRupee,
  Loader2,
  Search,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AdminStudentDetailsDialog } from '@/components/admin/AdminStudentDetailsDialog';
import { InternshipDetailSheet } from '@/components/internships/InternshipDetailSheet';
import { EmptyState } from '@/components/shared/EmptyState';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHead } from '@/components/shared/SortableTableHead';
import { useServerSort } from '@/hooks/use-server-sort';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useInternships, useUpdateInternship } from '@/hooks/use-internship-api';
import { useMasterValues } from '@/hooks/use-master-api';
import { usePostingTypeOptions } from '@/hooks/use-posting-type-options';
import { formatPostingTypeLabel } from '@/lib/postingModule';
import {
  getInternshipBatch,
  getInternshipDaysRemaining,
  getInternshipDepartment,
  getInternshipEnrollmentNumber,
  getInternshipStudentName,
} from '@/lib/internshipModule';
import {
  INTERNSHIP_STATUS_CONFIG,
  INTERNSHIP_TYPE_CONFIG,
  type ApiInternshipListItem,
  type InternshipStatus,
  type InternshipType,
} from '@/types/internship';

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

export default function InternshipsManagement() {
  const [activeTab, setActiveTab] = useState<'all' | InternshipStatus | 'issues'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [postingTypeFilter, setPostingTypeFilter] = useState<string>('all');
  const { options: postingTypeOptions, isLoading: postingTypesLoading, isEmpty: postingTypesEmpty } = usePostingTypeOptions();
  const [typeFilter, setTypeFilter] = useState<'all' | InternshipType>('all');
  const [page, setPage] = useState(1);
  const { sort_by, sort_order, onSort } = useServerSort<
    'student' | 'company' | 'status' | 'start_date' | 'created_at'
  >('created_at', 'desc', () => setPage(1));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailInternshipId, setDetailInternshipId] = useState<string | null>(null);
  const [studentDetailsId, setStudentDetailsId] = useState<string | null>(null);
  const [bulkAction, setBulkAction] = useState<'completed' | 'discontinued' | null>(null);
  const deferredSearch = useDeferredValue(searchTerm);
  const updateInternship = useUpdateInternship();
  const branchMasterValues = useMasterValues('branch');
  const departmentOptions = [
    { value: 'all', label: 'All departments' },
    ...(branchMasterValues.data ?? []).map((department) => ({ value: department, label: department })),
  ];

  const internshipsQuery = useInternships({
    page,
    limit: 20,
    sort_by,
    sort_order,
    search: deferredSearch || undefined,
    status: activeTab !== 'all' && activeTab !== 'issues' ? activeTab : undefined,
    department: departmentFilter === 'all' ? undefined : departmentFilter,
    posting_type_master_id: postingTypeFilter === 'all' ? undefined : postingTypeFilter,
    internship_type: typeFilter === 'all' ? undefined : typeFilter,
    has_open_issues: activeTab === 'issues' ? true : undefined,
  });

  const totalQuery = useInternships({ page: 1, limit: 1 });
  const ongoingQuery = useInternships({ page: 1, limit: 1, status: 'ongoing' });
  const completedQuery = useInternships({ page: 1, limit: 1, status: 'completed' });
  const discontinuedQuery = useInternships({ page: 1, limit: 1, status: 'discontinued' });
  const issueQuery = useInternships({ page: 1, limit: 1, has_open_issues: true });
  const stipendQuery = useInternships({ page: 1, limit: 1, is_receiving_stipend: true });
  const certificatePendingQuery = useInternships({ page: 1, limit: 1, certificate_pending: true });

  const internships = internshipsQuery.data?.data ?? [];
  const selectableInternships = internships.filter(
    (internship) => internship.status !== 'completed' && internship.status !== 'discontinued'
  );
  const allSelected = selectableInternships.length > 0
    && selectableInternships.every((internship) => selectedIds.has(internship.id));

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }

    setSelectedIds(new Set(selectableInternships.map((internship) => internship.id)));
  };

  const handleToggleOne = (internshipId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(internshipId)) next.delete(internshipId);
      else next.add(internshipId);
      return next;
    });
  };

  const handleBulkConfirm = async () => {
    if (!bulkAction || selectedIds.size === 0) return;

    let successCount = 0;
    let failureCount = 0;

    for (const internshipId of selectedIds) {
      try {
        await updateInternship.mutateAsync({
          internshipId,
          data: { status: bulkAction },
        });
        successCount += 1;
      } catch {
        failureCount += 1;
      }
    }

    if (successCount > 0) {
      toast.success(`Updated ${successCount} internship record${successCount === 1 ? '' : 's'}.`);
    }
    if (failureCount > 0) {
      toast.error(`${failureCount} record${failureCount === 1 ? '' : 's'} could not be updated.`);
    }

    setSelectedIds(new Set());
    setBulkAction(null);
  };

  return (
    <DashboardLayout
      title="Placement Cell Programs"
      subtitle="Track internship records, status changes, stipend visibility, and issue resolution"
    >
      <div className="space-y-6">
        {internshipsQuery.error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Unable to load internships</AlertTitle>
            <AlertDescription>
              {getErrorMessage(internshipsQuery.error, 'Please refresh and try again.')}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-7">
          <StatCard title="Total" value={String(totalQuery.data?.pagination.total ?? 0)} hint="All internship records" />
          <StatCard title="Ongoing" value={String(ongoingQuery.data?.pagination.total ?? 0)} hint="Currently active" />
          <StatCard title="Completed" value={String(completedQuery.data?.pagination.total ?? 0)} hint="Closed successfully" />
          <StatCard title="Discontinued" value={String(discontinuedQuery.data?.pagination.total ?? 0)} hint="Ended early" />
          <StatCard title="Open Issues" value={String(issueQuery.data?.pagination.total ?? 0)} hint="Need follow-up" />
          <StatCard title="Receiving Stipend" value={String(stipendQuery.data?.pagination.total ?? 0)} hint="Live stipend flag" />
          <StatCard title="Certificate Pending" value={String(certificatePendingQuery.data?.pagination.total ?? 0)} hint="No completion proof yet" />
        </div>

        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value as 'all' | InternshipStatus | 'issues');
            setPage(1);
            setSelectedIds(new Set());
          }}
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="ongoing">Ongoing</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="discontinued">Discontinued</TabsTrigger>
            <TabsTrigger value="issues">Open Issues</TabsTrigger>
          </TabsList>
        </Tabs>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
            <CardDescription>
              Use search and filters to narrow the internship records shown below.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 xl:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search by student, enrollment, company, or role..."
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                }}
              />
            </div>

            <Select
              value={departmentFilter}
              onValueChange={(value) => {
                setDepartmentFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full xl:w-52">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                {departmentOptions.map((department) => (
                  <SelectItem key={department.value} value={department.value}>
                    {department.label}
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
              <SelectTrigger className="w-full xl:w-48">
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

            <Select
              value={typeFilter}
              onValueChange={(value) => {
                setTypeFilter(value as 'all' | InternshipType);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full xl:w-48">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {Object.entries(INTERNSHIP_TYPE_CONFIG).map(([type, config]) => (
                  <SelectItem key={type} value={type}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedIds.size > 0 && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex flex-col gap-3 p-4 lg:flex-row lg:items-center">
              <div className="text-sm font-medium">{selectedIds.size} internship record(s) selected</div>
              <div className="flex-1" />
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => setBulkAction('completed')}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Mark completed
                </Button>
                <Button variant="outline" size="sm" onClick={() => setBulkAction('discontinued')}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Mark discontinued
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                  Clear
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-0">
            {internshipsQuery.isLoading ? (
              <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading internship records...
              </div>
            ) : internships.length === 0 ? (
              <EmptyState
                icon={GraduationCap}
                title="No internships found"
                description="Try broadening your filters or checking another status tab."
                className="py-16"
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox checked={allSelected} onCheckedChange={handleToggleAll} />
                      </TableHead>
                      <SortableTableHead label="Student" columnKey="student" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <SortableTableHead label="Company & Role" columnKey="company" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <TableHead>Type</TableHead>
                      <SortableTableHead label="Duration" columnKey="start_date" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <TableHead>Stipend</TableHead>
                      <SortableTableHead label="Status" columnKey="status" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <TableHead>Issues</TableHead>
                      <TableHead>Certificate</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {internships.map((internship) => {
                      const selectable = internship.status !== 'completed' && internship.status !== 'discontinued';
                      const daysRemaining = getInternshipDaysRemaining(internship);

                      return (
                        <TableRow key={internship.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(internship.id)}
                              onCheckedChange={() => handleToggleOne(internship.id)}
                              disabled={!selectable}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">{getInternshipStudentName(internship)}</p>
                              <p className="text-xs text-muted-foreground">
                                {getInternshipEnrollmentNumber(internship)} • {getInternshipDepartment(internship)}
                              </p>
                              <p className="text-xs text-muted-foreground">Batch {getInternshipBatch(internship)}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium text-foreground">{internship.company_name}</p>
                              <p className="text-xs text-muted-foreground">{internship.role}</p>
                              {internship.posting_type ? (
                                <Badge variant="secondary" className="mt-2 w-fit">
                                  {formatPostingTypeLabel(internship.posting_type)}
                                </Badge>
                              ) : (
                                <p className="mt-2 text-xs text-muted-foreground">No linked posting type</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge className={INTERNSHIP_TYPE_CONFIG[internship.internship_type].color} variant="outline">
                              {INTERNSHIP_TYPE_CONFIG[internship.internship_type].label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{format(new Date(internship.start_date), 'dd MMM yyyy')}</p>
                              <p className="text-xs text-muted-foreground">
                                {internship.end_date ? `to ${format(new Date(internship.end_date), 'dd MMM yyyy')}` : 'End date not set'}
                              </p>
                              {daysRemaining !== null && (
                                <p className="text-xs text-muted-foreground">
                                  {daysRemaining > 0 ? `${daysRemaining} days left` : 'Ended'}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {internship.is_receiving_stipend && internship.stipend_amount !== null ? (
                              <div className="text-sm">
                                <p className="font-medium text-foreground flex items-center gap-1">
                                  <IndianRupee className="h-3.5 w-3.5" />
                                  {internship.stipend_amount.toLocaleString('en-IN')}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {internship.stipend_frequency ? internship.stipend_frequency.replace('_', ' ') : 'Stipend'}
                                </p>
                              </div>
                            ) : internship.internship_type === 'unpaid' ? (
                              <span className="text-xs text-muted-foreground">Unpaid</span>
                            ) : (
                              <span className="text-xs text-muted-foreground">Not receiving</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge className={INTERNSHIP_STATUS_CONFIG[internship.status].color} variant="outline">
                              {INTERNSHIP_STATUS_CONFIG[internship.status].label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {internship.open_issue_count > 0 ? (
                              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20" variant="outline">
                                {internship.open_issue_count} open
                              </Badge>
                            ) : (
                              <span className="text-xs text-muted-foreground">None</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {internship.certificate_uploaded ? (
                              <FileCheck className="h-4 w-4 text-green-600" />
                            ) : (
                              <Clock className="h-4 w-4 text-amber-600" />
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => setDetailInternshipId(internship.id)}>
                                <Eye className="mr-2 h-4 w-4" />
                                Review
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => setStudentDetailsId(internship.student.id)}>
                                Student
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {(internshipsQuery.data?.pagination.totalPages ?? 1) > 1 && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Page {internshipsQuery.data?.pagination.page} of {internshipsQuery.data?.pagination.totalPages}
            </p>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      if (page > 1) setPage((current) => current - 1);
                    }}
                  />
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    href="#"
                    onClick={(event) => {
                      event.preventDefault();
                      if (page < (internshipsQuery.data?.pagination.totalPages ?? 1)) {
                        setPage((current) => current + 1);
                      }
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        )}

        <InternshipDetailSheet
          internshipId={detailInternshipId}
          open={Boolean(detailInternshipId)}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setDetailInternshipId(null);
          }}
          canManageStatus
          canCreateIssues
          canResolveIssues
        />

        <AdminStudentDetailsDialog
          studentId={studentDetailsId}
          open={Boolean(studentDetailsId)}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) setStudentDetailsId(null);
          }}
        />

        <AlertDialog open={bulkAction !== null} onOpenChange={() => setBulkAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {bulkAction === 'completed' ? 'Mark internships as completed' : 'Mark internships as discontinued'}
              </AlertDialogTitle>
              <AlertDialogDescription>
                This will update {selectedIds.size} selected internship record(s).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => void handleBulkConfirm()} disabled={updateInternship.isPending}>
                Confirm
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}
