import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SortableTableHead } from '@/components/shared/SortableTableHead';
import { useClientSort } from '@/hooks/use-client-sort';
import { Layers, Search, Download, Mail, Phone, Users } from 'lucide-react';
import { toast } from 'sonner';
import { formatCGPA, formatDate } from '@/lib/formatters';
import { formatPostingTypeLabel } from '@/lib/postingModule';
import { downloadCsvTable } from '@/lib/spreadsheetExport';
import { useFacultyAssignedPrograms, useFacultyProgramStudents } from '@/hooks/use-faculty-api';
import type { FacultyProgramSource, FacultyProgramStudent } from '@/types/faculty';

const DASH = '—';

const cellOrDash = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return DASH;
  const text = String(value).trim();
  return text.length > 0 ? text : DASH;
};

const sourceLabel: Record<FacultyProgramSource, string> = {
  both: 'Interested + Applied',
  applied: 'Applied / Offered',
  interest: 'Interested',
};

export default function FacultyPrograms() {
  const [selectedProgram, setSelectedProgram] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const programsQuery = useFacultyAssignedPrograms();
  const programs = useMemo(() => programsQuery.data?.programs ?? [], [programsQuery.data]);

  useEffect(() => {
    if (programs.length === 0) return;
    if (!programs.some((program) => program.posting_type === selectedProgram)) {
      setSelectedProgram(programs[0].posting_type);
    }
  }, [programs, selectedProgram]);

  const studentsQuery = useFacultyProgramStudents(selectedProgram, {
    search: searchTerm || undefined,
  });
  const students = studentsQuery.data?.data ?? [];
  const { sorted: sortedStudents, sort_by, sort_order, onSort } = useClientSort(students, {
    student: (s) => s.full_name,
    institute: (s) => s.institute_name,
    course: (s) => s.course_name,
    branch: (s) => s.department,
    semester: (s) => s.semester,
    cgpa: (s) => s.cgpa,
    status: (s) => s.source,
  });

  const selectedProgramLabel = selectedProgram ? formatPostingTypeLabel(selectedProgram) : '';

  const handleExport = () => {
    const headers = [
      'Name', 'Enrollment No', 'Roll No', 'Gender', 'Institute', 'Course', 'Branch', 'Semester', 'Batch',
      'CGPA', '10th %', '12th %', 'Backlogs', 'Email', 'Mobile', 'Program', 'Status', 'Interested On Date',
      'Profile %',
    ];
    const rows = students.map((student) => [
      student.full_name,
      student.enrollment_number || '',
      student.roll_number || '',
      student.gender || '',
      student.institute_name || '',
      student.course_name || '',
      student.department || '',
      student.semester ?? '',
      student.batch || '',
      formatCGPA(student.cgpa, ''),
      student.tenth_percentage ?? '',
      student.twelfth_percentage ?? '',
      student.backlog_count ?? '',
      student.email || '',
      student.mobile || '',
      selectedProgramLabel,
      sourceLabel[student.source],
      student.registered_at ? formatDate(student.registered_at) : '',
      student.profile_completion_percentage,
    ]);

    downloadCsvTable(headers, rows, `program_${selectedProgram}`);
    toast.success(`Exported ${students.length} students`);
  };

  const sourceBadge = (student: FacultyProgramStudent) => {
    const variant = student.source === 'applied' ? 'outline' : 'secondary';
    return <Badge variant={variant}>{sourceLabel[student.source]}</Badge>;
  };

  return (
    <DashboardLayout
      title="My Programs"
      subtitle="Students enrolled in or interested in the posting types under your scope"
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" />
                  {selectedProgramLabel || 'Programs'}
                </CardTitle>
                <CardDescription>
                  {studentsQuery.data?.total ?? students.length} students under this program
                </CardDescription>
              </div>
              <Button onClick={handleExport} variant="outline" disabled={students.length === 0}>
                <Download className="mr-2 h-4 w-4" />
                Export List
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {programsQuery.isLoading ? (
              <div className="py-12 text-center text-muted-foreground">Loading your programs...</div>
            ) : programs.length === 0 ? (
              <div className="py-12 text-center">
                <Layers className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="text-lg font-medium">No programs map to your scope yet</h3>
                <p className="text-muted-foreground">
                  No posting type targets your assigned institute / course / branch. Contact the TPO cell.
                </p>
              </div>
            ) : (
              <>
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
                  <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                    <SelectTrigger className="w-full md:w-[260px]">
                      <SelectValue placeholder="Select program" />
                    </SelectTrigger>
                    <SelectContent>
                      {programs.map((program) => (
                        <SelectItem key={program.posting_type} value={program.posting_type}>
                          {formatPostingTypeLabel(program.posting_type)} ({program.count})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {studentsQuery.isLoading ? (
                  <div className="py-12 text-center text-muted-foreground">Loading students...</div>
                ) : students.length === 0 ? (
                  <div className="py-12 text-center">
                    <Users className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                    <h3 className="text-lg font-medium">No students found</h3>
                    <p className="text-muted-foreground">
                      No students in your scope are enrolled in or interested in this program yet.
                    </p>
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
                          <SortableTableHead label="Status" columnKey="status" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                          <TableHead>Contact</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sortedStudents.map((student) => (
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
                            <TableCell>{cellOrDash(student.semester)}</TableCell>
                            <TableCell>
                              <span className="font-medium">{formatCGPA(student.cgpa)}</span>
                            </TableCell>
                            <TableCell>{sourceBadge(student)}</TableCell>
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
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
