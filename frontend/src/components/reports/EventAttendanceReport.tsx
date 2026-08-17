import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, ChevronDown, ChevronUp, Users, UserCheck, UserX, Clock, AlertCircle } from 'lucide-react';
import { eventTypeLabels, getEventTypeLabel, eventStatusLabels } from '@/types/event';
import { useEventAttendanceReport } from '@/hooks/use-report-analytics-api';
import { ReportToolbar, downloadCSV, type DateRange } from './ReportToolbar';

type QueryParams = {
  from?: Date;
  to?: Date;
  type?: string;
  status?: string;
  branch?: string;
  search?: string;
};

export default function EventAttendanceReport() {
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [branchFilter, setBranchFilter] = useState('all');
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const queryParams = useMemo<QueryParams>(() => ({
    from: dateRange.from,
    to: dateRange.to,
    type: typeFilter === 'all' ? undefined : typeFilter,
    status: statusFilter === 'all' ? undefined : statusFilter,
    branch: branchFilter === 'all' ? undefined : branchFilter,
    search: searchQuery || undefined,
  }), [branchFilter, dateRange.from, dateRange.to, searchQuery, statusFilter, typeFilter]);

  const { data, isLoading } = useEventAttendanceReport(queryParams);

  const events = useMemo(() => {
    return (data?.events ?? []).map((event: any) => ({
      id: event.event_id,
      title: event.title,
      companyName: event.company_name,
      type: event.type,
      status: event.status,
      date: event.date,
      venue: event.venue,
      eligibleBranches: event.eligible_branches ?? [],
      panels: (event.panels ?? []).map((panel: any) => ({
        id: panel.panel_id,
        panelName: panel.panel_name,
        room: panel.room,
        startTime: panel.start_time,
        endTime: panel.end_time,
      })),
      assignedStudents: (event.assigned_students ?? []).map((student: any) => ({
        studentId: student.student_id,
        studentName: student.student_name,
        rollNumber: student.roll_number,
        branch: student.branch,
        panelId: student.panel_id,
        slotTime: student.slot_time,
        attendance: student.attendance,
        attendanceMarkedBy: student.attendance_marked_by,
      })),
    }));
  }, [data]);

  const allBranches = useMemo(() => {
    const branches = new Set<string>();
    events.forEach((event) => event.eligibleBranches.forEach((branch) => branches.add(branch)));
    return Array.from(branches).sort();
  }, [events]);

  const getAttendanceStats = (students: typeof events[number]['assignedStudents']) => {
    const total = students.length;
    const present = students.filter((student) => student.attendance === 'present').length;
    const absent = students.filter((student) => student.attendance === 'absent').length;
    const late = students.filter((student) => student.attendance === 'late').length;
    const pending = students.filter((student) => !student.attendance).length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 100) : 0;
    return { total, present, absent, late, pending, rate };
  };

  const overallStats = useMemo(() => {
    const students = events.flatMap((event) => event.assignedStudents);
    return getAttendanceStats(students);
  }, [events]);

  const handleExport = () => {
    const rows = events.map((event) => {
      const stats = getAttendanceStats(event.assignedStudents);
      return `"${event.title}",${event.companyName},${getEventTypeLabel(event.type)},${new Date(event.date).toLocaleDateString('en-IN')},${stats.total},${stats.present},${stats.absent},${stats.late},${stats.pending},${stats.rate}%`;
    });
    const csv = `Event,Company,Type,Date,Total,Present,Absent,Late,Pending,Attendance %\n${rows.join('\n')}`;
    downloadCSV(csv, 'event_attendance_report');
  };

  const statCards = [
    { label: 'Total Students', value: overallStats.total, icon: Users, color: 'text-primary' },
    { label: 'Present', value: overallStats.present, icon: UserCheck, color: 'text-emerald-600' },
    { label: 'Absent', value: overallStats.absent, icon: UserX, color: 'text-destructive' },
    { label: 'Late', value: overallStats.late, icon: Clock, color: 'text-amber-600' },
    { label: 'Pending', value: overallStats.pending, icon: AlertCircle, color: 'text-muted-foreground' },
  ];

  return (
    <div className="space-y-4 lg:space-y-6">
      <ReportToolbar
        title="Event-wise Attendance"
        totalRecords={data?.stats?.total_events ?? events.length}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onExportCSV={handleExport}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map((card) => (
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search event or company..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-9" />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue placeholder="Event Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(eventTypeLabels).map(([key, value]) => (
                  <SelectItem key={key} value={key}>{value}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(eventStatusLabels).map(([key, value]) => (
                  <SelectItem key={key} value={key}>{value}</SelectItem>
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
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Event</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Present</TableHead>
                  <TableHead className="text-center">Absent</TableHead>
                  <TableHead className="text-center">Late</TableHead>
                  <TableHead className="text-center">Pending</TableHead>
                  <TableHead className="min-w-[140px]">Attendance %</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && events.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      Loading event attendance...
                    </TableCell>
                  </TableRow>
                ) : events.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No events match the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  events.map((event) => {
                    const stats = getAttendanceStats(event.assignedStudents);
                    const isExpanded = expandedEventId === event.id;

                    return (
                      <>
                        <TableRow key={event.id} className="cursor-pointer" onClick={() => setExpandedEventId(isExpanded ? null : event.id)}>
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm">{event.title}</p>
                              <p className="text-xs text-muted-foreground">{event.companyName}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{getEventTypeLabel(event.type)}</Badge>
                          </TableCell>
                          <TableCell className="text-sm whitespace-nowrap">
                            {new Date(event.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </TableCell>
                          <TableCell className="text-center font-medium">{stats.total}</TableCell>
                          <TableCell className="text-center text-emerald-600 font-medium">{stats.present}</TableCell>
                          <TableCell className="text-center text-destructive font-medium">{stats.absent}</TableCell>
                          <TableCell className="text-center text-amber-600 font-medium">{stats.late}</TableCell>
                          <TableCell className="text-center text-muted-foreground">{stats.pending}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={stats.rate} className="h-2 flex-1" />
                              <span className="text-sm font-medium w-10 text-right">{stats.rate}%</span>
                            </div>
                          </TableCell>
                          <TableCell>{isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow key={`${event.id}-detail`}>
                            <TableCell colSpan={10} className="bg-muted/30 p-0">
                              <div className="p-4">
                                <p className="text-sm font-medium mb-3">Student-wise Attendance</p>
                                <div className="rounded-md border bg-background overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Student</TableHead>
                                        <TableHead>Roll No.</TableHead>
                                        <TableHead>Branch</TableHead>
                                        <TableHead>Panel</TableHead>
                                        <TableHead>Slot</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Marked By</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {event.assignedStudents.map((student) => {
                                        const panel = event.panels.find((entry) => entry.id === student.panelId);
                                        return (
                                          <TableRow key={student.studentId}>
                                            <TableCell className="font-medium text-sm">{student.studentName}</TableCell>
                                            <TableCell className="text-sm">{student.rollNumber}</TableCell>
                                            <TableCell className="text-sm">{student.branch}</TableCell>
                                            <TableCell className="text-sm">{panel?.panelName ?? '—'}</TableCell>
                                            <TableCell className="text-sm">{student.slotTime || '—'}</TableCell>
                                            <TableCell>
                                              {student.attendance === 'present' && <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Present</Badge>}
                                              {student.attendance === 'absent' && <Badge variant="destructive">Absent</Badge>}
                                              {student.attendance === 'late' && <Badge className="bg-amber-100 text-amber-700 border-amber-200">Late</Badge>}
                                              {!student.attendance && <Badge variant="outline">Pending</Badge>}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{student.attendanceMarkedBy || '—'}</TableCell>
                                          </TableRow>
                                        );
                                      })}
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
            Showing {events.length} of {data?.stats?.total_events ?? events.length} events • Click a row to expand
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
