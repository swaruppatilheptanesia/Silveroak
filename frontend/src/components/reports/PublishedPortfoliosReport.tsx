import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { FolderKanban, Download, Search, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { usePublishedPortfoliosReport } from '@/hooks/use-report-analytics-api';
import { downloadCSV } from './ReportToolbar';

type QueryParams = {
  department?: string;
  batch?: string;
  search?: string;
};

export default function PublishedPortfoliosReport() {
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');

  const queryParams = useMemo<QueryParams>(() => ({
    department: departmentFilter === 'all' ? undefined : departmentFilter,
    batch: batchFilter === 'all' ? undefined : batchFilter,
    search: searchQuery || undefined,
  }), [batchFilter, departmentFilter, searchQuery]);

  const { data, isLoading } = usePublishedPortfoliosReport(queryParams);

  const portfolios = useMemo(() => {
    return (data?.portfolios ?? []).map((portfolio: any) => ({
      id: portfolio.student_id,
      studentName: portfolio.full_name,
      enrollmentNumber: portfolio.enrollment_number,
      department: portfolio.department,
      batch: portfolio.batch,
      projectCount: portfolio.project_count,
      internshipCount: portfolio.internship_count,
      lastUpdated: portfolio.last_updated,
    }));
  }, [data]);

  const departments = useMemo(
    () => Array.from(new Set(portfolios.map((portfolio) => portfolio.department))).sort(),
    [portfolios],
  );

  const batches = useMemo(
    () => Array.from(new Set(portfolios.map((portfolio) => portfolio.batch))).sort(),
    [portfolios],
  );

  const stats = data?.stats ?? { total: 0, departments: 0 };
  const departmentBreakdown = data?.department_breakdown ?? [];

  const averages = useMemo(() => {
    const projectTotal = portfolios.reduce((sum, portfolio) => sum + portfolio.projectCount, 0);
    const internshipTotal = portfolios.reduce((sum, portfolio) => sum + portfolio.internshipCount, 0);

    return {
      projects: portfolios.length > 0 ? Number((projectTotal / portfolios.length).toFixed(1)) : 0,
      internships: portfolios.length > 0 ? Number((internshipTotal / portfolios.length).toFixed(1)) : 0,
    };
  }, [portfolios]);

  const handleExport = () => {
    const rows = portfolios.map((portfolio) => (
      `"${portfolio.studentName}",${portfolio.enrollmentNumber},${portfolio.department},${portfolio.batch},${portfolio.projectCount},${portfolio.internshipCount},${portfolio.lastUpdated ? format(new Date(portfolio.lastUpdated), 'dd MMM yyyy') : '—'}`
    ));
    downloadCSV(
      `Student,Enrollment,Department,Batch,Projects,Internships,Last Updated\n${rows.join('\n')}`,
      'published_portfolios',
    );
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FolderKanban className="h-4 w-4" />
            Portfolio & Showcase
          </div>
          <h3 className="text-xl font-semibold">Published Portfolios</h3>
          <p className="text-sm text-muted-foreground">
            Live portfolio records pulled from the backend.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Published Portfolios</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Departments Covered</p>
            <p className="text-2xl font-bold text-primary">{stats.departments}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Avg Projects</p>
            <p className="text-2xl font-bold text-emerald-600">{averages.projects}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Avg Internships</p>
            <p className="text-2xl font-bold text-blue-600">{averages.internships}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search student, enrollment or department..."
                className="pl-9"
              />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((department) => (
                  <SelectItem key={department} value={department}>
                    {department}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={batchFilter} onValueChange={setBatchFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Batch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Batches</SelectItem>
                {batches.map((batch) => (
                  <SelectItem key={batch} value={batch}>
                    {batch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead className="text-right">Projects</TableHead>
                  <TableHead className="text-right">Internships</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && portfolios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Loading published portfolios...
                    </TableCell>
                  </TableRow>
                ) : portfolios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No published portfolios match the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  portfolios.map((portfolio) => (
                    <TableRow key={portfolio.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{portfolio.studentName}</p>
                          <p className="text-xs text-muted-foreground">{portfolio.enrollmentNumber}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{portfolio.department}</TableCell>
                      <TableCell className="text-sm">{portfolio.batch}</TableCell>
                      <TableCell className="text-right font-medium">{portfolio.projectCount}</TableCell>
                      <TableCell className="text-right font-medium">{portfolio.internshipCount}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {portfolio.lastUpdated ? format(new Date(portfolio.lastUpdated), 'dd MMM yyyy') : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge className="gap-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20" variant="outline">
                          <Eye className="h-3 w-3" />
                          Published
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Department Coverage</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {departmentBreakdown.map(([department, count]: [string, number]) => (
              <div key={department} className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm">{department}</p>
                  <span className="text-2xl font-bold">{count}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Published portfolios</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
