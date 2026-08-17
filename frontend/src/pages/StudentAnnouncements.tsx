import { useDeferredValue, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Loader2,
  Megaphone,
  Paperclip,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { resolveBackendAssetUrl } from '@/lib/studentModule';
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
  useAnnouncementDetail,
  useAnnouncements,
  useGiveAnnouncementConsent,
  useMarkAnnouncementRead,
} from '@/hooks/use-announcement-api';
import {
  getAnnouncementAudienceLabel,
  getAnnouncementErrorMessage,
  getAnnouncementPriorityMeta,
} from '@/lib/announcementModule';
import { formatDateTime } from '@/lib/formatters';
import type { ApiAnnouncementListItem } from '@/types/announcement';

function getPriorityIcon(priority: ApiAnnouncementListItem['priority']) {
  if (priority === 'high') return AlertTriangle;
  if (priority === 'medium') return Clock;
  return Megaphone;
}

export default function StudentAnnouncements() {
  const [selectedAnnouncementId, setSelectedAnnouncementId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const deferredSearch = useDeferredValue(searchTerm);
  const announcementsQuery = useAnnouncements({
    limit: 100,
    sort_by: 'published_at',
    sort_order: 'desc',
  });
  const detailQuery = useAnnouncementDetail(selectedAnnouncementId);
  const markRead = useMarkAnnouncementRead();
  const giveConsent = useGiveAnnouncementConsent();

  const announcements = announcementsQuery.data?.data ?? [];
  const selectedAnnouncement = detailQuery.data
    ?? announcements.find((announcement) => announcement.id === selectedAnnouncementId)
    ?? null;

  const filteredAnnouncements = useMemo(() => {
    const query = deferredSearch.trim().toLowerCase();
    if (!query) return announcements;
    return announcements.filter((announcement) =>
      [
        announcement.title,
        announcement.content,
        getAnnouncementAudienceLabel(announcement),
        announcement.created_by_user?.name,
      ].some((field) => (field ?? '').toLowerCase().includes(query))
    );
  }, [announcements, deferredSearch]);

  const unreadCount = useMemo(
    () => announcements.filter((announcement) => !announcement.my_receipt?.is_read).length,
    [announcements]
  );

  if (announcementsQuery.isLoading) {
    return (
      <DashboardLayout
        title="Announcements"
        subtitle="Stay updated with placement cell communications"
      >
        <PageLoader />
      </DashboardLayout>
    );
  }

  if (announcementsQuery.error) {
    return (
      <DashboardLayout
        title="Announcements"
        subtitle="Stay updated with placement cell communications"
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

  async function handleOpenAnnouncement(announcement: ApiAnnouncementListItem) {
    setSelectedAnnouncementId(announcement.id);

    if (!announcement.my_receipt?.is_read) {
      try {
        await markRead.mutateAsync(announcement.id);
      } catch (error) {
        toast.error(getAnnouncementErrorMessage(error, 'Unable to record the read receipt.'));
      }
    }
  }

  async function handleConsent() {
    if (!selectedAnnouncement) return;

    try {
      await giveConsent.mutateAsync(selectedAnnouncement.id);
      toast.success('Your acknowledgement has been recorded.');
    } catch (error) {
      toast.error(getAnnouncementErrorMessage(error, 'Unable to record consent right now.'));
    }
  }

  const announcementForSheet = selectedAnnouncement;
  const authorName = announcementForSheet?.created_by_user?.name || 'Placement Cell';
  const hasConsented = announcementForSheet?.my_receipt?.has_consented ?? false;

  return (
    <DashboardLayout
      title="Announcements"
      subtitle="Stay updated with placement cell communications"
    >
      <div className="space-y-6">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by title, content, or audience..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        {unreadCount > 0 ? (
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex items-center gap-3 p-4">
              <Megaphone className="h-5 w-5 text-primary" />
              <p className="text-sm font-medium">
                You have <span className="font-bold text-primary">{unreadCount}</span> unread announcement
                {unreadCount === 1 ? '' : 's'}.
              </p>
            </CardContent>
          </Card>
        ) : null}

        {filteredAnnouncements.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <EmptyState
                icon={Megaphone}
                title={announcements.length === 0 ? 'No announcements right now' : 'No matching announcements'}
                description={
                  announcements.length === 0
                    ? 'Published announcements for your profile will appear here.'
                    : 'Try a different search term.'
                }
                compact
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredAnnouncements.map((announcement) => {
              const priorityMeta = getAnnouncementPriorityMeta(announcement.priority);
              const PriorityIcon = getPriorityIcon(announcement.priority);
              const isUnread = !announcement.my_receipt?.is_read;
              const isConsentPending = announcement.requires_consent && !announcement.my_receipt?.has_consented;

              return (
                <Card
                  key={announcement.id}
                  className={isUnread ? 'border-l-4 border-l-primary bg-primary/5' : ''}
                >
                  <CardContent className="p-4">
                    <button
                      type="button"
                      className="w-full text-left"
                      onClick={() => void handleOpenAnnouncement(announcement)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-muted p-2">
                          <PriorityIcon className={`h-4 w-4 ${priorityMeta.accentClassName}`} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <p className={isUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground'}>
                                {announcement.title}
                              </p>
                              <p className="line-clamp-2 text-sm text-muted-foreground">
                                {announcement.content}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              {isUnread ? <span className="h-2.5 w-2.5 rounded-full bg-primary" /> : null}
                              {isConsentPending ? (
                                <Badge variant="destructive">Action Needed</Badge>
                              ) : null}
                              {announcement.requires_consent && announcement.my_receipt?.has_consented ? (
                                <Badge variant="outline" className="border-emerald-500 text-emerald-600">
                                  Consented
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <Badge variant="secondary">{getAnnouncementAudienceLabel(announcement)}</Badge>
                            <span>{announcement.published_at ? formatDateTime(announcement.published_at) : 'Draft'}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Sheet
        open={Boolean(selectedAnnouncementId)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAnnouncementId('');
          }
        }}
      >
        <SheetContent className="flex w-full flex-col sm:max-w-lg">
          {selectedAnnouncementId && detailQuery.isLoading && !announcementForSheet ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : announcementForSheet ? (
            <>
              <SheetHeader>
                <SheetTitle>{announcementForSheet.title}</SheetTitle>
                <SheetDescription>
                  {announcementForSheet.published_at ? formatDateTime(announcementForSheet.published_at) : 'Draft'}
                  {' • '}
                  {authorName}
                </SheetDescription>
              </SheetHeader>

              <ScrollArea className="mt-4 flex-1">
                <div className="space-y-4 pr-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={getAnnouncementPriorityMeta(announcementForSheet.priority).variant}>
                      {getAnnouncementPriorityMeta(announcementForSheet.priority).shortLabel}
                    </Badge>
                    <Badge variant="outline">{getAnnouncementAudienceLabel(announcementForSheet)}</Badge>
                    {announcementForSheet.my_receipt?.is_read ? (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" />
                        Read
                      </Badge>
                    ) : null}
                  </div>

                  <Card>
                    <CardContent className="p-4">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                        {announcementForSheet.content}
                      </p>
                    </CardContent>
                  </Card>

                  {announcementForSheet.attachment_url ? (
                    <Card>
                      <CardContent className="p-4">
                        <a
                          href={resolveBackendAssetUrl(announcementForSheet.attachment_url)}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-2 text-sm font-medium text-primary underline"
                        >
                          <Paperclip className="h-4 w-4" />
                          {announcementForSheet.attachment_name || 'Open attachment'}
                        </a>
                      </CardContent>
                    </Card>
                  ) : null}

                  {announcementForSheet.requires_consent ? (
                    <Card className={hasConsented ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-destructive/30 bg-destructive/5'}>
                      <CardContent className="p-4">
                        {hasConsented ? (
                          <div className="flex items-center gap-3">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                            <div>
                              <p className="text-sm font-medium text-emerald-700">Consent recorded</p>
                              <p className="text-xs text-muted-foreground">
                                Your acknowledgement has already been submitted.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <p className="text-sm font-medium">Acknowledgement required</p>
                            <p className="text-xs text-muted-foreground">
                              Please confirm that you have read and understood this announcement.
                            </p>
                            <Button
                              className="w-full"
                              onClick={() => void handleConsent()}
                              disabled={giveConsent.isPending}
                            >
                              {giveConsent.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                              I have read and consent
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ) : null}
                </div>
              </ScrollArea>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </DashboardLayout>
  );
}
