import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
import { SortableTableHead } from '@/components/shared/SortableTableHead';
import { useServerSort } from '@/hooks/use-server-sort';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Search,
  Download,
  FileSpreadsheet,
  Eye,
  AlertTriangle,
  Lock,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { PostingTypeBadge } from '@/components/ui/status-badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { isProfileIncomplete, calculateEligibility, MIN_PROFILE_COMPLETION } from '@/lib/validations';
import { VERIFICATION_STATUS_CONFIG } from '@/lib/constants';
import { formatCGPA, formatLPA } from '@/lib/formatters';
import { resolveBackendAssetUrl } from '@/lib/studentModule';
import { useAdminDepartmentOptions, useAdminStudents } from '@/hooks/use-admin-api';
import { usePostingTypeOptions } from '@/hooks/use-posting-type-options';
import { useCompanies } from '@/hooks/use-employer-api';
import { useToast } from '@/hooks/use-toast';
import { adminService } from '@/services/adminService';
import { downloadCsvTable, downloadExcelTable, type SpreadsheetCellValue } from '@/lib/spreadsheetExport';
import AdminListScopeFilters, { type DateRangeValue } from '@/components/admin/AdminListScopeFilters';
import type {
  AdminStudentQueryParams,
  AdminStudentVerificationStatus,
  ApiAdminStudent,
} from '@/types/admin';
import { StudentProfileBlockSection } from '@/components/admin/StudentProfileBlockSection';
import { StudentPlacementSection } from '@/components/admin/StudentPlacementSection';

const ITEMS_PER_PAGE = 100;

const statusConfig = VERIFICATION_STATUS_CONFIG;

function getStudentPostingTypes(student: ApiAdminStudent): string[] {
  return Array.from(
    new Set(student.applications.map((application) => application.posting.type).filter(Boolean)),
  );
}

function getCgpaFilters(filter: string) {
  switch (filter) {
    case '9+':
      return { min_cgpa: 9 };
    case '8-9':
      return { min_cgpa: 8, max_cgpa: 8.99 };
    case '7-8':
      return { min_cgpa: 7, max_cgpa: 7.99 };
    case '<7':
      return { max_cgpa: 6.99 };
    default:
      return {};
  }
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN');
}

// Mirrors StudentEmploymentTab's labels (Full-time / Part-time only).
function employmentTypeLabel(value: string | null | undefined): string {
  if (value === 'full_time_job') return 'Full-Time Job';
  if (value === 'part-time') return 'Part-Time';
  return value || 'Not specified';
}

function formatDateRange(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  isOngoing = false,
) {
  if (!startDate && !endDate) return 'Dates not specified';
  if (startDate && (endDate || isOngoing)) {
    return `${formatDate(startDate)} to ${isOngoing ? 'Present' : formatDate(endDate)}`;
  }
  if (startDate) return `Started ${formatDate(startDate)}`;
  return `Until ${formatDate(endDate)}`;
}

function detailValue(value: string | number | boolean | null | undefined) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function DetailItem({ label, value }: { label: string; value: string | number | boolean | null | undefined }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{detailValue(value)}</p>
    </div>
  );
}

function DocumentLink({ href, label }: { href: string | null | undefined; label: string }) {
  if (!href) return null;
  return (
    <a
      href={resolveBackendAssetUrl(href)}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
    >
      <ExternalLink className="h-3 w-3" />
      {label}
    </a>
  );
}

function ExpandableCard({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: ReactNode;
}) {
  return (
    <details className="rounded-lg border border-border p-4">
      <summary className="cursor-pointer text-sm font-semibold text-foreground">
        {title}{typeof count === 'number' ? ` (${count})` : ''}
      </summary>
      <div className="mt-4">{children}</div>
    </details>
  );
}

function EmptyDetail({ label }: { label: string }) {
  return <p className="text-sm text-muted-foreground">No {label} recorded.</p>;
}

