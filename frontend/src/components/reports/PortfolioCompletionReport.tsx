import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import {
  Download,
  Filter,
  FolderKanban,
  Briefcase,
  Eye,
  EyeOff,
} from 'lucide-react';
import { format } from 'date-fns';
import { usePortfolioCompletionReport } from '@/hooks/use-report-analytics-api';
import { ReportToolbar, downloadCSV, type DateRange } from './ReportToolbar';

type QueryParams = {
  department?: string;
  batch?: string;
  search?: string;
};

export default function PortfolioCompletionReport() {
  const [deptFilter, setDeptFilter] = useState('all');
  const [dateRange] = useState<DateRange>({ from: undefined, to: undefined });

  const queryParams = useMemo<QueryParams>(() => ({
    department: deptFilter === 'all' ? undefined : deptFilter,
  }), [deptFilter]);

  const { data, isLoading } = usePortfolioCompletionReport(queryParams);

  const portfolios = useMemo(() => {
    return (data?.portfolios ?? []).map((portfolio: any) => ({
      id: portfolio.student_id,
      student_name: portfolio.full_name,
      enrollment_number: portfolio.enrollment_number,
      department: portfolio.department,
      batch: portfolio.batch,
      status: portfolio.status,
      project_count: portfolio.project_count,
      internship_count: portfolio.internship_count,
      last_updated: portfolio.last_updated,
    }));
  }, [data]);

  const stats = data?.stats ?? { total: 0, with_both: 0, project_only: 0, empty: 0 };
  const completionBands = data?.bands ?? [];
  const departments = useMemo(() => Array.from(new Set(portfolios.map((portfolio) => portfolio.department))).sort(), [portfolios]);

  const handleExport = () => {
    const csvContent = `Student,Enrollment,Department,Batch,Status,Projects,Internships,Last Updated\n` +
      portfolios.map((portfolio) =>
        `${portfolio.student_name},${portfolio.enrollment_number},${portfolio.department},${portfolio.batch},${portfolio.status},${portfolio.project_count},${portfolio.internship_count},${format(new Date(portfolio.last_updated), 'dd/MM/yyyy')}`
      ).join('\n');
    downloadCSV(csvContent, 'portfolio_completion_report');
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Total Portfolios</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Projects + Internships</p>
            <p className="text-2xl font-bold text-primary">{stats.with_both}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Projects Only</p>
            <p className="text-2xl font-bold">{stats.project_only}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground">Empty Portfolios</p>
            <p className="text-2xl font-bold text-destructive">{stats.empty}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <CardTitle className="text-base">Portfolio Completion Summary</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
                <Download className="h-4 w-4" /> Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 mb-4">
            <Select value={deptFilter} onValueChange={setDeptFilter}>
              <SelectTrigger className="w-full md:w-56">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((department) => (
                  <SelectItem key={department} value={department}>{department}</SelectItem>
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
                  <TableHead className="text-center">Projects</TableHead>
                  <TableHead className="text-center">Internships</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && portfolios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading portfolio completion data...</TableCell>
                  </TableRow>
                ) : portfolios.map((portfolio) => (
                  <TableRow key={portfolio.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm">{portfolio.student_name}</p>
                        <p className="text-xs text-muted-foreground">{portfolio.enrollment_number}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{portfolio.department}</TableCell>
                    <TableCell className="text-center">{portfolio.project_count}</TableCell>
                    <TableCell className="text-center">{portfolio.internship_count}</TableCell>
                    <TableCell>
                      <Badge variant={portfolio.status === 'published' ? 'default' : 'outline'} className="gap-1">
                        {portfolio.status === 'published' ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                        {portfolio.status === 'published' ? 'Published' : 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(portfolio.last_updated), 'dd MMM yyyy')}
                    </TableCell>
                  </TableRow>
                ))}
                {portfolios.length === 0 && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No portfolios match your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Completion Bands</CardTitle>
          <CardDescription>Backend-generated portfolio completion breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {completionBands.map((band: any) => (
              <Card key={band.label}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{band.label}</span>
                    <span className="text-2xl font-bold">{band.count}</span>
                  </div>
                  <Progress value={stats.total > 0 ? (band.count / stats.total) * 100 : 0} className="h-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
