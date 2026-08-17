import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Download, Search, AlertTriangle, FileText, Clock, CheckCircle } from 'lucide-react';
import { useCertificatePendingReport } from '@/hooks/use-report-analytics-api';
import { useToast } from '@/hooks/use-toast';

const DUE_WINDOWS = [
  { value: '7', label: 'Due within 7 days' },
  { value: '15', label: 'Due within 15 days' },
  { value: '25', label: 'Due within 25 days' },
  { value: '30', label: 'Due within 30 days' },
  { value: 'all', label: 'All pending' },
];

type QueryParams = {
  department?: string;
  company_id?: string;
  batch?: string;
  search?: string;
  due_window?: string;
};

export default function CertificatePendingReport() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [dueWindow, setDueWindow] = useState('all');

  const queryParams = useMemo<QueryParams>(() => ({
    department: departmentFilter === 'all' ? undefined : departmentFilter,
    company_id: companyFilter === 'all' ? undefined : companyFilter,
    search: searchQuery || undefined,
    due_window: dueWindow,
  }), [companyFilter, departmentFilter, dueWindow, searchQuery]);

  const { data, isLoading } = useCertificatePendingReport(queryParams);

  const pendingInternships = useMemo(() => {
    return (data?.internships ?? []).map((internship: any) => ({
      id: internship.internship_id,
      student_name: internship.student_name,
      enrollment_number: internship.enrollment_number,
      department: internship.department,
      batch: internship.batch,
      company_name: internship.company_name,
      role: internship.role,
      end_date: internship.end_date,
      daysRemaining: internship.days_remaining,
    }));
  }, [data]);

  const companies = useMemo(() => Array.from(new Set(pendingInternships.map((internship) => internship.company_name))).sort(), [pendingInternships]);
  const departments = useMemo(() => Array.from(new Set(pendingInternships.map((internship) => internship.department))).sort(), [pendingInternships]);

  const stats = data?.stats ?? { total: 0, overdue: 0, urgent: 0, upcoming: 0 };

  const handleExportCsv = () => {
    const header = 'Student,Enrollment,Department,Batch,Company,Role,End Date,Days Remaining\n';
    const rows = pendingInternships.map((internship) =>
      `"${internship.student_name}",${internship.enrollment_number},${internship.department},${internship.batch},${internship.company_name},"${internship.role}",${internship.end_date ? new Date(internship.end_date).toLocaleDateString('en-IN') : '—'},${internship.daysRemaining}`
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'certificate_pending_report.csv';
    a.click();
    toast({ title: 'Exported', description: 'CSV downloaded successfully.' });
  };

  const getDaysLabel = (days: number) => {
    if (days < 0) return { text: `${Math.abs(days)}d overdue`, className: 'bg-red-500/10 text-red-600 border-red-500/20' };
    if (days <= 7) return { text: `${days}d left`, className: 'bg-amber-500/10 text-amber-600 border-amber-500/20' };
    return { text: `${days}d left`, className: 'bg-blue-500/10 text-blue-600 border-blue-500/20' };
  };

  const cards = [
    { label: 'Total Pending', value: stats.total, icon: FileText, color: 'text-primary' },
    { label: 'Overdue', value: stats.overdue, icon: AlertTriangle, color: 'text-red-600' },
    { label: 'Due in 7 days', value: stats.urgent, icon: Clock, color: 'text-amber-600' },
    { label: 'Due in 8–25 days', value: stats.upcoming, icon: CheckCircle, color: 'text-blue-600' },
  ];

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((card) => (
          <Card key={card.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <card.icon className={`h-5 w-5 shrink-0 ${card.color}`} />
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-xs text-muted-foreground">{card.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="text-base">Certificate Pending Details</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCsv}>
                <Download className="h-4 w-4 mr-2" /> CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-9" />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((department) => (
                  <SelectItem key={department} value={department}>{department}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={companyFilter} onValueChange={setCompanyFilter}>
              <SelectTrigger><SelectValue placeholder="Company" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Companies</SelectItem>
                {companies.map((company) => (
                  <SelectItem key={company} value={company}>{company}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dueWindow} onValueChange={setDueWindow}>
              <SelectTrigger><SelectValue placeholder="Due window" /></SelectTrigger>
              <SelectContent>
                {DUE_WINDOWS.map((window) => (
                  <SelectItem key={window.value} value={window.value}>{window.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[160px]">Student</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Days Remaining</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && pendingInternships.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading pending certificates...</TableCell>
                  </TableRow>
                ) : pendingInternships.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No pending certificates match filters.</TableCell>
                  </TableRow>
                ) : (
                  pendingInternships.map((internship) => {
                    const label = getDaysLabel(internship.daysRemaining);
                    return (
                      <TableRow key={internship.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-sm">{internship.student_name}</p>
                            <p className="text-xs text-muted-foreground">{internship.enrollment_number}</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{internship.department}</TableCell>
                        <TableCell className="text-sm">{internship.company_name}</TableCell>
                        <TableCell className="text-sm">{internship.role}</TableCell>
                        <TableCell className="text-sm whitespace-nowrap">
                          {internship.end_date ? new Date(internship.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${label.className}`}>{label.text}</Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground">Showing {pendingInternships.length} of {data?.stats?.total ?? pendingInternships.length} pending certificates</p>
        </CardContent>
      </Card>
    </div>
  );
}
