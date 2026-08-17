import { useDeferredValue, useMemo, useState } from 'react';
import {
  Eye,
  Loader2,
  Megaphone,
  Search,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageLoader } from '@/components/shared/PageLoader';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { useAnnouncementDetail, useAnnouncements } from '@/hooks/use-announcement-api';
import {
  getAnnouncementAudienceLabel,
  getAnnouncementErrorMessage,
  getAnnouncementPriorityMeta,
} from '@/lib/announcementModule';
import { formatDate, formatDateTime } from '@/lib/formatters';

export default function FacultyAnnouncements() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState('');
  const deferredSearch = useDeferredValue(searchTerm);

  const { sort_by, sort_order, onSort } = useServerSort<
    'title' | 'priority' | 'published_at'
  >('published_at', 'desc');
  const announcementsQuery = useAnnouncements({
    limit: 100,
    sort_by,
    sort_order,
  });
  const detailQuery = useAnnouncementDetail(selectedAnnouncementId);

  const announcements = announcementsQuery.data?.data ?? [];
  const filteredAnnouncements = useMemo(() => {
    const normalizedSearch = deferredSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return announcements;
    }

    return announcements.filter((announcement) => {
      return announcement.title.toLowerCase().includes(normalizedSearch)
        || announcement.content.toLowerCase().includes(normalizedSearch);
    });
  }, [announcements, deferredSearch]);

  const selectedAnnouncement = detailQuery.data
    ?? announcements.find((announcement) => announcement.id === selectedAnnouncementId)
    ?? null;

  if (announcementsQuery.isLoading) {
    return (
      <DashboardLayout
        title="Announcements"
        subtitle="View placement cell announcements"
      >
        <PageLoader />
      </DashboardLayout>
    );
  }

  if (announcementsQuery.error) {
    return (
      <DashboardLayout
        title="Announcements"
        subtitle="View placement cell announcements"
      >
        <Alert variant="destructive">
          <Megaphone className="h-4 w-4" />
          <AlertTitle>Unable to load announcements</AlertTitle>
          <AlertDescription>
            {getAnnouncementErrorMessage(announcementsQuery.error, 'Please refresh and try again.')}
          </AlertDescription>
        </Alert>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Announcements"
      subtitle="View placement cell announcements"
    >
      <div className="space-y-6">
        <Card>
          <CardContent className="p-4">
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search announcements..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {filteredAnnouncements.length === 0 ? (
              <EmptyState
                className="p-6"
                compact
                icon={Megaphone}
                title="No announcements found"
                description="Published announcements matching your search will appear here."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead label="Title" columnKey="title" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <SortableTableHead label="Priority" columnKey="priority" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <TableHead>Audience</TableHead>
                      <SortableTableHead label="Published" columnKey="published_at" sortBy={sort_by} sortOrder={sort_order} onSort={onSort} />
                      <TableHead className="text-right">View</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAnnouncements.map((announcement) => (
                      <TableRow
                        key={announcement.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => setSelectedAnnouncementId(announcement.id)}
                      >
                        <TableCell className="max-w-[320px]">
                          <div className="space-y-1">
                            <p className="truncate font-medium text-foreground">{announcement.title}</p>
                            <p className="line-clamp-1 text-xs text-muted-foreground">{announcement.content}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getAnnouncementPriorityMeta(announcement.priority).variant}>
                            {getAnnouncementPriorityMeta(announcement.priority).label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{getAnnouncementAudienceLabel(announcement)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {announcement.published_at ? formatDate(announcement.published_at) : 'Draft'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet
        open={Boolean(selectedAnnouncementId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAnnouncementId('');
          }
        }}
      >
        <SheetContent className="w-full sm:max-w-lg">
          {selectedAnnouncementId && detailQuery.isLoading && !selectedAnnouncement ? (
            <div className="flex min-h-[200px] items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : selectedAnnouncement ? (
            <>
              <SheetHeader>
                <SheetTitle>{selectedAnnouncement.title}</SheetTitle>
                <SheetDescription>
                  {selectedAnnouncement.published_at ? formatDateTime(selectedAnnouncement.published_at) : 'Draft'}
                  {' • '}
                  {selectedAnnouncement.created_by_user?.name || 'Placement Cell'}
                </SheetDescription>
              </SheetHeader>

              <ScrollArea className="mt-4">
                <div className="space-y-4 pr-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={getAnnouncementPriorityMeta(selectedAnnouncement.priority).variant}>
                      {getAnnouncementPriorityMeta(selectedAnnouncement.priority).label}
                    </Badge>
                    <Badge variant="outline">{getAnnouncementAudienceLabel(selectedAnnouncement)}</Badge>
                    {selectedAnnouncement.requires_consent ? (
                      <Badge variant="secondary">Consent Required</Badge>
                    ) : null}
                  </div>

                  <Card>
                    <CardContent className="p-4">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                        {selectedAnnouncement.content}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </ScrollArea>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}
