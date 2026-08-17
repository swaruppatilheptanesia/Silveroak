import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { AlertCircle, CheckCircle, Download, Search, Users } from 'lucide-react';
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
import { useConsentTrackingReport } from '@/hooks/use-report-analytics-api';
import { downloadCSV } from './ReportToolbar';

type QueryParams = {
  announcement_id?: string;
  search?: string;
};

function formatDate(value: string | null | undefined) {
  return value ? format(new Date(value), 'dd MMM yyyy') : '—';
}

export default function ConsentTrackingReport() {
  const [selectedAnnouncement, setSelectedAnnouncement] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const queryParams = useMemo<QueryParams>(() => ({
    announcement_id: selectedAnnouncement === 'all' ? undefined : selectedAnnouncement,
    search: searchQuery || undefined,
  }), [searchQuery, selectedAnnouncement]);

  const { data, isLoading } = useConsentTrackingReport(queryParams);

  const announcements = data?.announcements ?? [];
  const receipts = data?.receipts ?? [];
  const totalConsented = receipts.filter((receipt: any) => receipt.consent_given).length;
  const totalRead = receipts.filter((receipt: any) => receipt.read_at).length;
  const totalPending = receipts.filter((receipt: any) => !receipt.consent_given).length;
  const consentRate = receipts.length > 0 ? Math.round((totalConsented / receipts.length) * 100) : 0;
  const readRate = receipts.length > 0 ? Math.round((totalRead / receipts.length) * 100) : 0;

  const handleExport = () => {
    const rows = receipts.map((receipt: any) => (
      `"${receipt.student_name}",${receipt.roll_number},${receipt.department},"${receipt.announcement_title}",${receipt.read_at ? formatDate(receipt.read_at) : 'Not read'},${receipt.consent_given ? 'Yes' : 'No'},${formatDate(receipt.consent_at)}`
    ));

    downloadCSV(
      `Student,Roll Number,Department,Announcement,Read At,Consented,Consent At\n${rows.join('\n')}`,
      'consent_tracking',
    );
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            Communication
          </div>
          <h3 className="text-xl font-semibold">Consent Tracking</h3>
          <p className="text-sm text-muted-foreground">
            Live consent receipts and read tracking from the backend.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-primary/10 p-2">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{receipts.length}</p>
              <p className="text-xs text-muted-foreground">Total Recipients</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-green-500/10 p-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalConsented}</p>
              <p className="text-xs text-muted-foreground">Consented</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-blue-500/10 p-2">
              <CheckCircle className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalRead}</p>
              <p className="text-xs text-muted-foreground">Read</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="rounded-lg bg-amber-500/10 p-2">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalPending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </div>
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
                placeholder="Search student, roll number or announcement..."
                className="pl-9 h-9 w-[280px] text-xs"
              />
            </div>
            <Select value={selectedAnnouncement} onValueChange={setSelectedAnnouncement}>
              <SelectTrigger className="h-9 w-[320px] text-xs">
                <SelectValue placeholder="Announcement" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Consent Announcements</SelectItem>
                {announcements.map((announcement: any) => (
                  <SelectItem key={announcement.announcement_id} value={announcement.announcement_id}>
                    {announcement.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Consent Rate</span>
                <span className="text-sm font-bold">{consentRate}%</span>
              </div>
              <Progress value={consentRate} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Read rate: {readRate}% of recipients have opened the announcement.
              </p>
            </CardContent>
          </Card>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Roll No</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Announcement</TableHead>
                  <TableHead>Read</TableHead>
                  <TableHead>Consent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading && receipts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      Loading consent receipts...
                    </TableCell>
                  </TableRow>
                ) : receipts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No consent data available for the selected filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  receipts.map((receipt: any, index: number) => (
                    <TableRow key={`${receipt.announcement_id}-${receipt.student_id}-${index}`}>
                      <TableCell className="font-medium">{receipt.student_name}</TableCell>
                      <TableCell className="text-sm">{receipt.roll_number}</TableCell>
                      <TableCell className="text-sm">{receipt.department}</TableCell>
                      <TableCell className="max-w-[240px] truncate text-sm">{receipt.announcement_title}</TableCell>
                      <TableCell>
                        {receipt.read_at ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span className="text-xs">{formatDate(receipt.read_at)}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">Not read</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {receipt.consent_given ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span className="text-xs">{formatDate(receipt.consent_at)}</span>
                          </div>
                        ) : (
                          <Badge variant="outline" className="border-amber-500 text-[10px] text-amber-600">
                            Pending
                          </Badge>
                        )}
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
