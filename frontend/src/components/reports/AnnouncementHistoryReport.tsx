import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { BarChart3, CheckCircle, Download, Megaphone, Search, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
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
import { useAnnouncementHistoryReport } from '@/hooks/use-report-analytics-api';
import { ReportToolbar, downloadCSV, type DateRange } from './ReportToolbar';

type QueryParams = {
  from?: Date;
  to?: Date;
  audience?: string;
  priority?: string;
  search?: string;
};

const audienceOptions = [
  { value: 'all_students', label: 'All Students' },
  { value: 'department', label: 'Department' },
  { value: 'batch', label: 'Batch' },
  { value: 'posting', label: 'Posting' },
];

function priorityBadgeVariant(priority: string) {
  if (priority === 'high') return 'destructive';
  if (priority === 'medium') return 'default';
  return 'secondary';
}

function labelAudience(value: string) {
  return audienceOptions.find((option) => option.value === value)?.label ?? value.replace(/_/g, ' ');
}

export default function AnnouncementHistoryReport() {
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const [audienceFilter, setAudienceFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const queryParams = useMemo<QueryParams>(() => ({
    from: dateRange.from,
    to: dateRange.to,
    audience: audienceFilter === 'all' ? undefined : audienceFilter,
    priority: priorityFilter === 'all' ? undefined : priorityFilter,
    search: searchQuery || undefined,
  }), [audienceFilter, dateRange.from, dateRange.to, priorityFilter, searchQuery]);

  const { data, isLoading } = useAnnouncementHistoryReport(queryParams);

  const announcements = useMemo(() => {
    return (data?.announcements ?? []).map((announcement: any) => ({
      id: announcement.announcement_id,
      title: announcement.title,
      priority: announcement.priority,
      status: announcement.status,
      audienceType: announcement.target_audience_type,
      totalRecipients: announcement.total_recipients,
      readCount: announcement.read_count,
      readRate: announcement.read_rate,
      publishedAt: announcement.published_at,
      archivedAt: announcement.archived_at,
    }));
  }, [data]);

  const stats = data?.stats ?? {
    published: 0,
    archived: 0,
    avg_read_rate: 0,
    high_priority: 0,
    total_recipients: 0,
  };

  const handleExport = () => {
    const rows = announcements.map((announcement) => (
      `"${announcement.title}",${announcement.priority},${labelAudience(announcement.audienceType)},${announcement.totalRecipients},${announcement.readCount},${announcement.readRate}%,${announcement.publishedAt ? format(new Date(announcement.publishedAt), 'dd MMM yyyy') : announcement.archivedAt ? format(new Date(announcement.archivedAt), 'dd MMM yyyy') : '—'}`
    ));

    downloadCSV(
      `Title,Priority,Audience,Recipients,Read,Read Rate,Published Date\n${rows.join('\n')}`,
      'announcement_history',
    );
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <ReportToolbar
        title="Announcement History"
        totalRecords={announcements.length}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        onExportCSV={handleExport}
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search announcement..."
              className="pl-9 h-9 w-[220px] text-xs"
            />
          </div>
          <Select value={audienceFilter} onValueChange={setAudienceFilter}>
            <SelectTrigger className="h-9 w-[160px] text-xs">
              <SelectValue placeholder="Audience" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Audiences</SelectItem>
              {audienceOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="h-9 w-[140px] text-xs">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </ReportToolbar>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Megaphone className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.published + stats.archived}</p>
              <p className="text-xs text-muted-foreground">Total Sent</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-green-500/10 p-2">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.avg_read_rate}%</p>
              <p className="text-xs text-muted-foreground">Avg Read Rate</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2">
              <CheckCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.high_priority}</p>
              <p className="text-xs text-muted-foreground">High Priority</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{announcements.length}</p>
              <p className="text-xs text-muted-foreground">Filtered Results</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Audience</TableHead>
                  <TableHead className="text-center">Recipients</TableHead>
                  <TableHead className="text-center">Read</TableHead>
                  <TableHead className="text-center">Read Rate</TableHead>
                  <TableHead>Published</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && announcements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      Loading announcement history...
                    </TableCell>
                  </TableRow>
                ) : announcements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No announcement data available for the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  announcements.map((announcement) => (
                    <TableRow key={announcement.id}>
                      <TableCell className="max-w-[240px] truncate font-medium">{announcement.title}</TableCell>
                      <TableCell>
                        <Badge variant={priorityBadgeVariant(announcement.priority)}>
                          {announcement.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{labelAudience(announcement.audienceType)}</TableCell>
                      <TableCell className="text-center">{announcement.totalRecipients.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-center">{announcement.readCount.toLocaleString('en-IN')}</TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Progress value={announcement.readRate} className="h-2 w-16" />
                          <span className="text-xs">{announcement.readRate}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {announcement.publishedAt
                          ? format(new Date(announcement.publishedAt), 'dd MMM yyyy')
                          : announcement.archivedAt
                            ? format(new Date(announcement.archivedAt), 'dd MMM yyyy')
                            : '—'}
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
