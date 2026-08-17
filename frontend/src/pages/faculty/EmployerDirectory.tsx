import { useDeferredValue, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Building2,
  CheckCircle,
  Eye,
  Ban,
  Search,
  Star,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCompanies } from '@/hooks/use-employer-api';
import type { ApiCompany } from '@/types/employer';

const EmployerDirectory = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedCompany, setSelectedCompany] = useState<ApiCompany | null>(null);

  const deferredSearch = useDeferredValue(searchTerm);
  const status = statusFilter === 'all' ? undefined : (statusFilter as 'active' | 'inactive');

  const { sort_by, sort_order, onSort } = useServerSort<
    'name' | 'industry' | 'status' | 'classification'
  >('name', 'asc');
  const companiesQuery = useCompanies({
    page: 1,
    limit: 1000,
    search: deferredSearch || undefined,
    status,
    sort_by,
    sort_order,
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

  const getClassificationBadge = (classification: ApiCompany['classification']) => {
    switch (classification) {
      case 'preferred':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><Star className="h-3 w-3 mr-1" />Preferred</Badge>;
      case 'blacklisted':
        return <Badge variant="destructive"><Ban className="h-3 w-3 mr-1" />Blacklisted</Badge>;
      default:
        return <Badge variant="secondary">Normal</Badge>;
    }
  };

  const getStatusBadge = (status: ApiCompany['status']) => {
    return status === 'active'
      ? <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>
      : <Badge variant="outline"><XCircle className="h-3 w-3 mr-1" />Inactive</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Employer Directory</h1>
          <p className="text-muted-foreground">Browse the current employer directory and company details</p>
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
            </div>
          </CardContent>
        </Card>

        {/* Companies Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Companies ({companiesQuery.data?.pagination.total ?? companies.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {companiesQuery.isLoading ? (
              <div className="py-12 text-center text-muted-foreground">
                Loading live company registry...
              </div>
            ) : (
              <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead label="Company Name" columnKey="name" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                  <SortableTableHead label="Industry" columnKey="industry" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                  <SortableTableHead label="Status" columnKey="status" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                  <SortableTableHead label="Classification" columnKey="classification" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id} className={company.classification === 'blacklisted' ? 'opacity-60' : ''}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{company.name}</p>
                        <p className="text-sm text-muted-foreground truncate max-w-xs">{company.website || 'No website added'}</p>
                      </div>
                    </TableCell>
                    <TableCell>{company.industry || '—'}</TableCell>
                    <TableCell>{getStatusBadge(company.status)}</TableCell>
                    <TableCell>{getClassificationBadge(company.classification)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedCompany(company)}>
                        <Eye className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* View Dialog */}
      <Dialog open={!!selectedCompany} onOpenChange={() => setSelectedCompany(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {selectedCompany?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedCompany && (
            <div className="space-y-4">
              <div className="flex gap-2">
                {getStatusBadge(selectedCompany.status)}
                {getClassificationBadge(selectedCompany.classification)}
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Industry</p>
                  <p className="font-medium">{selectedCompany.industry || 'No industry added'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p>{selectedCompany.address || 'No address added'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Website</p>
                  {selectedCompany.website ? (
                    <a href={selectedCompany.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      {selectedCompany.website}
                    </a>
                  ) : (
                    <p>No website added</p>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p>{selectedCompany.description || 'No description added.'}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default EmployerDirectory;
