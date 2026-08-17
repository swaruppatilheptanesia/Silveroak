import { useDeferredValue, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Ban,
  Building,
  Building2,
  CheckCircle,
  Edit,
  Eye,
  Download,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  Star,
  Upload,
  XCircle,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AddCompanyDialog from '@/components/employer/AddCompanyDialog';
import CompanyTagDialog from '@/components/employer/CompanyTagDialog';
import EditCompanyDialog from '@/components/employer/EditCompanyDialog';
import { useCompanies, useImportCompanies } from '@/hooks/use-employer-api';
import type { ApiCompany } from '@/types/employer';
import { toast } from 'sonner';

const CompanyManagement = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [classificationFilter, setClassificationFilter] = useState<string>('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<ApiCompany | null>(null);
  const importCompanies = useImportCompanies();

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

  const deferredSearch = useDeferredValue(searchTerm);
  const status = statusFilter === 'all' ? undefined : (statusFilter as 'active' | 'inactive');
  const classification = classificationFilter === 'all'
    ? undefined
    : (classificationFilter as 'preferred' | 'normal' | 'blacklisted');

  const companiesQuery = useCompanies({
    page: 1,
    limit: 1000,
    search: deferredSearch || undefined,
    status,
    classification,
  });
  const totalQuery = useCompanies({ page: 1, limit: 1 });
  const activeQuery = useCompanies({ page: 1, limit: 1, status: 'active' });
  const preferredQuery = useCompanies({ page: 1, limit: 1, classification: 'preferred' });
  const blacklistedQuery = useCompanies({ page: 1, limit: 1, classification: 'blacklisted' });

  const companies = companiesQuery.data?.data ?? [];

  const stats = useMemo(() => ({
    total: totalQuery.data?.pagination.total ?? 0,
    active: activeQuery.data?.pagination.total ?? 0,
    preferred: preferredQuery.data?.pagination.total ?? 0,
    blacklisted: blacklistedQuery.data?.pagination.total ?? 0,
  }), [
    activeQuery.data?.pagination.total,
    blacklistedQuery.data?.pagination.total,
    preferredQuery.data?.pagination.total,
    totalQuery.data?.pagination.total,
  ]);

  const getClassificationBadge = (value: ApiCompany['classification']) => {
    switch (value) {
      case 'preferred':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><Star className="h-3 w-3 mr-1" />Preferred</Badge>;
      case 'blacklisted':
        return <Badge variant="destructive"><Ban className="h-3 w-3 mr-1" />Blacklisted</Badge>;
      default:
        return <Badge variant="secondary">Normal</Badge>;
    }
  };

  const getStatusBadge = (value: ApiCompany['status']) => {
    return value === 'active'
      ? <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>
      : <Badge variant="outline"><XCircle className="h-3 w-3 mr-1" />Inactive</Badge>;
  };

  const handleTagCompany = (company: ApiCompany) => {
    setSelectedCompany(company);
    setTagDialogOpen(true);
  };

  const handleEditCompany = (company: ApiCompany) => {
    setSelectedCompany(company);
    setEditDialogOpen(true);
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
      toast.error(error instanceof Error ? error.message : 'Unable to import companies.');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Company Management</h1>
            <p className="text-muted-foreground">Manage live employer records and company profiles</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Bulk Upload
            </Button>
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add New Company
            </Button>
          </div>
        </div>

        {companiesQuery.error ? (
          <Alert variant="destructive">
            <Building2 className="h-4 w-4" />
            <AlertTitle>Unable to load companies</AlertTitle>
            <AlertDescription>
              {(companiesQuery.error instanceof Error ? companiesQuery.error.message : null) || 'Please refresh and try again.'}
            </AlertDescription>
          </Alert>
        ) : null}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
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
                <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
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
                <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
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
                <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
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

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by company name or industry..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <Select value={classificationFilter} onValueChange={setClassificationFilter}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="Classification" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classifications</SelectItem>
                  <SelectItem value="preferred">Preferred</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="blacklisted">Blacklisted</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Companies Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Companies ({companiesQuery.data?.pagination.total ?? companies.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 md:p-6">
            {companiesQuery.isLoading ? (
              <div className="text-center py-12 px-4 text-muted-foreground">
                Loading live company records...
              </div>
            ) : companies.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No companies found</h3>
                <p className="text-muted-foreground mt-1">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company Name</TableHead>
                      <TableHead>Industry</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Classification</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {companies.map((company) => (
                      <TableRow
                        key={company.id}
                        className={`cursor-pointer hover:bg-muted/50 ${company.classification === 'blacklisted' ? 'opacity-60' : ''}`}
                        onClick={() => navigate(`/admin/companies/${company.id}`)}
                      >
                        <TableCell>
                          <div>
                            <p className="font-medium">{company.name}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-xs">{company.website || 'No website added'}</p>
                          </div>
                        </TableCell>
                        <TableCell>{company.industry || '—'}</TableCell>
                        <TableCell>{getStatusBadge(company.status)}</TableCell>
                        <TableCell>{getClassificationBadge(company.classification)}</TableCell>
                        <TableCell>{format(new Date(company.created_at), 'dd MMM yyyy')}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/admin/companies/${company.id}`)}>
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleTagCompany(company)}>
                                <Filter className="h-4 w-4 mr-2" />
                                Tag Company
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEditCompany(company)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Company
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
      </div>

      {/* Dialogs */}
      <AddCompanyDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Upload Companies</DialogTitle>
            <DialogDescription>
              Upload CSV or XLSX with columns: name, industry, website, address, description, recruiter_name, recruiter_email,
              recruiter_phone, recruiter_designation. Company name is required, and recruiter name plus recruiter email are required
              when adding a recruiter in the same row.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              type="file"
              accept=".csv,.xlsx"
              onChange={(event) => setImportFile(event.target.files?.[0] ?? null)}
            />
            <p className="text-xs text-muted-foreground">
              Existing company names are skipped to avoid duplicate records. Recruiters are matched by email to avoid duplicates.
            </p>
            <Button variant="outline" type="button" className="w-full" onClick={handleDownloadTemplate}>
              <Download className="mr-2 h-4 w-4" />
              Download Template Sample
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => void handleImportCompanies()} disabled={importCompanies.isPending}>
              {importCompanies.isPending ? 'Uploading...' : 'Upload Companies'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {selectedCompany && (
        <CompanyTagDialog
          open={tagDialogOpen}
          onOpenChange={setTagDialogOpen}
          company={selectedCompany}
        />
      )}
      <EditCompanyDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        company={selectedCompany}
      />
    </DashboardLayout>
  );
};

export default CompanyManagement;
