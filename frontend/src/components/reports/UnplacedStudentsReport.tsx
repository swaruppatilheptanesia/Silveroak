import { useMemo, useState } from 'react';
import { AlertTriangle, Download, Search, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useUnplacedStudentsReport } from '@/hooks/use-report-analytics-api';
import { downloadCSV } from './ReportToolbar';

type QueryParams = {
  institute?: string;
  course?: string;
  branch?: string;
  semester?: string;
  batch?: string;
  search?: string;
  verified_only?: boolean;
};

function formatCgpa(value: number | null | undefined) {
  if (typeof value !== 'number' || value <= 0) return '—';
  return value.toFixed(2);
}

export default function UnplacedStudentsReport() {
  const [instituteFilter, setInstituteFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [semesterFilter, setSemesterFilter] = useState('all');
  const [batchFilter, setBatchFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const queryParams = useMemo<QueryParams>(() => ({
    institute: instituteFilter === 'all' ? undefined : instituteFilter,
    course: courseFilter === 'all' ? undefined : courseFilter,
    branch: branchFilter === 'all' ? undefined : branchFilter,
    semester: semesterFilter === 'all' ? undefined : semesterFilter,
    batch: batchFilter === 'all' ? undefined : batchFilter,
    search: searchQuery || undefined,
    verified_only: verifiedOnly || undefined,
  }), [batchFilter, branchFilter, courseFilter, instituteFilter, searchQuery, semesterFilter, verifiedOnly]);

  const { data, isLoading } = useUnplacedStudentsReport(queryParams);

  const students: any[] = data?.students ?? [];
  const branchBreakdown = data?.branch_breakdown ?? data?.dept_breakdown ?? [];
  const stats = data?.stats ?? { total: 0, verified: 0, pending: 0, rejected: 0 };

  const institutes = useMemo(
    () => Array.from(new Set(students.map((student: any) => student.institute).filter(Boolean))).sort(),
    [students],
  );
  const courses = useMemo(
    () => Array.from(new Set(students.map((student: any) => student.course).filter(Boolean))).sort(),
    [students],
  );
  const branches = useMemo(
    () => Array.from(new Set(students.map((student: any) => student.department).filter(Boolean))).sort(),
    [students],
  );
  const semesters = useMemo(
    () => Array.from(new Set(students.map((student: any) => student.semester).filter((value: any) => value !== null && value !== undefined)))
      .sort((a: any, b: any) => Number(a) - Number(b)),
    [students],
  );
  const batches = useMemo(
    () => Array.from(new Set(students.map((student: any) => student.batch).filter(Boolean))).sort(),
    [students],
  );

  const handleExport = () => {
    const rows = students.map((student: any) => (
      `"${student.full_name}",${student.roll_number},${student.email},"${student.institute ?? ''}","${student.course ?? ''}","${student.department}",${student.semester ?? ''},${formatCgpa(student.cgpa)},${student.backlog_count ?? 0},${student.profile_completion_percentage}%,${student.verification_status}`
    ));

    downloadCSV(
      `Name,Enrollment Number,Email,Institute,Course,Branch,Semester,CGPA,Backlogs,Profile %,Verified\n${rows.join('\n')}`,
      'unplaced_students',
    );
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            Placement Analytics
          </div>
          <h3 className="text-xl font-semibold">Unplaced Students</h3>
          <p className="text-sm text-muted-foreground">
            Live unplaced-student data from the backend.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Total Unplaced</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Verified</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.verified}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Rejected</p>
            <p className="text-2xl font-bold text-destructive">{stats.rejected}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search student, roll number or email..."
                className="pl-9 h-9 w-[260px] text-xs"
              />
            </div>
            <Select value={instituteFilter} onValueChange={setInstituteFilter}>
              <SelectTrigger className="h-9 w-[190px] text-xs">
                <SelectValue placeholder="Institute" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Institutes</SelectItem>
                {institutes.map((institute) => (
                  <SelectItem key={institute} value={institute}>
                    {institute}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger className="h-9 w-[170px] text-xs">
                <SelectValue placeholder="Course" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {courses.map((course) => (
                  <SelectItem key={course} value={course}>
                    {course}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger className="h-9 w-[170px] text-xs">
                <SelectValue placeholder="Branch" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {branches.map((branch) => (
                  <SelectItem key={branch} value={branch}>
                    {branch}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={semesterFilter} onValueChange={setSemesterFilter}>
              <SelectTrigger className="h-9 w-[130px] text-xs">
                <SelectValue placeholder="Semester" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Semesters</SelectItem>
                {semesters.map((semester: any) => (
                  <SelectItem key={String(semester)} value={String(semester)}>
                    Semester {semester}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={batchFilter} onValueChange={setBatchFilter}>
              <SelectTrigger className="h-9 w-[160px] text-xs">
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
            <div className="flex items-center gap-2">
              <Checkbox
                id="verified-only"
                checked={verifiedOnly}
                onCheckedChange={(checked) => setVerifiedOnly(Boolean(checked))}
              />
              <label htmlFor="verified-only" className="text-xs cursor-pointer">
                Verified only
              </label>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {branchBreakdown.map(([branch, count]: [string, number]) => (
              <Badge
                key={branch}
                variant="outline"
                className="cursor-pointer text-xs py-1"
                onClick={() => setBranchFilter(branchFilter === branch ? 'all' : branch)}
              >
                <AlertTriangle className="mr-1 h-3 w-3 text-amber-500" />
                {branch}: {count}
              </Badge>
            ))}
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Institute</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead className="text-center">Semester</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead className="text-right">CGPA</TableHead>
                  <TableHead className="text-right">Backlogs</TableHead>
                  <TableHead className="text-right">Profile</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                      Loading unplaced students...
                    </TableCell>
                  </TableRow>
                ) : students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                      All students are placed or no students match the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  students.map((student: any) => (
                    <TableRow key={student.student_id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{student.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {student.roll_number} • {student.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{student.institute ?? '—'}</TableCell>
                      <TableCell className="text-sm">{student.course ?? '—'}</TableCell>
                      <TableCell className="text-sm">{student.department}</TableCell>
                      <TableCell className="text-center text-sm">{student.semester ?? '—'}</TableCell>
                      <TableCell className="text-sm">{student.batch}</TableCell>
                      <TableCell className="text-right font-medium">{formatCgpa(student.cgpa)}</TableCell>
                      <TableCell className="text-right">
                        {student.backlog_count > 0 ? (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive">
                            {student.backlog_count}
                          </Badge>
                        ) : (
                          <span className="text-emerald-600">0</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{student.profile_completion_percentage}%</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            student.verification_status === 'verified'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : student.verification_status === 'pending'
                                ? 'bg-amber-500/10 text-amber-600'
                                : 'bg-destructive/10 text-destructive'
                          }
                        >
                          {student.verification_status}
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
    </div>
  );
}
