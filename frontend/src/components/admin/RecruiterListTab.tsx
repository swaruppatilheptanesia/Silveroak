import { useDeferredValue, useState } from 'react';
import {
  Building2,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  FileSpreadsheet,
  Loader2,
  Mail,
  Phone,
  Search,
  ShieldCheck,
  ShieldX,
  Users,
  XCircle,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import EditRecruiterDialog from '@/components/employer/EditRecruiterDialog';
import { useRecruiters, useVerifyRecruiter } from '@/hooks/use-employer-api';
import { employerService } from '@/services/employerService';
import {
  formatRecruiterPhone,
  getRecruiterInitials,
  getRecruiterVerificationLabel,
} from '@/lib/employerModule';
import { formatDate } from '@/lib/formatters';
import { downloadCsvTable, downloadExcelTable } from '@/lib/spreadsheetExport';
import { useToast } from '@/hooks/use-toast';
import type { ApiRecruiterListItem } from '@/types/employer';

const PAGE_SIZE = 20;

function getErrorMessage(error: unknown, fallback = 'Something went wrong.') {
  return error instanceof Error ? error.message : fallback;
}

function getStatusBadge(status: ApiRecruiterListItem['verification_status']) {
  if (status === 'verified') {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <CheckCircle className="mr-1 h-3 w-3" />
        {getRecruiterVerificationLabel(status)}
      </Badge>
    );
  }

  if (status === 'pending') {
    return (
      <Badge variant="outline" className="border-yellow-600 text-yellow-600">
        <Clock className="mr-1 h-3 w-3" />
        {getRecruiterVerificationLabel(status)}
      </Badge>
    );
  }

  return (
    <Badge variant="destructive">
      <XCircle className="mr-1 h-3 w-3" />
      {getRecruiterVerificationLabel(status)}
    </Badge>
  );
}

function RecruiterListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        {[0, 1, 2].map((index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24 bg-muted" />
              <Skeleton className="mt-3 h-8 w-16 bg-muted" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-10 w-full bg-muted" />
        </CardContent>
      </Card>
    </div>
  );
}

export default function RecruiterListTab() {
  const { toast } = useToast();
  const verifyRecruiter = useVerifyRecruiter();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const { sort_by, sort_order, onSort } = useServerSort<
    'name' | 'company' | 'email' | 'verification_status' | 'created_at'
  >('created_at', 'desc', () => setPage(1));
  const [selectedRecruiter, setSelectedRecruiter] = useState<ApiRecruiterListItem | null>(null);
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const deferredSearch = useDeferredValue(searchTerm);

  const recruitersQuery = useRecruiters({
    page,
    limit: PAGE_SIZE,
    search: deferredSearch || undefined,
    verification_status: statusFilter === 'all'
      ? undefined
      : (statusFilter as ApiRecruiterListItem['verification_status']),
    sort_by,
    sort_order,
  });

  const totalQuery = useRecruiters({ page: 1, limit: 1 });
  const verifiedQuery = useRecruiters({ page: 1, limit: 1, verification_status: 'verified' });
  const pendingQuery = useRecruiters({ page: 1, limit: 1, verification_status: 'pending' });
  const rejectedQuery = useRecruiters({ page: 1, limit: 1, verification_status: 'rejected' });

  const recruiters = recruitersQuery.data?.data ?? [];
  const pagination = recruitersQuery.data?.pagination;
  const stats = {
    total: totalQuery.data?.pagination.total ?? 0,
    verified: verifiedQuery.data?.pagination.total ?? 0,
    pending: pendingQuery.data?.pagination.total ?? 0,
    rejected: rejectedQuery.data?.pagination.total ?? 0,
  };

  async function handleExport(exportFormat: 'csv' | 'excel') {
    setIsExporting(true);
    try {
      const acc: ApiRecruiterListItem[] = [];
      const limit = 100;
      for (let currentPage = 1; ; currentPage += 1) {
        const res = await employerService.getRecruiters({
          page: currentPage,
          limit,
          search: deferredSearch || undefined,
          verification_status: statusFilter === 'all' ? undefined : (statusFilter as ApiRecruiterListItem['verification_status']),
          sort_by: 'created_at',
          sort_order: 'desc',
        });
        acc.push(...res.data);
        const total = res.pagination?.total ?? acc.length;
        if (res.data.length === 0 || currentPage >= Math.max(1, Math.ceil(total / limit))) break;
      }

      if (acc.length === 0) {
        toast({ title: 'Nothing to export', description: 'No recruiters match the current filters.' });
        return;
      }

      const headers = ['Recruiter Name', 'Email', 'Contact', 'Designation', 'Company', 'Status', 'Added On'];
      const rows = acc.map((recruiter) => [
        recruiter.name,
        recruiter.email,
        recruiter.phone ?? '',
        recruiter.designation ?? '',
        recruiter.company.name,
        getRecruiterVerificationLabel(recruiter.verification_status),
        formatDate(recruiter.created_at),
      ]);

      if (exportFormat === 'excel') {
        await downloadExcelTable(headers, rows, 'recruiters_export');
      } else {
        downloadCsvTable(headers, rows, 'recruiters_export');
      }
      toast({ title: 'Export ready', description: `Exported ${rows.length} recruiter(s).` });
    } catch (error) {
      toast({ title: 'Unable to export recruiters', description: getErrorMessage(error), variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  }

  async function handleVerificationAction(status: 'verified' | 'rejected') {
    if (!selectedRecruiter) return;

    try {
      await verifyRecruiter.mutateAsync({
        recruiterId: selectedRecruiter.id,
        data: { status },
      });

      toast({
        title: status === 'verified' ? 'Recruiter verified' : 'Recruiter rejected',
        description: `${selectedRecruiter.name} has been marked as ${status}.`,
      });
      setVerifyDialogOpen(false);
      setSelectedRecruiter(null);
    } catch (error) {
      toast({
        title: 'Unable to update recruiter',
        description: getErrorMessage(error, 'Please try again.'),
        variant: 'destructive',
      });
    }
  }

  if (recruitersQuery.isLoading && !recruitersQuery.data) {
    return <RecruiterListSkeleton />;
  }

  return (
    <>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" disabled={isExporting} onClick={() => handleExport('csv')}>
          {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Export CSV
        </Button>
        <Button variant="outline" disabled={isExporting} onClick={() => handleExport('excel')}>
          {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
          Export Excel
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Recruiters</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900">
                <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.verified}</p>
                <p className="text-sm text-muted-foreground">Verified</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-yellow-100 p-2 dark:bg-yellow-900">
                <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">Pending Verification</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900">
                <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.rejected}</p>
                <p className="text-sm text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search recruiter, email, or company..."
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Verification Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {recruitersQuery.error ? (
        <Alert variant="destructive">
          <Users className="h-4 w-4" />
          <AlertTitle>Unable to load recruiters</AlertTitle>
          <AlertDescription>{getErrorMessage(recruitersQuery.error)}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Recruiters ({pagination?.total ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recruiters.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium">No recruiters found</h3>
              <p className="mt-1 text-muted-foreground">Try adjusting your filters or add recruiters from a company detail page.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead label="Recruiter" columnKey="name" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                  <SortableTableHead label="Company" columnKey="company" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                  <SortableTableHead label="Contact" columnKey="email" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                  <SortableTableHead label="Status" columnKey="verification_status" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recruiters.map((recruiter) => (
                  <TableRow key={recruiter.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                          <span className="text-sm font-medium text-primary">
                            {getRecruiterInitials(recruiter.name)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{recruiter.name}</p>
                          <p className="text-sm text-muted-foreground">{recruiter.designation || 'No designation'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {recruiter.company.name}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          {recruiter.email}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          {formatRecruiterPhone(recruiter.phone)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(recruiter.verification_status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedRecruiter(recruiter);
                            setEditDialogOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant={recruiter.verification_status === 'verified' ? 'outline' : 'default'}
                          onClick={() => {
                            setSelectedRecruiter(recruiter);
                            setVerifyDialogOpen(true);
                          }}
                        >
                          {recruiter.verification_status === 'pending' ? 'Verify' : 'Review'}
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

      {pagination && pagination.totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPage((current) => current - 1)} disabled={page <= 1}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((current) => current + 1)}
              disabled={page >= pagination.totalPages}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : null}

      <Dialog open={verifyDialogOpen} onOpenChange={setVerifyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recruiter Verification</DialogTitle>
            <DialogDescription>Review the recruiter status for this live company contact.</DialogDescription>
          </DialogHeader>
          {selectedRecruiter ? (
            <div className="space-y-4">
              <div className="space-y-2 rounded-lg bg-muted p-4 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium">{selectedRecruiter.name}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Email</span>
                  <span>{selectedRecruiter.email}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Company</span>
                  <span>{selectedRecruiter.company.name}</span>
                </div>
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground">Current Status</span>
                  {getStatusBadge(selectedRecruiter.verification_status)}
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="destructive"
              onClick={() => handleVerificationAction('rejected')}
              disabled={verifyRecruiter.isPending}
            >
              {verifyRecruiter.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldX className="mr-2 h-4 w-4" />}
              Reject
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setVerifyDialogOpen(false)} disabled={verifyRecruiter.isPending}>
                Cancel
              </Button>
              <Button onClick={() => handleVerificationAction('verified')} disabled={verifyRecruiter.isPending}>
                <ShieldCheck className="mr-2 h-4 w-4" />
                Verify
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditRecruiterDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        recruiter={selectedRecruiter}
      />
    </>
  );
}
