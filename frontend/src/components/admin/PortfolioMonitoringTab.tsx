import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHead } from '@/components/shared/SortableTableHead';
import { useClientSort } from '@/hooks/use-client-sort';
import {
  Search,
  Filter,
  Eye,
  EyeOff,
  FolderKanban,
  Briefcase,
  Users,
  CheckCircle,
  FileEdit,
} from 'lucide-react';
import { format } from 'date-fns';
import { AdminStudentDetailsDialog } from '@/components/admin/AdminStudentDetailsDialog';
import AdminListScopeFilters from '@/components/admin/AdminListScopeFilters';
import { useAdminDepartmentOptions, useAdminPortfolios } from '@/hooks/use-admin-api';

export default function PortfolioMonitoringTab() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [instituteFilter, setInstituteFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const portfolioParams = useMemo(() => ({
    search: search || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter as 'draft' | 'published',
    department: deptFilter === 'all' ? undefined : deptFilter,
    institute: instituteFilter || undefined,
    course: courseFilter || undefined,
    branch: branchFilter || undefined,
    semester: semesterFilter === 'all' ? undefined : semesterFilter,
  }), [branchFilter, courseFilter, deptFilter, instituteFilter, search, semesterFilter, statusFilter]);

  const portfoliosQuery = useAdminPortfolios(portfolioParams);
  const departmentOptionsQuery = useAdminDepartmentOptions();
  const portfolios = portfoliosQuery.data?.data ?? [];
  const { sorted: sortedPortfolios, sort_by, sort_order, onSort } = useClientSort(portfolios, {
    student: (p) => p.student_name,
    department: (p) => p.department,
    projects: (p) => p.project_count,
    internships: (p) => p.internship_count,
    status: (p) => p.status,
    last_updated: (p) => new Date(p.last_updated),
  });
  const departmentOptions = departmentOptionsQuery.data ?? [];
  const stats = portfoliosQuery.data?.stats ?? {
    total: 0,
    published: 0,
    draft: 0,
    withProjects: 0,
    avgProjects: 0,
  };


  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pb-4 pt-4">
            <div className="mb-1 flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span className="text-xs">Total</span>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pb-4 pt-4">
            <div className="mb-1 flex items-center gap-2 text-muted-foreground">
              <CheckCircle className="h-4 w-4" />
              <span className="text-xs">Published</span>
            </div>
            <p className="text-2xl font-bold text-primary">{stats.published}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pb-4 pt-4">
            <div className="mb-1 flex items-center gap-2 text-muted-foreground">
              <FileEdit className="h-4 w-4" />
              <span className="text-xs">Draft</span>
            </div>
            <p className="text-2xl font-bold">{stats.draft}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pb-4 pt-4">
            <div className="mb-1 flex items-center gap-2 text-muted-foreground">
              <FolderKanban className="h-4 w-4" />
              <span className="text-xs">With Projects</span>
            </div>
            <p className="text-2xl font-bold">{stats.withProjects}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pb-4 pt-4">
            <div className="mb-1 flex items-center gap-2 text-muted-foreground">
              <Briefcase className="h-4 w-4" />
              <span className="text-xs">Avg Projects</span>
            </div>
            <p className="text-2xl font-bold">{stats.avgProjects}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div>
            <CardTitle className="text-base">Portfolio Overview</CardTitle>
            <CardDescription>Monitor student portfolio completion and status</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex flex-col gap-3 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or enrollment..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-full md:w-56">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departmentOptions.map((department) => (
                  <SelectItem key={department} value={department}>
                    {department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mb-4">
            <AdminListScopeFilters
              institute={{ value: instituteFilter, onChange: setInstituteFilter }}
              course={{ value: courseFilter, onChange: setCourseFilter }}
              branch={{ value: branchFilter, onChange: setBranchFilter }}
              semester={{ value: semesterFilter, onChange: setSemesterFilter }}
            />
          </div>

          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead label="Student" columnKey="student" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                  <SortableTableHead label="Department" columnKey="department" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                  <SortableTableHead label="Projects" columnKey="projects" className="text-center" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                  <SortableTableHead label="Internships" columnKey="internships" className="text-center" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                  <SortableTableHead label="Status" columnKey="status" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                  <SortableTableHead label="Last Updated" columnKey="last_updated" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {portfoliosQuery.isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Loading portfolios...
                    </TableCell>
                  </TableRow>
                ) : portfolios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No portfolios match your filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedPortfolios.map((portfolio) => (
                    <TableRow key={portfolio.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{portfolio.student_name}</p>
                          <p className="text-xs text-muted-foreground">{portfolio.enrollment_number}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{portfolio.department}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{portfolio.project_count}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">{portfolio.internship_count}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={portfolio.status === 'published' ? 'default' : 'outline'} className="gap-1">
                          {portfolio.status === 'published' ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                          {portfolio.status === 'published' ? 'Published' : 'Draft'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(portfolio.last_updated), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => setSelectedStudentId(portfolio.student_id)}
                        >
                          <Eye className="h-4 w-4" />
                          View Portfolio
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Showing {portfolios.length} of {stats.total} portfolios
          </p>
        </CardContent>
      </Card>

      <AdminStudentDetailsDialog
        studentId={selectedStudentId}
        open={Boolean(selectedStudentId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedStudentId(null);
          }
        }}
        defaultSection="portfolio"
      />
    </div>
  );
}
