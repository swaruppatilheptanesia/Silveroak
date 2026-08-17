import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, CheckCircle, Clock, BarChart3, Users } from 'lucide-react';
import { getEventTypeLabel, eventStatusLabels } from '@/types/event';
import { useDriveCompletionReport } from '@/hooks/use-report-analytics-api';
import { ReportToolbar, downloadCSV, type DateRange } from './ReportToolbar';

type QueryParams = {
  from?: Date;
  to?: Date;
  search?: string;
  status?: string;
};

export default function DriveCompletionSummary() {
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');

  const queryParams = useMemo<QueryParams>(() => ({
    from: dateRange.from,
    to: dateRange.to,
    search: searchQuery || undefined,
    status: statusFilter === 'all' ? undefined : statusFilter,
  }), [dateRange.from, dateRange.to, searchQuery, statusFilter]);

  const { data, isLoading } = useDriveCompletionReport(queryParams);

  const drives = useMemo(() => {
    return (data?.drives ?? []).map((drive: any) => ({
      id: drive.event_id,
      title: drive.title,
      companyName: drive.company_name,
      type: drive.type,
      status: drive.status,
      date: drive.date,
      panelsCount: drive.panels_count,
      assignedCount: drive.assigned_count,
      attendedCount: drive.attended_count,
      attendanceRate: drive.attendance_rate,
    }));
  }, [data]);

  const companies = useMemo(() => {
    return Array.from(new Set(drives.map((drive) => drive.companyName))).sort();
  }, [drives]);

  const filteredDrives = useMemo(() => {
    return companyFilter === 'all'
      ? drives
      : drives.filter((drive) => drive.companyName === companyFilter);
  }, [companyFilter, drives]);

  const summaryStats = useMemo(() => {
    const total = filteredDrives.length;
    const completed = filteredDrives.filter((drive) => drive.status === 'completed').length;
    const totalStudents = filteredDrives.reduce((sum, drive) => sum + drive.assignedCount, 0);
    const attended = filteredDrives.reduce((sum, drive) => sum + drive.attendedCount, 0);
    const avgAttendance = totalStudents > 0 ? Math.round((attended / totalStudents) * 100) : 0;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, totalStudents, attended, avgAttendance, completionRate };
  }, [filteredDrives]);

  const handleExport = () => {
    const rows = filteredDrives.map((drive) =>
      `"${drive.title}",${drive.companyName},${getEventTypeLabel(drive.type)},${new Date(drive.date).toLocaleDateString('en-IN')},${eventStatusLabels[drive.status as keyof typeof eventStatusLabels] ?? drive.status},${drive.assignedCount},${drive.attendedCount},${drive.panelsCount},${drive.attendanceRate}%`
    );
    const csv = `Drive,Company,Type,Date,Status,Assigned,Attended,Panels,Attendance %\n${rows.join('\n')}`;
    downloadCSV(csv, 'drive_completion_summary');
  };

  const cards = [
    { label: 'Total Drives', value: summaryStats.total, icon: BarChart3, color: 'text-primary' },
    { label: 'Completed', value: summaryStats.completed, icon: CheckCircle, color: 'text-green-600' },
    { label: 'Avg Attendance', value: `${summaryStats.avgAttendance}%`, icon: Users, color: 'text-blue-600' },
    { label: 'Completion Rate', value: `${summaryStats.completionRate}%`, icon: Clock, color: 'text-yellow-600' },
  ];

  return (
    <div className="space-y-4 lg:space-y-6">
      <ReportToolbar
        title="Drive Completion Summary"
        totalRecords={summaryStats.total}
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search drive or company..." value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {Object.entries(eventStatusLabels).map(([key, value]) => (
                  <SelectItem key={key} value={key}>{value}</SelectItem>
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
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Drive</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-center">Assigned</TableHead>
                  <TableHead className="text-center">Attended</TableHead>
                  <TableHead className="text-center">Panels</TableHead>
                  <TableHead className="min-w-[140px]">Attendance %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && drives.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Loading drive completion summary...
                    </TableCell>
                  </TableRow>
                ) : filteredDrives.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No drives match the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDrives.map((drive) => (
                    <TableRow key={drive.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium text-sm">{drive.title}</p>
                          <p className="text-xs text-muted-foreground">{drive.companyName}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">{getEventTypeLabel(drive.type)}</Badge>
                      </TableCell>
                      <TableCell className="text-sm whitespace-nowrap">
                        {new Date(drive.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </TableCell>
                      <TableCell>
                        <Badge variant={drive.status === 'completed' ? 'default' : 'secondary'} className="text-xs">
                          {eventStatusLabels[drive.status as keyof typeof eventStatusLabels] ?? drive.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center font-medium">{drive.assignedCount}</TableCell>
                      <TableCell className="text-center font-medium text-green-600">{drive.attendedCount}</TableCell>
                      <TableCell className="text-center">{drive.panelsCount}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={drive.attendanceRate} className="h-2 flex-1" />
                          <span className="text-sm font-medium w-10 text-right">{drive.attendanceRate}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground">
            Showing {filteredDrives.length} of {drives.length} drives
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
