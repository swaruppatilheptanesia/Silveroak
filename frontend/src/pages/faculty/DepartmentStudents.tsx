import { useDeferredValue, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EmptyState } from '@/components/shared/EmptyState';
import AdminListScopeFilters, { type DateRangeValue } from '@/components/admin/AdminListScopeFilters';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHead } from '@/components/shared/SortableTableHead';
import { useServerSort } from '@/hooks/use-server-sort';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertTriangle,
  Calendar,
  Download,
  Eye,
  Filter,
  GraduationCap,
  Loader2,
  Mail,
  MapPin,
  Phone,
  Search,
  Users,
} from 'lucide-react';
import { PortfolioReadOnlyView } from '@/components/portfolio/PortfolioReadOnlyView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { useAuth } from '@/contexts/AuthContext';
import {
  useFacultyStudentDetail,
  useFacultyStudents,
} from '@/hooks/use-faculty-api';
import { facultyService } from '@/services/facultyService';
import { formatApiErrorMessage } from '@/lib/apiError';
import { formatCGPA, formatDate, getInitials } from '@/lib/formatters';
import { downloadCsvTable, downloadExcelTable } from '@/lib/spreadsheetExport';
import type { FacultyEligibilityStatus, FacultyStudentListItem } from '@/types/faculty';

// Backend caps the pagination `limit` at 100 (paginationSchema.max(100)), so exports page through
// the list endpoint at this size rather than one oversized fetch (which 400s).
const EXPORT_PAGE_SIZE = 100;
const EXPORT_HEADERS = ['Name', 'Enrollment No', 'Email', 'Department', 'Institute', 'Semester', 'CGPA', 'Backlogs', 'Profile Completion', 'Eligibility Status'];

