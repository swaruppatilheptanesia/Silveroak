import { useDeferredValue, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ban,
  Building,
  Building2,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit,
  Eye,
  FileSpreadsheet,
  Loader2,
  MoreHorizontal,
  Plus,
  Search,
  Star,
  Upload,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { useCompanies, useImportCompanies } from '@/hooks/use-employer-api';
import { employerService } from '@/services/employerService';
import {
  getCompanyClassificationLabel,
  getCompanyCreatedLabel,
} from '@/lib/employerModule';
import { formatDate } from '@/lib/formatters';
import { downloadCsvTable, downloadExcelTable } from '@/lib/spreadsheetExport';
import AdminListScopeFilters, { type DateRangeValue } from '@/components/admin/AdminListScopeFilters';
import type { ApiCompany, ApiRecruiterListItem } from '@/types/employer';
import AddCompanyDialog from '@/components/employer/AddCompanyDialog';
import CompanyTagDialog from '@/components/employer/CompanyTagDialog';
import EditCompanyDialog from '@/components/employer/EditCompanyDialog';
import { toast } from 'sonner';
import { formatApiErrorMessage } from '@/lib/apiError';

const PAGE_SIZE = 20;

function getErrorMessage(error: unknown, fallback = 'Something went wrong.') {
  return error instanceof Error ? error.message : fallback;
}

function getClassificationBadge(classification: ApiCompany['classification']) {
  if (classification === 'preferred') {
    return (
      <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
        <Star className="mr-1 h-3 w-3" />
        {getCompanyClassificationLabel(classification)}
      </Badge>
    );
  }

  if (classification === 'blacklisted') {
    return (
      <Badge variant="destructive">
        <Ban className="mr-1 h-3 w-3" />
        {getCompanyClassificationLabel(classification)}
      </Badge>
    );
  }

  return <Badge variant="secondary">{getCompanyClassificationLabel(classification)}</Badge>;
}

function getStatusBadge(status: ApiCompany['status']) {
  if (status === 'active') {
    return (
      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
        <CheckCircle className="mr-1 h-3 w-3" />
        Active
      </Badge>
    );
  }

  return (
    <Badge variant="outline">
      <XCircle className="mr-1 h-3 w-3" />
      Inactive
    </Badge>
  );
}

function CompanyListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
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

export default function CompanyListTab() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [classificationFilter, setClassificationFilter] = useState<string>('all');
  const [industryFilter, setIndustryFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRangeValue>({ from: undefined, to: undefined });
  const [isExporting, setIsExporting] = useState(false);
  const [page, setPage] = useState(1);
  const { sort_by, sort_order, onSort } = useServerSort<
    'name' | 'industry' | 'status' | 'classification' | 'created_at'
  >('created_at', 'desc', () => setPage(1));
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<ApiCompany | null>(null);
  const deferredSearch = useDeferredValue(searchTerm);
  const importCompanies = useImportCompanies();

  const companiesQuery = useCompanies({
    page,
    limit: PAGE_SIZE,
    search: deferredSearch || undefined,
    status: statusFilter === 'all' ? undefined : (statusFilter as ApiCompany['status']),
    classification: classificationFilter === 'all'
      ? undefined
      : (classificationFilter as ApiCompany['classification']),
    industry: industryFilter === 'all' ? undefined : industryFilter,
    date_from: dateRange.from ? dateRange.from.toISOString() : undefined,
    date_to: dateRange.to ? dateRange.to.toISOString() : undefined,
    sort_by,
    sort_order,
  });

  const totalQuery = useCompanies({ page: 1, limit: 1 });
  const activeQuery = useCompanies({ page: 1, limit: 1, status: 'active' });
  const inactiveQuery = useCompanies({ page: 1, limit: 1, status: 'inactive' });
  const preferredQuery = useCompanies({ page: 1, limit: 1, classification: 'preferred' });
  const blacklistedQuery = useCompanies({ page: 1, limit: 1, classification: 'blacklisted' });
  // Source for the Industry dropdown — distinct industries across the company list.
  const industrySourceQuery = useCompanies({ page: 1, limit: 100, sort_by: 'name', sort_order: 'asc' });

  const companies = companiesQuery.data?.data ?? [];
  const pagination = companiesQuery.data?.pagination;
  const industryOptions = useMemo(() => {
    const seen = new Set<string>();
    (industrySourceQuery.data?.data ?? []).forEach((company) => {
      const value = company.industry?.trim();
      if (value) seen.add(value);
    });
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  }, [industrySourceQuery.data]);
  const stats = {
    total: totalQuery.data?.pagination.total ?? 0,
    active: activeQuery.data?.pagination.total ?? 0,
    inactive: inactiveQuery.data?.pagination.total ?? 0,
    preferred: preferredQuery.data?.pagination.total ?? 0,
    blacklisted: blacklistedQuery.data?.pagination.total ?? 0,
  };

  async function collectAll<T>(fetcher: (page: number) => Promise<{ data: T[]; pagination: { total: number } }>): Promise<T[]> {
    const acc: T[] = [];
    const limit = 100;
    for (let currentPage = 1; ; currentPage += 1) {
      const res = await fetcher(currentPage);
      acc.push(...res.data);
      const total = res.pagination?.total ?? acc.length;
      if (res.data.length === 0 || currentPage >= Math.max(1, Math.ceil(total / limit))) break;
    }
    return acc;
  }

  async function handleExport(exportFormat: 'csv' | 'excel') {
    setIsExporting(true);
    try {
      // One row per recruiter (companies with no recruiter still get a row). Honour the active filters
      // on the company set; recruiters are joined in by company_id.
      const [allCompanies, allRecruiters] = await Promise.all([
        collectAll<ApiCompany>((p) => employerService.getCompanies({
          page: p,
          limit: 100,
          search: deferredSearch || undefined,
          status: statusFilter === 'all' ? undefined : (statusFilter as ApiCompany['status']),
          classification: classificationFilter === 'all' ? undefined : (classificationFilter as ApiCompany['classification']),
          industry: industryFilter === 'all' ? undefined : industryFilter,
          date_from: dateRange.from ? dateRange.from.toISOString() : undefined,
          date_to: dateRange.to ? dateRange.to.toISOString() : undefined,
          sort_by: 'name',
          sort_order: 'asc',
        })),
        collectAll<ApiRecruiterListItem>((p) => employerService.getRecruiters({ page: p, limit: 100, sort_by: 'created_at', sort_order: 'desc' })),
      ]);

      const recruitersByCompany = new Map<string, ApiRecruiterListItem[]>();
      allRecruiters.forEach((recruiter) => {
        const list = recruitersByCompany.get(recruiter.company_id) ?? [];
        list.push(recruiter);
        recruitersByCompany.set(recruiter.company_id, list);
      });

      const headers = [
        'Company', 'Industry', 'Address', 'Website', 'Recruiter Name', 'Recruiter Email',
        'Recruiter Contact', 'Recruiter Designation', 'Classification', 'Status', 'Added On',
      ];
      const rows: (string | number | null)[][] = [];
      allCompanies.forEach((company) => {
        const base = [company.name, company.industry ?? '', company.address ?? '', company.website ?? ''];
        const tail = [getCompanyClassificationLabel(company.classification), company.status, formatDate(company.created_at)];
        const recruiters = recruitersByCompany.get(company.id) ?? [];
        if (recruiters.length === 0) {
          rows.push([...base, '', '', '', '', ...tail]);
        } else {
          recruiters.forEach((recruiter) => {
            rows.push([...base, recruiter.name, recruiter.email, recruiter.phone ?? '', recruiter.designation ?? '', ...tail]);
          });
        }
      });

      if (rows.length === 0) {
        toast.error('No companies match the current filters.');
        return;
      }
      if (exportFormat === 'excel') {
        await downloadExcelTable(headers, rows, 'employers_export');
      } else {
        downloadCsvTable(headers, rows, 'employers_export');
      }
      toast.success(`Exported ${rows.length} row(s) across ${allCompanies.length} company(ies).`);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to export companies.'));
    } finally {
      setIsExporting(false);
    }
  }

  const handleDownloadTemplate = () => {
    const csv = [
      'name,industry,website,address,description,recruiter_name,recruiter_email,recruiter_phone,recruiter_designation',
      'Sample Company,Information Technology,https://sample.com,"Ahmedabad, Gujarat","Sample company for bulk import",Priya Shah,priya.shah@sample.com,+91 9876543210,Talent Acquisition Executive',
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'company_import_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportCompanies = async () => {
    if (!importFile) {
      toast.error('Please select a CSV or XLSX file.');
      return;
    }

    try {
      const result = await importCompanies.mutateAsync(importFile);
      const recruiterCount = result.created_recruiter_count ?? 0;

      toast.success(
        recruiterCount > 0
          ? `Imported ${result.created_count} company record(s) and ${recruiterCount} recruiter(s).`
          : `Imported ${result.created_count} company record(s).`
      );

      const skippedCompanyRows = result.skipped_duplicate_count + result.skipped_invalid_row_count;
      const skippedRecruiterRows = (result.skipped_duplicate_recruiter_count ?? 0)
        + (result.skipped_invalid_recruiter_row_count ?? 0);

      if (skippedCompanyRows > 0 || skippedRecruiterRows > 0) {
        toast.error(
          skippedRecruiterRows > 0
            ? `${skippedCompanyRows} company row(s) and ${skippedRecruiterRows} recruiter row(s) were skipped.`
            : `${skippedCompanyRows} row(s) were skipped.`
        );
      }

      setImportFile(null);
      setImportDialogOpen(false);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to import companies.'));
    }
  };

  if (companiesQuery.isLoading && !companiesQuery.data) {
    return <CompanyListSkeleton />;
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
        <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Bulk Upload
        </Button>
        <Button onClick={() => setAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New Company
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-primary/10 p-2">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Companies</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
                <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.active}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-muted p-2">
                <XCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inactive}</p>
                <p className="text-sm text-muted-foreground">Inactive</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900">
                <Star className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.preferred}</p>
                <p className="text-sm text-muted-foreground">Preferred</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-red-100 p-2 dark:bg-red-900">
                <Ban className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.blacklisted}</p>
                <p className="text-sm text-muted-foreground">Blacklisted</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative min-w-[220px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search company name..."
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
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={classificationFilter}
              onValueChange={(value) => {
                setClassificationFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Classification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classifications</SelectItem>
                <SelectItem value="preferred">Preferred</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="blacklisted">Blacklisted</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={industryFilter}
              onValueChange={(value) => {
                setIndustryFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="Sector / Industry" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Industries</SelectItem>
                {industryOptions.map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    {industry}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AdminListScopeFilters
            dateRange={{ value: dateRange, onChange: (range) => { setDateRange(range); setPage(1); } }}
          />
        </CardContent>
      </Card>

      {companiesQuery.error ? (
        <Alert variant="destructive">
          <Building2 className="h-4 w-4" />
          <AlertTitle>Unable to load companies</AlertTitle>
          <AlertDescription>{getErrorMessage(companiesQuery.error)}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Companies ({pagination?.total ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 md:p-6">
          {companies.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <Building2 className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-medium">No companies found</h3>
              <p className="mt-1 text-muted-foreground">Try adjusting your filters or add a new company.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead label="Company" columnKey="name" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                    <SortableTableHead label="Industry" columnKey="industry" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                    <SortableTableHead label="Status" columnKey="status" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                    <SortableTableHead label="Classification" columnKey="classification" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                    <SortableTableHead label="Added On" columnKey="created_at" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((company) => (
                    <TableRow
                      key={company.id}
                      className={`cursor-pointer hover:bg-muted/50 ${company.classification === 'blacklisted' ? 'opacity-70' : ''}`}
                      onClick={() => navigate(`/admin/companies/${company.id}`)}
                    >
                      <TableCell>
                        <div>
                          <p className="font-medium">{company.name}</p>
                          <p className="max-w-xs truncate text-sm text-muted-foreground">{company.website || 'No website added'}</p>
                        </div>
                      </TableCell>
                      <TableCell>{company.industry || '—'}</TableCell>
                      <TableCell>{getStatusBadge(company.status)}</TableCell>
                      <TableCell>{getClassificationBadge(company.classification)}</TableCell>
                      <TableCell>{getCompanyCreatedLabel(company)}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(event) => event.stopPropagation()}>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(event) => {
                                event.stopPropagation();
                                navigate(`/admin/companies/${company.id}`);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedCompany(company);
                                setEditDialogOpen(true);
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Company
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedCompany(company);
                                setTagDialogOpen(true);
                              }}
                            >
                              <Star className="mr-2 h-4 w-4" />
                              Classify Company
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
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

      <AddCompanyDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Upload Companies</DialogTitle>
            <DialogDescription>
              Upload a CSV or XLSX sheet with company and recruiter data together. Required columns are `name`,
              and for recruiter creation use `recruiter_name` plus `recruiter_email`. Optional recruiter columns are
              `recruiter_phone` and `recruiter_designation`.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="file"
              accept=".csv,.xlsx"
              onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">
              Existing company names are skipped to avoid duplicates. Recruiters are matched by email so the same recruiter is not created twice.
            </p>
            <Button variant="outline" type="button" className="w-full" onClick={handleDownloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download Template Sample
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void handleImportCompanies()} disabled={importCompanies.isPending}>
              {importCompanies.isPending ? 'Uploading...' : 'Upload Companies'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {selectedCompany ? (
        <CompanyTagDialog
          open={tagDialogOpen}
          onOpenChange={setTagDialogOpen}
          company={selectedCompany}
        />
      ) : null}
      <EditCompanyDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        company={selectedCompany}
      />
    </>
  );
}
