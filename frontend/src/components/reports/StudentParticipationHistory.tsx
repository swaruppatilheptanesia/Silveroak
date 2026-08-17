import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Users, UserCheck, CalendarDays, ChevronDown, ChevronUp } from 'lucide-react';
import { eventTypeLabels, getEventTypeLabel } from '@/types/event';
import { useStudentParticipationReport } from '@/hooks/use-report-analytics-api';
import { ReportToolbar, downloadCSV, type DateRange } from './ReportToolbar';

type QueryParams = {
  from?: Date;
  to?: Date;
  institute?: string;
  course?: string;
  branch?: string;
  type?: string;
  search?: string;
};

interface StudentSummary {
  studentId: string;
  studentName: string;
  rollNumber: string;
  institute: string;
  course: string;
  branch: string;
  totalEvents: number;
  present: number;
  absent: number;
  late: number;
  pending: number;
  attendanceRate: number;
  events: {
    eventId: string;
    eventTitle: string;
    companyName: string;
    type: string;
    date: string;
    attendance: string | undefined;
  }[];
}

export default function StudentParticipationHistory() {
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [searchQuery, setSearchQuery] = useState('');
  const [instituteFilter, setInstituteFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  const queryParams = useMemo<QueryParams>(() => ({
    from: dateRange.from,
    to: dateRange.to,
    institute: instituteFilter === 'all' ? undefined : instituteFilter,
    course: courseFilter === 'all' ? undefined : courseFilter,
    branch: branchFilter === 'all' ? undefined : branchFilter,
    type: typeFilter === 'all' ? undefined : typeFilter,
    search: searchQuery || undefined,
  }), [branchFilter, courseFilter, dateRange.from, dateRange.to, instituteFilter, searchQuery, typeFilter]);

  const { data, isLoading } = useStudentParticipationReport(queryParams);

  const studentSummaries: StudentSummary[] = useMemo(() => {
    return (data?.students ?? []).map((student: any) => ({
      studentId: student.student_id,
      studentName: student.full_name,
      rollNumber: student.roll_number,
      institute: student.institute ?? '—',
      course: student.course ?? '—',
      branch: student.branch,
      totalEvents: student.total_events,
      present: student.present,
      absent: student.absent,
      late: student.late,
      pending: student.pending,
      attendanceRate: student.attendance_rate,
      events: (student.events ?? []).map((event: any) => ({
        eventId: event.event_id,
        eventTitle: event.event_title,
        companyName: event.company_name,
        type: event.type,
        date: event.date,
        attendance: event.attendance,
      })),
    }));
  }, [data]);

  const allInstitutes = useMemo(() => {
    return Array.from(new Set(studentSummaries.map((student) => student.institute).filter((value) => value && value !== '—'))).sort();
  }, [studentSummaries]);
  const allCourses = useMemo(() => {
    return Array.from(new Set(studentSummaries.map((student) => student.course).filter((value) => value && value !== '—'))).sort();
  }, [studentSummaries]);
  const allBranches = useMemo(() => {
    return Array.from(new Set(studentSummaries.map((student) => student.branch).filter(Boolean))).sort();
  }, [studentSummaries]);

  const overallStats = useMemo(() => {
    return {
      totalStudents: studentSummaries.length,
      totalParticipations: studentSummaries.reduce((sum, student) => sum + student.totalEvents, 0),
      avgEvents: studentSummaries.length > 0 ? (studentSummaries.reduce((sum, student) => sum + student.totalEvents, 0) / studentSummaries.length).toFixed(1) : '0',
      avgRate: studentSummaries.length > 0 ? Math.round(studentSummaries.reduce((sum, student) => sum + student.attendanceRate, 0) / studentSummaries.length) : 0,
    };
  }, [studentSummaries]);

  const handleExport = () => {
    const rows = studentSummaries.map((student) =>
      `"${student.studentName}",${student.rollNumber},"${student.institute}","${student.course}","${student.branch}",${student.totalEvents},${student.present},${student.absent},${student.late},${student.pending},${student.attendanceRate}%`
    );
    const csv = `Student,Enrollment Number,Institute,Course,Branch,Events,Present,Absent,Late,Pending,Attendance %\n${rows.join('\n')}`;
    downloadCSV(csv, 'student_participation_history');
  };

  const cards = [
    { label: 'Unique Students', value: overallStats.totalStudents, icon: Users, color: 'text-primary' },
    { label: 'Total Participations', value: overallStats.totalParticipations, icon: CalendarDays, color: 'text-blue-600' },
    { label: 'Avg Events/Student', value: overallStats.avgEvents, icon: UserCheck, color: 'text-green-600' },
    { label: 'Avg Attendance Rate', value: `${overallStats.avgRate}%`, icon: UserCheck, color: 'text-yellow-600' },
  ];

  return (
    <div className="space-y-4 lg:space-y-6">
      <ReportToolbar
        title="Student Participation History"
        totalRecords={overallStats.totalStudents}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onExportCSV={handleExport}
      />

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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search name or roll number..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-9" />
            </div>
            <Select value={instituteFilter} onValueChange={setInstituteFilter}>
              <SelectTrigger><SelectValue placeholder="Institute" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Institutes</SelectItem>
                {allInstitutes.map((institute) => (
                  <SelectItem key={institute} value={institute}>{institute}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={courseFilter} onValueChange={setCourseFilter}>
              <SelectTrigger><SelectValue placeholder="Course" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Courses</SelectItem>
                {allCourses.map((course) => (
                  <SelectItem key={course} value={course}>{course}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={branchFilter} onValueChange={setBranchFilter}>
              <SelectTrigger><SelectValue placeholder="Branch" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {allBranches.map((branch) => (
                  <SelectItem key={branch} value={branch}>{branch}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue placeholder="Event Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(eventTypeLabels).map(([key, value]) => (
                  <SelectItem key={key} value={key}>{value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[160px]">Student</TableHead>
                  <TableHead>Enrollment No.</TableHead>
                  <TableHead>Institute</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Branch</TableHead>
                  <TableHead className="text-center">Events</TableHead>
                  <TableHead className="text-center">Present</TableHead>
                  <TableHead className="text-center">Absent</TableHead>
                  <TableHead className="text-center">Late</TableHead>
                  <TableHead className="min-w-[140px]">Attendance %</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && studentSummaries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      Loading participation history...
                    </TableCell>
                  </TableRow>
                ) : studentSummaries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                      No students match the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  studentSummaries.map((student) => {
                    const isExpanded = expandedStudentId === student.studentId;
                    return (
                      <>
                        <TableRow
                          key={student.studentId}
                          className="cursor-pointer"
                          onClick={() => setExpandedStudentId(isExpanded ? null : student.studentId)}
                        >
                          <TableCell className="font-medium text-sm">{student.studentName}</TableCell>
                          <TableCell className="text-sm">{student.rollNumber}</TableCell>
                          <TableCell className="text-sm">{student.institute}</TableCell>
                          <TableCell className="text-sm">{student.course}</TableCell>
                          <TableCell className="text-sm">{student.branch}</TableCell>
                          <TableCell className="text-center font-medium">{student.totalEvents}</TableCell>
                          <TableCell className="text-center text-green-600 font-medium">{student.present}</TableCell>
                          <TableCell className="text-center text-destructive font-medium">{student.absent}</TableCell>
                          <TableCell className="text-center text-yellow-600 font-medium">{student.late}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={student.attendanceRate} className="h-2 flex-1" />
                              <span className="text-sm font-medium w-10 text-right">{student.attendanceRate}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow key={`${student.studentId}-detail`}>
                            <TableCell colSpan={11} className="bg-muted/30 p-0">
                              <div className="p-4">
                                <p className="text-sm font-medium mb-3">Event Participation Timeline</p>
                                <div className="rounded-md border bg-background overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Event</TableHead>
                                        <TableHead>Company</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Attendance</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {student.events
                                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                        .map((event) => (
                                          <TableRow key={event.eventId}>
                                            <TableCell className="font-medium text-sm">{event.eventTitle}</TableCell>
                                            <TableCell className="text-sm">{event.companyName}</TableCell>
                                            <TableCell>
                                              <Badge variant="outline" className="text-xs">
                                                {getEventTypeLabel(event.type)}
                                              </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm whitespace-nowrap">
                                              {new Date(event.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </TableCell>
                                            <TableCell>
                                              {event.attendance === 'present' && <Badge className="bg-green-100 text-green-700 border-green-200">Present</Badge>}
                                              {event.attendance === 'absent' && <Badge variant="destructive">Absent</Badge>}
                                              {event.attendance === 'late' && <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">Late</Badge>}
                                              {!event.attendance && <Badge variant="outline">Pending</Badge>}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground">
            Showing {studentSummaries.length} of {studentSummaries.length} students
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
