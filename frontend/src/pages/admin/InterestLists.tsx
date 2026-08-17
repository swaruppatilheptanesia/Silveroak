import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHead } from '@/components/shared/SortableTableHead';
import { useClientSort } from '@/hooks/use-client-sort';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Users, Search, Download, Mail, Phone, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatCGPA, formatDate, formatDateTime } from '@/lib/formatters';
import { downloadCsvTable } from '@/lib/spreadsheetExport';
import AdminListScopeFilters, { type DateRangeValue } from '@/components/admin/AdminListScopeFilters';
import {
  useAdminInterestRegistrations,
  useAdminInterestSummary,
  useApproveInterestRegistration,
  useWithdrawInterestRegistration,
} from '@/hooks/use-admin-api';
import { useMasterValues } from '@/hooks/use-master-api';
import {
  getPostingTypeInterestComparisonKey,
  getPostingTypeInterestLabel,
  mapInterestRegistrationToPostingTypeValue,
} from '@/lib/studentModule';
import type { ApiAdminStudent, ApiAdminStudentInterest, InterestRegistrationStatus } from '@/types/admin';

const STATUS_META: Record<InterestRegistrationStatus, { label: string; variant: 'success' | 'warning' | 'secondary' }> = {
  approved: { label: 'Approved', variant: 'success' },
  pending: { label: 'Pending', variant: 'warning' },
  withdrawn: { label: 'Withdrawn', variant: 'secondary' },
};

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

const DASH = '—';

const cellOrDash = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return DASH;
  const text = String(value).trim();
  return text.length > 0 ? text : DASH;
};

