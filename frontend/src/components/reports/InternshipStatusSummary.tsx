import { useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Briefcase, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useCompanyMasterReport, useInternshipStatusReport } from '@/hooks/use-report-analytics-api';
import { INTERNSHIP_STATUS_CONFIG, INTERNSHIP_TYPE_CONFIG } from '@/types/internship';
import { ReportToolbar, downloadCSV, type DateRange } from './ReportToolbar';

type QueryParams = {
  from?: Date;
  to?: Date;
  department?: string;
  company_id?: string;
  type?: string;
  status?: string;
  search?: string;
};

export default function InternshipStatusSummary() {
  const tableRef = useRef<HTMLDivElement>(null);
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: companyData } = useCompanyMasterReport();

  const queryParams = useMemo<QueryParams>(() => ({
    from: dateRange.from,
    to: dateRange.to,
    department: departmentFilter === 'all' ? undefined : departmentFilter,
    company_id: companyFilter === 'all' ? undefined : companyFilter,
    type: typeFilter === 'all' ? undefined : typeFilter,
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: searchQuery || undefined,
  }), [companyFilter, dateRange.from, dateRange.to, departmentFilter, searchQuery, statusFilter, typeFilter]);

  const { data, isLoading } = useInternshipStatusReport(queryParams);

  const internships = useMemo(() => {
    return (data?.internships ?? []).map((internship: any) => ({
      id: internship.internship_id,
      student_name: internship.student_name,
      enrollment_number: internship.enrollment_number,
      department: internship.department,
      batch: internship.batch,
      company_name: internship.company_name,
      role: internship.role,
      internship_type: internship.internship_type,
      status: internship.status,
      start_date: internship.start_date,
      end_date: internship.end_date,
      stipend_amount: internship.stipend_amount,
    }));
  }, [data]);

  const companies = useMemo(() => {
    return (companyData?.companies ?? []).map((company: any) => ({
      id: company.company_id,
      name: company.name,
    }));
  }, [companyData]);

  const departments = useMemo(() => Array.from(new Set(internships.map((internship) => internship.department))).sort(), [internships]);
  const stats = data?.stats ?? { total: 0, ongoing: 0, completed: 0, discontinued: 0 };

  const handleExportCsv = () => {
    const header = 'Student,Enrollment,Department,Batch,Company,Role,Type,Start Date,End Date,Status,Stipend (₹)\n';
    const rows = internships.map((internship) =>
      `"${internship.student_name}",${internship.enrollment_number},${internship.department},${internship.batch},${internship.company_name},"${internship.role}",${INTERNSHIP_TYPE_CONFIG[internship.internship_type as keyof typeof INTERNSHIP_TYPE_CONFIG]?.label ?? internship.internship_type},${new Date(internship.start_date).toLocaleDateString('en-IN')},${internship.end_date ? new Date(internship.end_date).toLocaleDateString('en-IN') : '—'},${INTERNSHIP_STATUS_CONFIG[internship.status as keyof typeof INTERNSHIP_STATUS_CONFIG]?.label ?? internship.status},${internship.stipend_amount || 'N/A'}`
    ).join('\n');
    downloadCSV(header + rows, 'internship_status_summary');
  };

  const cards = [
    { label: 'Total', value: stats.total, icon: Briefcase, color: 'text-primary' },
    { label: 'Ongoing', value: stats.ongoing, icon: Clock, color: 'text-blue-600' },
    { label: 'Completed', value: stats.completed, icon: CheckCircle, color: 'text-green-600' },
    { label: 'Discontinued', value: stats.discontinued, icon: XCircle, color: 'text-red-600' },
  ];

  return (
    <div className="space-y-4 lg:space-y-6">
      <ReportToolbar title="Internship Records" totalRecords={stats.total} dateRange={dateRange} onDateRangeChange={setDateRange} onExportCSV={handleExportCsv} />

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
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(INTERNSHIP_STATUS_CONFIG).map(([key, value]) => (
                  <SelectItem key={key} value={key}>{value.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(INTERNSHIP_TYPE_CONFIG).map(([key, value]) => (
                  <SelectItem key={key} value={key}>{value.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border overflow-x-auto" ref={tableRef}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[160px]">Student</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Stipend</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && internships.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading internship records...</TableCell>
                  </TableRow>
                ) : internships.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No records match the selected filters.</TableCell>
                  </TableRow>
                ) : (
                  internships.map((internship) => (
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
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${INTERNSHIP_TYPE_CONFIG[internship.internship_type as keyof typeof INTERNSHIP_TYPE_CONFIG]?.color ?? ''}`}>
                          {INTERNSHIP_TYPE_CONFIG[internship.internship_type as keyof typeof INTERNSHIP_TYPE_CONFIG]?.label ?? internship.internship_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {new Date(internship.start_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} – {internship.end_date ? new Date(internship.end_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${INTERNSHIP_STATUS_CONFIG[internship.status as keyof typeof INTERNSHIP_STATUS_CONFIG]?.color ?? ''}`}>
                          {INTERNSHIP_STATUS_CONFIG[internship.status as keyof typeof INTERNSHIP_STATUS_CONFIG]?.label ?? internship.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {internship.stipend_amount ? `₹${Number(internship.stipend_amount).toLocaleString('en-IN')}` : '—'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground">Showing {internships.length} of {data?.stats?.total ?? internships.length} internships</p>
        </CardContent>
      </Card>
    </div>
  );
}