function PortfolioAndNoDuesContent({ student }: { student: ApiAdminStudent }) {
  const portfolio = student.portfolio;
  const portfolioProjects = portfolio?.projects ?? [];
  const portfolioShowcases = portfolio?.showcases ?? [];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">Portfolio Status</p>
          <p className="text-sm font-medium">{detailValue(portfolio?.status)}</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">Portfolio Projects</p>
          <p className="text-sm font-medium">{portfolioProjects.length}</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">Portfolio Showcases</p>
          <p className="text-sm font-medium">{portfolioShowcases.length}</p>
        </div>
        <div className="rounded-md border p-3">
          <p className="text-xs text-muted-foreground">Internship Records</p>
          <p className="text-sm font-medium">{student.internships.length}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-md border p-4">
          <p className="mb-3 text-sm font-medium">Portfolio Projects</p>
          {portfolioProjects.length === 0 ? (
            <EmptyDetail label="portfolio projects" />
          ) : (
            <div className="space-y-3">
              {portfolioProjects.map((project) => (
                <div key={project.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{project.title}</p>
                    {project.is_ongoing ? <Badge variant="outline">Ongoing</Badge> : null}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {project.role || 'Role not specified'} • {formatDateRange(project.start_date, project.end_date, project.is_ongoing)}
                  </p>
                  <p className="mt-2 text-sm text-foreground">{project.description || 'No description added.'}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Technologies: {project.technologies.join(', ') || 'No technologies listed'}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Keywords: {project.keywords.join(', ') || 'No keywords listed'}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-3">
                    <DocumentLink href={project.github_url} label="GitHub" />
                    <DocumentLink href={project.live_url} label="Live URL" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-md border p-4">
          <p className="mb-3 text-sm font-medium">Portfolio Showcases</p>
          {portfolioShowcases.length === 0 ? (
            <EmptyDetail label="portfolio showcases" />
          ) : (
            <div className="space-y-3">
              {portfolioShowcases.map((showcase) => (
                <div key={showcase.id} className="rounded-md border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{showcase.role}</p>
                    {showcase.is_verified ? <Badge variant="success">Verified</Badge> : null}
                    {showcase.linked_internship_id ? <Badge variant="secondary">Linked Record</Badge> : null}
                  </div>
                  <p className="text-sm text-muted-foreground">{showcase.company_name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {showcase.duration_months ? `${showcase.duration_months} month(s)` : 'Duration not specified'} • {formatDateRange(showcase.start_date, showcase.end_date)}
                  </p>
                  {showcase.key_outcomes.length > 0 ? (
                    <div className="mt-2 space-y-1 text-sm text-foreground">
                      {showcase.key_outcomes.map((outcome, index) => (
                        <p key={`${showcase.id}-${index}`}>{outcome}</p>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">No outcomes added.</p>
                  )}
                  <div className="mt-2">
                    <DocumentLink href={showcase.proof_url} label="Completion certificate" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-md border p-4">
        <p className="mb-3 text-sm font-medium">Student Internship Records</p>
        {student.internships.length > 0 ? (
          <div className="space-y-3">
            {student.internships.map((internship) => (
              <div key={internship.id} className="rounded-md border p-3">
                <p className="font-medium">{internship.company_name} • {internship.role}</p>
                <p className="text-sm text-muted-foreground">
                  {internship.internship_type} • {internship.status} • {formatDateRange(internship.start_date, internship.end_date)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Stipend: {internship.stipend_amount ? `₹${internship.stipend_amount.toLocaleString('en-IN')}` : '—'} • Issues: {internship.open_issue_count}/{internship.issue_count} open
                </p>
                <div className="mt-2">
                  <DocumentLink href={internship.certificate_url} label="Offer letter / certificate" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyDetail label="internship records" />
        )}
      </div>

      <div className="rounded-md border p-4">
        <p className="mb-3 text-sm font-medium">No Dues Requests</p>
        {student.no_dues_requests.length > 0 ? (
          <div className="space-y-2">
            {student.no_dues_requests.map((request) => (
              <div key={request.id} className="rounded-md border p-3 text-sm">
                <p className="font-medium">{request.exit_reason} • {request.status}</p>
                <p className="text-muted-foreground">{request.company_name || request.designation || request.ndc_number || 'No extra summary'}</p>
                <DocumentLink href={request.proof_url} label="Proof attachment" />
                <DocumentLink href={request.certificate_url} label="NDC certificate" />
              </div>
            ))}
          </div>
        ) : (
          <EmptyDetail label="no dues requests" />
        )}
      </div>
    </div>
  );
}

const EXPORT_HEADERS = [
  'Name', 'Mobile No', 'Gender', 'Email', 'Enrollment No', 'Institute', 'Course', 'Branch', 'Semester',
  'CPI', '12th %', '10th %', 'Backlogs', 'Academic Year', 'Projects', 'Internships', 'Status', 'Resume Link',
];

function studentExportRow(student: ApiAdminStudent): SpreadsheetCellValue[] {
  const resume = student.resumes.find((item) => item.is_default) ?? student.resumes[0];
  return [
    student.full_name,
    student.mobile ?? '',
    student.gender ?? '',
    student.email,
    student.enrollment_number,
    student.institute_name ?? '',
    student.course_name ?? '',
    student.department ?? '',
    student.current_semester ?? '',
    formatCGPA(student.academicProfile.cgpa, ''),
    student.academicProfile.twelfth_percentage ?? '',
    student.academicProfile.tenth_percentage ?? '',
    student.academicProfile.backlog_count ?? 0,
    student.batch_year ?? '',
    student.projects.length,
    student.internships.length,
    student.verificationStatus,
    resume?.file_url ? resolveBackendAssetUrl(resume.file_url) : '',
  ];
}

export default function StudentListTab() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<AdminStudentVerificationStatus | 'all'>('all');
  const [cgpaFilter, setCgpaFilter] = useState('all');
  const [postingTypeFilter, setPostingTypeFilter] = useState('all');
  const [instituteFilter, setInstituteFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRangeValue>({ from: undefined, to: undefined });
  const [currentPage, setCurrentPage] = useState(1);
  const { sort_by, sort_order, onSort } = useServerSort<
    'full_name' | 'department' | 'profile_completion_percentage' | 'verification_status' | 'created_at'
  >('created_at', 'desc', () => setCurrentPage(1));
  const [selectedStudent, setSelectedStudent] = useState<ApiAdminStudent | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const {
    options: postingTypeOptions,
    isLoading: postingTypesLoading,
    isEmpty: postingTypesEmpty,
  } = usePostingTypeOptions();
  const companiesQuery = useCompanies({ limit: 100, sort_by: 'name', sort_order: 'asc' });
  const companyOptions = companiesQuery.data?.data ?? [];

  const studentsParams = useMemo<AdminStudentQueryParams>(() => {
    const cgpaParams = getCgpaFilters(cgpaFilter) as Pick<
      AdminStudentQueryParams,
      'min_cgpa' | 'max_cgpa'
    >;

    return {
      page: currentPage,
      limit: ITEMS_PER_PAGE,
      search: searchQuery || undefined,
      department: departmentFilter === 'all' ? undefined : departmentFilter,
      verification_status: statusFilter === 'all' ? undefined : statusFilter,
      posting_type_master_id: postingTypeFilter === 'all' ? undefined : postingTypeFilter,
      institute: instituteFilter || undefined,
      course: courseFilter || undefined,
      branch: branchFilter || undefined,
      semester: semesterFilter === 'all' ? undefined : semesterFilter,
      company_id: companyFilter === 'all' ? undefined : companyFilter,
      date_from: dateRange.from ? dateRange.from.toISOString() : undefined,
      date_to: dateRange.to ? dateRange.to.toISOString() : undefined,
      ...cgpaParams,
      sort_by,
      sort_order,
    };
  }, [branchFilter, cgpaFilter, companyFilter, courseFilter, currentPage, dateRange.from, dateRange.to, departmentFilter, instituteFilter, postingTypeFilter, searchQuery, semesterFilter, statusFilter, sort_by, sort_order]);

  const studentsQuery = useAdminStudents(studentsParams);
  const departmentOptionsQuery = useAdminDepartmentOptions();
  const students = studentsQuery.data?.data ?? [];
  const totalStudents = studentsQuery.data?.pagination.total ?? 0;
  const totalPages = studentsQuery.data?.pagination.totalPages ?? 1;
  const departmentOptions = departmentOptionsQuery.data ?? [];

  async function collectAllStudents(): Promise<ApiAdminStudent[]> {
    const { page: _page, limit: _limit, ...filters } = studentsParams;
    const all: ApiAdminStudent[] = [];
    let page = 1;
    for (;;) {
      const res = await adminService.getStudents({ ...filters, page, limit: 200 });
      all.push(...res.data);
      if (!res.pagination?.hasNext || res.data.length === 0) break;
      page += 1;
    }
    return all;
  }

  const handleExport = async (format: 'csv' | 'excel') => {
    setIsExporting(true);
    try {
      const all = await collectAllStudents();
      if (all.length === 0) {
        toast({ title: 'Nothing to export', description: 'No students match the current filters.' });
        return;
      }
      const rows = all.map(studentExportRow);
      if (format === 'csv') downloadCsvTable(EXPORT_HEADERS, rows, 'students_export');
      else await downloadExcelTable(EXPORT_HEADERS, rows, 'students_export');
      toast({ title: 'Export ready', description: `${all.length} students exported.` });
    } catch {
      toast({ title: 'Export failed', description: 'Could not export students. Try again.', variant: 'destructive' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, roll number, or email..."
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={departmentFilter}
              onValueChange={(value) => {
                setDepartmentFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full md:w-[200px]">
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
            <Select
              value={statusFilter}
              onValueChange={(value) => {
                setStatusFilter(value as AdminStudentVerificationStatus | 'all');
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="verified">Verified</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={cgpaFilter}
              onValueChange={(value) => {
                setCgpaFilter(value);
                setCurrentPage(1);
              }}
            >
              <SelectTrigger className="w-full md:w-[130px]">
                <SelectValue placeholder="CGPA" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All CGPA</SelectItem>
                <SelectItem value="9+">9.0+</SelectItem>
                <SelectItem value="8-9">8.0 - 9.0</SelectItem>
                <SelectItem value="7-8">7.0 - 8.0</SelectItem>
                <SelectItem value="<7">Below 7.0</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={postingTypeFilter}
              onValueChange={(value) => {
                setPostingTypeFilter(value);
                setCurrentPage(1);
              }}
              disabled={postingTypesLoading}
            >
              <SelectTrigger className="w-full md:w-[180px]">
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
            <Button variant="outline" onClick={() => handleExport('csv')} disabled={isExporting || totalStudents === 0}>
              <Download className="mr-2 h-4 w-4" /> CSV
            </Button>
            <Button variant="outline" onClick={() => handleExport('excel')} disabled={isExporting || totalStudents === 0}>
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
            </Button>
          </div>

          <div className="mt-3">
            <AdminListScopeFilters
              institute={{ value: instituteFilter, onChange: (value) => { setInstituteFilter(value); setCurrentPage(1); } }}
              course={{ value: courseFilter, onChange: (value) => { setCourseFilter(value); setCurrentPage(1); } }}
              branch={{ value: branchFilter, onChange: (value) => { setBranchFilter(value); setCurrentPage(1); } }}
              semester={{ value: semesterFilter, onChange: (value) => { setSemesterFilter(value); setCurrentPage(1); } }}
              dateRange={{ value: dateRange, onChange: (range) => { setDateRange(range); setCurrentPage(1); } }}
            />
            <div className="mt-3">
              <Select value={companyFilter} onValueChange={(value) => { setCompanyFilter(value); setCurrentPage(1); }}>
                <SelectTrigger className="h-9 w-full text-xs sm:w-[240px]">
                  <SelectValue placeholder="Company" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Companies</SelectItem>
                  {companyOptions.map((company) => (
                    <SelectItem key={company.id} value={company.id}>{company.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Showing {students.length} of {totalStudents} students
        </p>
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <SortableTableHead label="Student" columnKey="full_name" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                <SortableTableHead label="Department" columnKey="department" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                <TableHead>CGPA</TableHead>
                <SortableTableHead label="Profile" columnKey="profile_completion_percentage" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                <SortableTableHead label="Status" columnKey="verification_status" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                <TableHead>Posting Types</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentsQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    Loading students...
                  </TableCell>
                </TableRow>
              ) : students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No students found for the selected filters.
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student) => {
                  const status = statusConfig[student.verificationStatus];
                  const StatusIcon = status.icon;
                  const profileIncomplete = isProfileIncomplete(student.profile_completion_percentage);
                  const eligibility = calculateEligibility(student.academicProfile);

                  return (
                    <TableRow key={student.student_id}>
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <div>
                            <p className="font-medium">{student.full_name}</p>
                            <p className="text-sm text-muted-foreground">{student.roll_number}</p>
                          </div>
                          {profileIncomplete && (
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Profile incomplete ({student.profile_completion_percentage}%)</p>
                                <p className="text-xs text-muted-foreground">{MIN_PROFILE_COMPLETION}% required</p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{student.department}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{formatCGPA(student.academicProfile.cgpa)}</span>
                          <Tooltip>
                            <TooltipTrigger>
                              <Badge
                                variant={
                                  eligibility.status === 'eligible'
                                    ? 'default'
                                    : eligibility.status === 'conditional'
                                      ? 'secondary'
                                      : 'destructive'
                                }
                                className="px-1 py-0 text-[10px]"
                              >
                                {eligibility.status === 'eligible'
                                  ? 'E'
                                  : eligibility.status === 'conditional'
                                    ? 'C'
                                    : 'NE'}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-medium">Eligibility: {eligibility.status.replace('_', ' ')}</p>
                              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Lock className="h-3 w-3" /> Auto-calculated (cannot override)
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress
                            value={student.profile_completion_percentage}
                            className={`h-2 w-16 ${profileIncomplete ? '[&>div]:bg-yellow-500' : ''}`}
                          />
                          <span
                            className={`text-sm ${
                              profileIncomplete
                                ? 'font-medium text-yellow-600 dark:text-yellow-400'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {student.profile_completion_percentage}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className={status.className}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {status.label}
                          </Badge>
                          {!student.policy_accepted && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="outline" className="border-red-500/20 bg-red-500/10 px-1 text-red-600">
                                  <FileCheck className="h-3 w-3" />
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>Policy not accepted</TooltipContent>
                            </Tooltip>
                          )}
                          {student.profile_blocked && (
                            <Tooltip>
                              <TooltipTrigger>
                                <Badge variant="destructive" className="gap-1 px-1">
                                  <Lock className="h-3 w-3" />
                                </Badge>
                              </TooltipTrigger>
                              <TooltipContent>Profile blocked</TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getStudentPostingTypes(student).length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {getStudentPostingTypes(student).map((type) => (
                              <PostingTypeBadge key={type} status={type} />
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedStudent(student)}>
                          <Eye className="mr-1 h-4 w-4" /> View
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      <Dialog open={Boolean(selectedStudent)} onOpenChange={() => setSelectedStudent(null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student Details</DialogTitle>
            <DialogDescription>View complete student profile information</DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {isProfileIncomplete(selectedStudent.profile_completion_percentage) && (
                  <Badge variant="outline" className="gap-1 border-yellow-500/20 bg-yellow-500/10 text-yellow-600">
                    <AlertTriangle className="h-3 w-3" />
                    Incomplete Profile ({selectedStudent.profile_completion_percentage}%)
                  </Badge>
                )}
                {!selectedStudent.policy_accepted && (
                  <Badge variant="destructive" className="gap-1">
                    <FileCheck className="h-3 w-3" />
                    Policy Not Accepted
                  </Badge>
                )}
                {selectedStudent.profile_blocked && (
                  <Badge variant="destructive" className="gap-1">
                    <Lock className="h-3 w-3" />
                    Profile Blocked
                  </Badge>
                )}
                {(() => {
                  const eligibility = calculateEligibility(selectedStudent.academicProfile);
                  return (
                    <Badge
                      variant={
                        eligibility.status === 'eligible'
                          ? 'default'
                          : eligibility.status === 'conditional'
                            ? 'secondary'
                            : 'destructive'
                      }
                      className="gap-1"
                    >
                      <Lock className="h-3 w-3" />
                      {eligibility.status === 'eligible'
                        ? 'Eligible'
                        : eligibility.status === 'conditional'
                          ? 'Conditional'
                          : 'Not Eligible'}
                      <span className="text-xs opacity-70">(auto)</span>
                    </Badge>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Full Name</p>
                  <p className="font-medium">{selectedStudent.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Roll Number</p>
                  <p className="font-medium">{selectedStudent.roll_number}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedStudent.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mobile</p>
                  <p className="font-medium">{selectedStudent.mobile || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Department</p>
                  <p className="font-medium">{selectedStudent.department}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Batch</p>
                  <p className="font-medium">{selectedStudent.batch_year}</p>
                </div>
              </div>

              <StudentProfileBlockSection
                studentId={selectedStudent.student_id}
                studentName={selectedStudent.full_name}
                profileBlocked={selectedStudent.profile_blocked}
                profileBlockReason={selectedStudent.profile_block_reason}
                onUpdatedStudent={(updatedStudent) => setSelectedStudent(updatedStudent)}
              />
              <div className="border-t pt-4">
                <h4 className="mb-3 font-medium">Academic Profile</h4>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">CGPA</p>
                    <p className="text-lg font-medium">{formatCGPA(selectedStudent.academicProfile.cgpa)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">10th %</p>
                    <p className="font-medium">
                      {selectedStudent.academicProfile.tenth_percentage
                        ? `${selectedStudent.academicProfile.tenth_percentage}%`
                        : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">12th %</p>
                    <p className="font-medium">
                      {selectedStudent.academicProfile.twelfth_percentage
                        ? `${selectedStudent.academicProfile.twelfth_percentage}%`
                        : 'Not set'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Backlogs</p>
                    <p className="font-medium">{selectedStudent.academicProfile.backlog_count}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Policy Accepted</p>
                    <p className={`font-medium ${selectedStudent.policy_accepted ? 'text-green-600' : 'text-red-600'}`}>
                      {selectedStudent.policy_accepted ? 'Yes' : 'No'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t pt-4">
                <ExpandableCard title="Personal and CRM Details">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailItem label="Institute" value={selectedStudent.institute_name} />
                    <DetailItem label="Course" value={selectedStudent.course_name} />
                    <DetailItem label="Program" value={selectedStudent.program_name} />
                    <DetailItem label="Current Semester" value={selectedStudent.current_semester} />
                    <DetailItem label="Admission Year" value={selectedStudent.admission_year} />
                    <DetailItem label="Category" value={selectedStudent.category} />
                    <DetailItem label="Aadhaar" value={selectedStudent.aadhaar_number} />
                    <DetailItem label="Parent Name" value={selectedStudent.parent_name} />
                    <DetailItem label="Parent Contact" value={selectedStudent.parent_contact_no} />
                    <DetailItem label="Blood Group" value={selectedStudent.blood_group} />
                    <DetailItem label="Attendance %" value={selectedStudent.overall_attendance_percentage} />
                    <DetailItem label="Date of Birth" value={formatDate(selectedStudent.date_of_birth)} />
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <DetailItem label="Current Address" value={selectedStudent.current_address} />
                    <DetailItem label="Permanent Address" value={selectedStudent.permanent_address} />
                  </div>
                </ExpandableCard>

                <ExpandableCard title="Skills">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <DetailItem label="Technical Skills" value={selectedStudent.skills?.technical_skills.join(', ')} />
                    <DetailItem label="Domain Interests" value={selectedStudent.skills?.domain_interests.join(', ')} />
                    <DetailItem label="Preferred Locations" value={selectedStudent.skills?.preferred_locations.join(', ')} />
                  </div>
                </ExpandableCard>

                <ExpandableCard title="Employment" count={selectedStudent.employments.length}>
                  {selectedStudent.employments.length === 0 ? <EmptyDetail label="employment records" /> : (
                    <div className="space-y-3">
                      {selectedStudent.employments.map((employment) => {
                        const closed = employment.status === 'closed';
                        return (
                          <div key={employment.id} className="rounded-md border p-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium">{employment.company_name || 'Company'}</p>
                              <Badge variant={closed ? 'secondary' : 'success'}>{closed ? 'Closed' : 'Active'}</Badge>
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {employment.designation || 'Role'} • {employmentTypeLabel(employment.employment_type)}
                              {employment.package_lpa != null ? ` • ${formatLPA(employment.package_lpa)}` : ''}
                            </p>
                            {closed && employment.closed_at ? (
                              <p className="mt-1 text-xs text-muted-foreground">Closed on {formatDate(employment.closed_at)}</p>
                            ) : null}
                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                              <DocumentLink href={employment.offer_letter_url} label="Offer letter" />
                              {closed ? (
                                <DocumentLink
                                  href={employment.completion_proof_url}
                                  label={employment.completion_proof_name || 'Completion proof'}
                                />
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </ExpandableCard>

                <ExpandableCard title="Placement">
                  <StudentPlacementSection
                    studentId={selectedStudent.student_id}
                    studentName={selectedStudent.full_name}
                    placement={selectedStudent.placement}
                    postingTypeOptOuts={selectedStudent.posting_type_opt_outs ?? []}
                    history={selectedStudent.placement_pref_history ?? []}
                    onUpdatedStudent={(updatedStudent) => setSelectedStudent(updatedStudent)}
                  />
                </ExpandableCard>

                <ExpandableCard title="Projects" count={selectedStudent.projects.length}>
                  {selectedStudent.projects.length === 0 ? <EmptyDetail label="projects" /> : (
                    <div className="space-y-3">
                      {selectedStudent.projects.map((project) => (
                        <div key={project.id} className="rounded-md border p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium">{project.title}</p>
                            {project.is_ongoing ? <Badge variant="outline">Ongoing</Badge> : null}
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {formatDateRange(project.start_date, project.end_date, project.is_ongoing)}
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">{project.description || 'No description'}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{project.technologies.join(', ') || 'No technologies'}</p>
                          <div className="mt-2 flex flex-wrap gap-3">
                            <DocumentLink href={project.github_url} label="GitHub" />
                            <DocumentLink href={project.demo_url} label="Demo" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ExpandableCard>

                <ExpandableCard title="Certifications" count={selectedStudent.certifications.length}>
                  {selectedStudent.certifications.length === 0 ? <EmptyDetail label="certifications" /> : (
                    <div className="space-y-3">
                      {selectedStudent.certifications.map((certification) => (
                        <div key={certification.id} className="rounded-md border p-3">
                          <p className="font-medium">{certification.name}</p>
                          <p className="text-sm text-muted-foreground">{certification.issuer} • {formatDate(certification.issue_date)}</p>
                          <div className="mt-2 flex flex-wrap gap-3">
                            <DocumentLink href={certification.credential_url} label="Credential URL" />
                            <DocumentLink href={certification.document_url} label={certification.document_name || 'Supporting document'} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ExpandableCard>

                <ExpandableCard title="Internships" count={selectedStudent.internships.length}>
                  {selectedStudent.internships.length === 0 ? <EmptyDetail label="internships" /> : (
                    <div className="space-y-3">
                      {selectedStudent.internships.map((internship) => (
                        <div key={internship.id} className="rounded-md border p-3">
                          <p className="font-medium">{internship.company_name} • {internship.role}</p>
                          <p className="text-sm text-muted-foreground">
                            {internship.internship_type} • {internship.status} • {formatDate(internship.start_date)} to {formatDate(internship.end_date)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Stipend: {internship.stipend_amount ? `₹${internship.stipend_amount.toLocaleString('en-IN')}` : '—'} • Issues: {internship.open_issue_count}/{internship.issue_count} open
                          </p>
                          <div className="mt-2">
                            <DocumentLink href={internship.certificate_url} label="Offer letter / certificate" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ExpandableCard>

                <ExpandableCard title="Applications and Offers" count={selectedStudent.applications.length + selectedStudent.offers.length}>
                  <div className="space-y-4">
                    <div>
                      <p className="mb-2 text-sm font-medium">Applications</p>
                      {selectedStudent.applications.length === 0 ? <EmptyDetail label="applications" /> : (
                        <div className="space-y-2">
                          {selectedStudent.applications.map((application) => (
                            <div key={application.id} className="rounded-md border p-3 text-sm">
                              <p className="font-medium">{application.posting.company_name} • {application.posting.role_name}</p>
                              <p className="text-muted-foreground">{application.current_stage} • Applied {formatDate(application.applied_at)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium">Offers / Jobs</p>
                      {selectedStudent.offers.length === 0 ? <EmptyDetail label="offers" /> : (
                        <div className="space-y-2">
                          {selectedStudent.offers.map((offer) => (
                            <div key={offer.id} className="rounded-md border p-3 text-sm">
                              <p className="font-medium">{offer.company_name} • {offer.role}</p>
                              <p className="text-muted-foreground">
                                {offer.type} • {offer.status} • {offer.ctc || offer.stipend || 'Compensation not set'}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </ExpandableCard>

                <ExpandableCard title="NOC and Policy" count={selectedStudent.noc_requests.length + selectedStudent.policy_acceptances.length}>
                  <div className="space-y-4">
                    <div>
                      <p className="mb-2 text-sm font-medium">NOC Requests</p>
                      {selectedStudent.noc_requests.length === 0 ? <EmptyDetail label="NOC requests" /> : (
                        <div className="space-y-2">
                          {selectedStudent.noc_requests.map((noc) => (
                            <div key={noc.id} className="rounded-md border p-3 text-sm">
                              <p className="font-medium">{noc.company_name} • {noc.role_title}</p>
                              <p className="text-muted-foreground">{noc.program} • {noc.status} • {formatDate(noc.created_at)}</p>
                              <div className="mt-2 flex flex-wrap gap-3">
                                <DocumentLink href={noc.offer_letter_url} label="Offer letter" />
                                <DocumentLink href={noc.certificate_url} label="NOC certificate" />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-medium">Policy Acceptances</p>
                      {selectedStudent.policy_acceptances.length === 0 ? <EmptyDetail label="policy acceptances" /> : (
                        <div className="space-y-2">
                          {selectedStudent.policy_acceptances.map((acceptance) => (
                            <div key={acceptance.id} className="rounded-md border p-3 text-sm">
                              <p className="font-medium">{acceptance.policy_title || 'Policy'}</p>
                              <p className="text-muted-foreground">v{acceptance.policy_version || '—'} • Accepted {formatDate(acceptance.accepted_at)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </ExpandableCard>

                <ExpandableCard title="Portfolio and No Dues">
                  <PortfolioAndNoDuesContent student={selectedStudent} />
                </ExpandableCard>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