export default function InterestLists() {
  const [selectedInterest, setSelectedInterest] = useState('job');
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | InterestRegistrationStatus>('all');
  const [instituteFilter, setInstituteFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [branchFilter, setBranchFilter] = useState('');
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [academicYearFilter, setAcademicYearFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRangeValue>({ from: undefined, to: undefined });
  const [withdrawTarget, setWithdrawTarget] = useState<{ id: string; name: string } | null>(null);
  const [withdrawReason, setWithdrawReason] = useState('');

  const summaryQuery = useAdminInterestSummary();
  const postingTypeValuesQuery = useMasterValues('posting_type');
  const approveMutation = useApproveInterestRegistration();
  const withdrawMutation = useWithdrawInterestRegistration();
  const scopeParams = {
    institute: instituteFilter || undefined,
    course: courseFilter || undefined,
    branch: branchFilter || undefined,
    semester: semesterFilter === 'all' ? undefined : semesterFilter,
    academic_year: academicYearFilter === 'all' ? undefined : academicYearFilter,
    date_from: dateRange.from ? dateRange.from.toISOString() : undefined,
    date_to: dateRange.to ? dateRange.to.toISOString() : undefined,
  };
  const registrationsQuery = useAdminInterestRegistrations({
    posting_type: selectedInterest,
    search: searchTerm || undefined,
    department: departmentFilter === 'all' ? undefined : departmentFilter,
    status: statusFilter === 'all' ? undefined : statusFilter,
    ...scopeParams,
  });
  // Department options must stay stable regardless of the chosen department/search,
  // so derive them from a program-only query (the backend returns [] when no
  // posting_type is supplied, which is why the old unfiltered query was always empty).
  const programStudentsQuery = useAdminInterestRegistrations({ posting_type: selectedInterest });

  const summary = summaryQuery.data ?? [];
  const postingTypeSummary = useMemo(() => {
    const counts = new Map<string, number>();

    summary.forEach((interest) => {
      const postingTypeValue = mapInterestRegistrationToPostingTypeValue(interest.interest_type);
      counts.set(postingTypeValue, (counts.get(postingTypeValue) ?? 0) + interest.count);
    });

    const values = Array.from(new Set([
      ...(postingTypeValuesQuery.data ?? []),
      ...Array.from(counts.keys()),
    ]));
    const fallbackValues = values.length > 0 ? values : ['job', 'internship', 'stipend_internship'];

    return fallbackValues.map((value) => ({
      posting_type: value,
      label: getPostingTypeInterestLabel(value),
      count: counts.get(value) ?? 0,
    }));
  }, [postingTypeValuesQuery.data, summary]);

  const filteredStudents = registrationsQuery.data?.data ?? [];
  const departments = useMemo(
    () => [
      ...new Set(
        (programStudentsQuery.data?.data ?? [])
          .map((student) => student.department)
          .filter((value): value is string => Boolean(value && value.trim())),
      ),
    ].sort(),
    [programStudentsQuery.data],
  );

  useEffect(() => {
    if (postingTypeSummary.length === 0) {
      return;
    }

    if (!postingTypeSummary.some((item) => item.posting_type === selectedInterest)) {
      setSelectedInterest(postingTypeSummary[0].posting_type);
    }
  }, [postingTypeSummary, selectedInterest]);

  // Reset the department filter when switching programs so a stale department
  // (absent from the new program) doesn't silently empty the list.
  useEffect(() => {
    setDepartmentFilter('all');
  }, [selectedInterest]);

  const selectedInterestLabel = postingTypeSummary.find((interest) => interest.posting_type === selectedInterest)?.label
    || getPostingTypeInterestLabel(selectedInterest);

  const interestFor = (student: ApiAdminStudent): ApiAdminStudentInterest | null => {
    const key = getPostingTypeInterestComparisonKey(selectedInterest);
    return (
      student.interests.find(
        (interest) => getPostingTypeInterestComparisonKey(interest.interest_type) === key,
      ) ?? null
    );
  };

  const registeredAtFor = (student: ApiAdminStudent): string | null => interestFor(student)?.registered_at ?? null;

  async function handleApprove(interestId: string) {
    try {
      await approveMutation.mutateAsync(interestId);
      toast.success('Registration approved.');
    } catch (error) {
      toast.error(errorMessage(error, 'Unable to approve this registration.'));
    }
  }

  async function handleConfirmWithdraw() {
    if (!withdrawTarget) return;
    try {
      await withdrawMutation.mutateAsync({ id: withdrawTarget.id, reason: withdrawReason.trim() || undefined });
      toast.success('Registration withdrawn.');
      setWithdrawTarget(null);
      setWithdrawReason('');
    } catch (error) {
      toast.error(errorMessage(error, 'Unable to withdraw this registration.'));
    }
  }

  const semesterFor = (student: ApiAdminStudent): string | null =>
    student.current_semester
    ?? (student.academicProfile.semester != null ? String(student.academicProfile.semester) : null);

  const { sorted: sortedStudents, sort_by, sort_order, onSort } = useClientSort(filteredStudents, {
    student: (s) => s.full_name,
    institute: (s) => s.institute_name,
    course: (s) => s.course_name,
    branch: (s) => s.department,
    semester: (s) => semesterFor(s),
    cgpa: (s) => s.academicProfile.cgpa,
    registered_on: (s) => { const at = registeredAtFor(s); return at ? new Date(at) : null; },
    status: (s) => interestFor(s)?.status,
  });

  const handleExport = () => {
    const headers = [
      'Name', 'Enrollment No', 'Roll No', 'Institute', 'Course', 'Branch', 'Program',
      'Semester', 'Batch', 'CGPA', '10th %', '12th %', 'Backlogs', 'Category', 'Gender',
      'Email', 'Mobile', 'Interest Type', 'Registered On', 'Profile %',
    ];
    const rows = filteredStudents.map((student) => {
      const registeredAt = registeredAtFor(student);
      return [
        student.full_name,
        student.enrollment_number || '',
        student.roll_number || '',
        student.institute_name || '',
        student.course_name || '',
        student.department || '',
        student.program_name || '',
        semesterFor(student) || '',
        student.batch_year || '',
        formatCGPA(student.academicProfile.cgpa, ''),
        student.academicProfile.tenth_percentage ?? '',
        student.academicProfile.twelfth_percentage ?? '',
        student.academicProfile.backlog_count ?? '',
        student.category || '',
        student.gender || '',
        student.email || '',
        student.mobile || '',
        selectedInterestLabel,
        registeredAt ? formatDate(registeredAt) : '',
        student.profile_completion_percentage,
      ];
    });

    downloadCsvTable(headers, rows, `interest_list_${selectedInterest}`);
    toast.success(`Exported ${filteredStudents.length} students`);
  };

  return (
    <DashboardLayout
        title="Interest Lists"
        subtitle="View and export students by interest type"
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  {selectedInterestLabel}
                </CardTitle>
                <CardDescription>
                  {registrationsQuery.data?.total ?? filteredStudents.length} students registered for this interest
                </CardDescription>
              </div>
              <Button onClick={handleExport} variant="outline" disabled={filteredStudents.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Export List
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6 flex flex-col gap-4 md:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search by name or roll number..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedInterest} onValueChange={setSelectedInterest}>
                <SelectTrigger className="w-full md:w-[240px]">
                  <SelectValue placeholder="Select program" />
                </SelectTrigger>
                <SelectContent>
                  {postingTypeSummary.map((interest) => (
                    <SelectItem key={interest.posting_type} value={interest.posting_type}>
                      {interest.label} ({interest.count})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="All Departments" />
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
              <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending approval</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="withdrawn">Withdrawn</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="mb-6">
              <AdminListScopeFilters
                institute={{ value: instituteFilter, onChange: setInstituteFilter }}
                course={{ value: courseFilter, onChange: setCourseFilter }}
                branch={{ value: branchFilter, onChange: setBranchFilter }}
                semester={{ value: semesterFilter, onChange: setSemesterFilter }}
                academicYear={{ value: academicYearFilter, onChange: setAcademicYearFilter }}
                dateRange={{ value: dateRange, onChange: setDateRange }}
              />
            </div>

            {registrationsQuery.isLoading ? (
              <div className="py-12 text-center text-muted-foreground">
                Loading interest registrations...
              </div>
            ) : filteredStudents.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-medium">No students found</h3>
                <p className="text-muted-foreground">No students have registered for this posting type yet.</p>
              </div>
            ) : (
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead label="Student" columnKey="student" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <SortableTableHead label="Institute" columnKey="institute" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <SortableTableHead label="Course" columnKey="course" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <SortableTableHead label="Branch" columnKey="branch" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <SortableTableHead label="Semester" columnKey="semester" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <SortableTableHead label="CGPA" columnKey="cgpa" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <SortableTableHead label="Registered On" columnKey="registered_on" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <SortableTableHead label="Status" columnKey="status" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <TableHead>Contact</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedStudents.map((student) => {
                      const registeredAt = registeredAtFor(student);
                      const interest = interestFor(student);
                      const status = interest?.status;
                      const statusMeta = status ? STATUS_META[status] : null;
                      const actionsPending = approveMutation.isPending || withdrawMutation.isPending;

                      return (
                        <TableRow key={student.student_id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{student.full_name}</p>
                              <p className="text-sm text-muted-foreground">{cellOrDash(student.roll_number)}</p>
                            </div>
                          </TableCell>
                          <TableCell>{cellOrDash(student.institute_name)}</TableCell>
                          <TableCell>{cellOrDash(student.course_name)}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{cellOrDash(student.department)}</Badge>
                          </TableCell>
                          <TableCell>{cellOrDash(semesterFor(student))}</TableCell>
                          <TableCell>
                            <span className="font-medium">{formatCGPA(student.academicProfile.cgpa)}</span>
                          </TableCell>
                          <TableCell>{registeredAt ? formatDate(registeredAt) : DASH}</TableCell>
                          <TableCell>
                            {statusMeta ? <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge> : DASH}
                            {interest && (status === 'withdrawn' || status === 'approved') && interest.reviewed_at && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                {status === 'withdrawn' ? 'Withdrawn' : 'Approved'} {formatDateTime(interest.reviewed_at)}
                                {interest.reviewed_by_name ? ` by ${interest.reviewed_by_name}` : ''}
                              </p>
                            )}
                            {interest && status === 'withdrawn' && interest.status_reason && (
                              <p className="mt-0.5 text-xs italic text-muted-foreground">Reason: {interest.status_reason}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {student.email ? (
                                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                  <a href={`mailto:${student.email}`}>
                                    <Mail className="h-4 w-4" />
                                  </a>
                                </Button>
                              ) : (
                                <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                                  <Mail className="h-4 w-4" />
                                </Button>
                              )}
                              {student.mobile ? (
                                <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                  <a href={`tel:${student.mobile}`}>
                                    <Phone className="h-4 w-4" />
                                  </a>
                                </Button>
                              ) : (
                                <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                                  <Phone className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              {interest && status !== 'approved' && (
                                <Button
                                  size="sm"
                                  onClick={() => void handleApprove(interest.id)}
                                  disabled={actionsPending}
                                >
                                  <CheckCircle2 className="mr-1.5 h-4 w-4" />
                                  {status === 'withdrawn' ? 'Reinstate' : 'Approve'}
                                </Button>
                              )}
                              {interest && status !== 'withdrawn' && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    setWithdrawReason('');
                                    setWithdrawTarget({ id: interest.id, name: student.full_name });
                                  }}
                                  disabled={actionsPending}
                                >
                                  <XCircle className="mr-1.5 h-4 w-4" />
                                  Withdraw
                                </Button>
                              )}
                              {!interest && <span className="text-sm text-muted-foreground">{DASH}</span>}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={withdrawTarget !== null} onOpenChange={(open) => { if (!open) setWithdrawTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Withdraw registration</DialogTitle>
            <DialogDescription>
              Withdraw {withdrawTarget?.name ?? 'this student'} from {selectedInterestLabel}? They will no longer be
              able to apply under this posting type. They can register again later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              value={withdrawReason}
              onChange={(event) => setWithdrawReason(event.target.value)}
              rows={4}
              placeholder="Reason (optional) — shared with the student in their notification."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawTarget(null)} disabled={withdrawMutation.isPending}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void handleConfirmWithdraw()} disabled={withdrawMutation.isPending}>
              Withdraw
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