export default function DepartmentStudents() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearch = useDeferredValue(searchQuery);
  const [eligibilityFilter, setEligibilityFilter] = useState<'all' | FacultyEligibilityStatus>('all');
  const [instituteFilter, setInstituteFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRangeValue>({ from: undefined, to: undefined });
  const [page, setPage] = useState(1);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const sharedFilters = useMemo(
    () => ({
      search: deferredSearch || undefined,
      eligibility_status: eligibilityFilter === 'all' ? undefined : eligibilityFilter,
      institute: instituteFilter || undefined,
      course: courseFilter || undefined,
      branch: branchFilter || undefined,
      semester: semesterFilter === 'all' ? undefined : semesterFilter,
      date_from: dateRange.from ? dateRange.from.toISOString() : undefined,
      date_to: dateRange.to ? dateRange.to.toISOString() : undefined,
    }),
    [branchFilter, courseFilter, dateRange.from, dateRange.to, deferredSearch, eligibilityFilter, instituteFilter, semesterFilter],
  );

  const { sort_by, sort_order, onSort } = useServerSort<
    'full_name' | 'profile_completion_percentage' | 'verification_status'
  >('full_name', 'asc', () => setPage(1));
  const studentsQuery = useFacultyStudents({
    page,
    limit: 20,
    ...sharedFilters,
    sort_by,
    sort_order,
  });

  const detailQuery = useFacultyStudentDetail(selectedStudentId || '');
  const students = studentsQuery.data?.data ?? [];
  const totalStudents = studentsQuery.data?.pagination.total ?? 0;
  const selectedStudentSummary = students.find((student) => student.id === selectedStudentId) ?? null;
  const selectedStudent = detailQuery.data ?? selectedStudentSummary;

  async function handleExport(exportFormat: 'csv' | 'excel') {
    if (isExporting) return;
    setIsExporting(true);
    try {
      // Page through the list endpoint (limit 100 = backend max) and accumulate every matching
      // student. facultyService pagination is snake/camel-broken (totalPages is undefined at runtime),
      // so derive the page count from the reliable `total` field.
      const rows: FacultyStudentListItem[] = [];
      const firstPage = await facultyService.getStudents({
        ...sharedFilters,
        page: 1,
        limit: EXPORT_PAGE_SIZE,
      });
      rows.push(...firstPage.data);
      const total = firstPage.pagination.total ?? firstPage.data.length;
      const totalPages = Math.max(1, Math.ceil(total / EXPORT_PAGE_SIZE));
      for (let nextPage = 2; nextPage <= totalPages; nextPage += 1) {
        const response = await facultyService.getStudents({
          ...sharedFilters,
          page: nextPage,
          limit: EXPORT_PAGE_SIZE,
        });
        if (response.data.length === 0) break; // runaway guard
        rows.push(...response.data);
      }

      if (rows.length === 0) {
        toast.info('No students match the current filters.');
        return;
      }

      const tableRows = rows.map((student) => [
        student.name,
        student.enrollment_number,
        student.email,
        student.department,
        (student as { institute_name?: string | null }).institute_name ?? '',
        student.semester ?? '',
        formatCGPA(student.cgpa, ''),
        student.backlogs,
        `${student.profileCompletion}%`,
        student.eligibilityStatus,
      ]);

      if (exportFormat === 'excel') {
        await downloadExcelTable(EXPORT_HEADERS, tableRows, 'faculty_department_students');
      } else {
        downloadCsvTable(EXPORT_HEADERS, tableRows, 'faculty_department_students');
      }
      toast.success(`Exported ${rows.length} student${rows.length === 1 ? '' : 's'}.`);
    } catch (error) {
      toast.error(formatApiErrorMessage(error, 'Unable to export student list.'));
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <DashboardLayout 
      title="Department Students" 
      subtitle={`View student profiles in ${studentsQuery.data?.department || user?.department || 'your department'}`}
    >
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Student Directory
              </CardTitle>
              <CardDescription>Read-only access to student profiles</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => handleExport('csv')}
                disabled={isExporting || studentsQuery.isLoading || totalStudents === 0}
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Export CSV
              </Button>
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => handleExport('excel')}
                disabled={isExporting || studentsQuery.isLoading || totalStudents === 0}
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Export Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="mb-6 space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or roll number..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setPage(1);
                  }}
                  className="pl-9"
                />
              </div>
              <Select
                value={eligibilityFilter}
                onValueChange={(value) => {
                  setEligibilityFilter(value as 'all' | FacultyEligibilityStatus);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full md:w-48">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  <SelectItem value="eligible">Eligible</SelectItem>
                  <SelectItem value="conditional">Conditional</SelectItem>
                  <SelectItem value="not_eligible">Not Eligible</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <AdminListScopeFilters
              institute={{ value: instituteFilter, onChange: (value) => { setInstituteFilter(value); setPage(1); } }}
              course={{ value: courseFilter, onChange: (value) => { setCourseFilter(value); setPage(1); } }}
              branch={{ value: branchFilter, onChange: (value) => { setBranchFilter(value); setPage(1); } }}
              semester={{ value: semesterFilter, onChange: (value) => { setSemesterFilter(value); setPage(1); } }}
              dateRange={{ value: dateRange, onChange: (range) => { setDateRange(range); setPage(1); } }}
            />
          </div>

          {/* Table */}
          <div className="rounded-md border">
            {studentsQuery.isLoading ? (
              <div className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading students...
              </div>
            ) : studentsQuery.error ? (
              <div className="flex items-start gap-3 p-6 text-sm text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <p>{studentsQuery.error instanceof Error ? studentsQuery.error.message : 'Unable to load students.'}</p>
              </div>
            ) : students.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No students found"
                description="No department students matched the current filters."
                className="py-16"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead label="Student" columnKey="full_name" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                    <TableHead>Enrollment No</TableHead>
                    <TableHead className="text-center">CGPA</TableHead>
                    <TableHead className="text-center">Backlogs</TableHead>
                    <SortableTableHead label="Profile" columnKey="profile_completion_percentage" className="text-center" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                    <SortableTableHead label="Status" columnKey="verification_status" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                            <span className="text-xs font-medium text-primary">
                              {getInitials(student.name)}
                            </span>
                          </div>
                          <span className="font-medium">{student.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{student.enrollment_number}</TableCell>
                      <TableCell className="text-center">{formatCGPA(student.cgpa, '—')}</TableCell>
                      <TableCell className="text-center">
                        {student.backlogs > 0 ? (
                          <Badge variant="destructive">{student.backlogs}</Badge>
                        ) : (
                          <Badge variant="secondary">0</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">{student.profileCompletion}%</TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            student.eligibilityStatus === 'eligible' ? 'default' : 
                            student.eligibilityStatus === 'conditional' ? 'secondary' : 'destructive'
                          }
                        >
                          {student.eligibilityStatus === 'eligible' ? 'Eligible' : 
                           student.eligibilityStatus === 'conditional' ? 'Conditional' : 'Not Eligible'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setSelectedStudentId(student.id)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            Showing {students.length} of {totalStudents} students
          </div>

          {(studentsQuery.data?.pagination.totalPages ?? 1) > 1 && (
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">
                Page {studentsQuery.data?.pagination.page} of {studentsQuery.data?.pagination.totalPages}
              </p>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        if (page > 1) {
                          setPage((current) => current - 1);
                        }
                      }}
                    />
                  </PaginationItem>
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      onClick={(event) => {
                        event.preventDefault();
                        if (page < (studentsQuery.data?.pagination.totalPages ?? 1)) {
                          setPage((current) => current + 1);
                        }
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student Detail Modal */}
      <Dialog open={!!selectedStudentId} onOpenChange={(open) => {
        if (!open) {
          setSelectedStudentId(null);
        }
      }}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student Profile (Read-Only)</DialogTitle>
            <DialogDescription>Viewing details for {selectedStudent?.name}</DialogDescription>
          </DialogHeader>
          
          {detailQuery.isLoading && !selectedStudent ? (
            <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading student profile...
            </div>
          ) : detailQuery.error && !selectedStudent ? (
            <div className="flex items-start gap-3 py-6 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>{detailQuery.error instanceof Error ? detailQuery.error.message : 'Unable to load student details.'}</p>
            </div>
          ) : selectedStudent ? (
            <Tabs key={selectedStudent.id} defaultValue="details" className="space-y-4">
              <TabsList>
                <TabsTrigger value="details">Profile</TabsTrigger>
                <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-6">
                {/* Header */}
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-xl font-bold text-primary">
                      {getInitials(selectedStudent.name)}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{selectedStudent.name}</h3>
                    <p className="text-muted-foreground">{selectedStudent.rollNumber}</p>
                    <Badge 
                      className="mt-2"
                      variant={
                        selectedStudent.eligibilityStatus === 'eligible' ? 'default' : 
                        selectedStudent.eligibilityStatus === 'conditional' ? 'secondary' : 'destructive'
                      }
                    >
                      {selectedStudent.eligibilityStatus === 'eligible' ? 'Eligible for Placements' : 
                       selectedStudent.eligibilityStatus === 'conditional' ? 'Conditional Eligibility' : 'Not Eligible'}
                    </Badge>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedStudent.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedStudent.mobile || 'Not provided'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedStudent.dateOfBirth ? formatDate(selectedStudent.dateOfBirth) : 'Not provided'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{selectedStudent.address || 'Not provided'}</span>
                  </div>
                </div>

                {/* Academic Info */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardContent className="pt-4">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">CGPA</span>
                      </div>
                      <p className="text-2xl font-bold mt-1">{formatCGPA(selectedStudent.cgpa, '—')}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <span className="text-sm text-muted-foreground">Semester</span>
                      <p className="text-2xl font-bold mt-1">{selectedStudent.semester}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-4">
                      <span className="text-sm text-muted-foreground">Profile</span>
                      <p className="text-2xl font-bold mt-1">{selectedStudent.profileCompletion}%</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Skills */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedStudent.skills.length === 0 ? (
                      <Badge variant="outline">No skills added</Badge>
                    ) : (
                      selectedStudent.skills.map((skill) => (
                        <Badge key={skill} variant="outline">{skill}</Badge>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="portfolio">
                <PortfolioReadOnlyView studentId={selectedStudent.id} />
              </TabsContent>
            </Tabs>
          ) : null}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
