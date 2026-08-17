import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  User,
  Shield,
  CheckCircle2,
  AlertCircle,
  X,
  Clock,
  Loader2,
  Briefcase,
  FileText,
  Star,
  FileCheck,
  Calendar,
  Megaphone,
  Newspaper,
  ClipboardCheck,
  Building2,
  type LucideIcon,
} from 'lucide-react';
import { ConfirmActionDialog } from '@/components/shared/ConfirmActionDialog';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatRelativeTime } from '@/lib/formatters';
import { useAuth } from '@/contexts/AuthContext';
import { resolveBackendAssetUrl } from '@/lib/studentModule';
import type { ApiNotification, NotificationType } from '@/types/notification';
import {
  useDismissNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useMyNotifications,
} from '@/hooks/use-notification-api';

const notificationIcons: Record<NotificationType, LucideIcon> = {
  profile: User,
  policy: Shield,
  readiness: CheckCircle2,
  placement: AlertCircle,
  offer: Briefcase,
  application: FileText,
  interest: Star,
  noc: FileCheck,
  event: Calendar,
  announcement: Megaphone,
  circular: Newspaper,
  no_dues: ClipboardCheck,
  recruiter: Building2,
};

const priorityStyles = {
  high: 'border-l-destructive',
  medium: 'border-l-amber-500',
  low: 'border-l-primary',
};

function getInitials(name: string | null | undefined) {
  if (!name) return 'NA';

  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 2) || 'NA';
}

export function NotificationsDropdown() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const notificationsQuery = useMyNotifications({ page: 1, limit: 20 }, isAuthenticated);
  const markNotificationRead = useMarkNotificationRead();
  const markAllNotificationsRead = useMarkAllNotificationsRead();
  const dismissNotification = useDismissNotification();

  const notifications = (notificationsQuery.data?.data ?? []) as ApiNotification[];
  const unreadCount = notificationsQuery.data?.unread_count ?? 0;
  const isLoading = isAuthLoading || notificationsQuery.isLoading;

  const handleMarkRead = (id: string, isRead: boolean) => {
    if (!isRead) {
      markNotificationRead.mutate(id);
    }
  };

  const handleNotificationClick = (notification: ApiNotification) => {
    handleMarkRead(notification.id, notification.is_read);

    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const [dismissPending, setDismissPending] = useState<{ id: string; title: string } | null>(null);

  const performDismiss = (id: string) => {
    dismissNotification.mutate(id);
    setDismissPending(null);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Open notifications">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
              {unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-1rem)] max-w-96 p-0" align="end">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-foreground">Notifications</h4>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => markAllNotificationsRead.mutate()}
              className="text-xs h-7"
              disabled={markAllNotificationsRead.isPending}
            >
              {markAllNotificationsRead.isPending ? 'Updating...' : 'Mark all read'}
            </Button>
          )}
        </div>

        <div className="max-h-[420px] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading notifications...
            </div>
          ) : notificationsQuery.isError ? (
            <div className="p-8 text-center">
              <AlertCircle className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Unable to load notifications</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center">
              <Bell className="mx-auto mb-3 h-12 w-12 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => {
                const Icon = notificationIcons[notification.type] ?? Bell;
                const offeredStudentName = notification.payload?.offered_student_name ?? null;
                const offeredStudentPhoto = notification.payload?.offered_student_photo_url ?? null;
                const isOfferNotification = Boolean(offeredStudentName && notification.action_url);
                return (
                  <div
                    key={notification.id}
                    className={cn(
                      'group cursor-pointer border-l-4 p-4 transition-colors hover:bg-accent/50',
                      priorityStyles[notification.priority],
                      !notification.is_read && 'bg-accent/30',
                    )}
                    onClick={() => handleNotificationClick(notification)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        handleNotificationClick(notification);
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      {isOfferNotification ? (
                        <Avatar className="h-10 w-10 flex-shrink-0 border border-border">
                          <AvatarImage
                            src={offeredStudentPhoto ? resolveBackendAssetUrl(offeredStudentPhoto) : undefined}
                            alt={offeredStudentName ?? 'Offered student'}
                          />
                          <AvatarFallback className="text-xs font-semibold">
                            {getInitials(offeredStudentName)}
                          </AvatarFallback>
                        </Avatar>
                      ) : (
                        <div
                          className={cn(
                            'flex-shrink-0 rounded-full p-2',
                            notification.priority === 'high'
                              ? 'bg-destructive/10'
                              : notification.priority === 'medium'
                                ? 'bg-amber-500/10'
                                : 'bg-primary/10',
                          )}
                        >
                          <Icon
                            className={cn(
                              'h-4 w-4',
                              notification.priority === 'high'
                                ? 'text-destructive'
                                : notification.priority === 'medium'
                                  ? 'text-amber-500'
                                  : 'text-primary',
                            )}
                          />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p
                              className={cn(
                                'text-sm font-medium text-foreground',
                                !notification.is_read && 'font-semibold',
                              )}
                            >
                              {notification.title}
                            </p>
                            {isOfferNotification && (
                              <p className="mt-1 text-xs font-medium text-muted-foreground">
                                {notification.payload?.is_target_student
                                  ? 'Offered to you'
                                  : `Offered to ${offeredStudentName}`}
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-100 hover:opacity-100"
                            aria-label="Dismiss notification"
                            onClick={(event) => {
                              event.stopPropagation();
                              setDismissPending({ id: notification.id, title: notification.title });
                            }}
                            disabled={dismissNotification.isPending}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {notification.description ?? ''}
                        </p>
                        <div className="mt-2 flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">
                            {formatRelativeTime(notification.created_at)}
                          </span>
                          {!notification.is_read && (
                            <span className="h-2 w-2 rounded-full bg-primary" />
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>

      <ConfirmActionDialog
        open={Boolean(dismissPending)}
        onOpenChange={(open) => {
          if (!open) setDismissPending(null);
        }}
        title="Dismiss this notification?"
        description={dismissPending ? `"${dismissPending.title}" will be removed from your inbox.` : ''}
        confirmLabel="Dismiss"
        confirmVariant="destructive"
        isPending={dismissNotification.isPending}
        onConfirm={() => {
          if (dismissPending) performDismiss(dismissPending.id);
        }}
      />
    </Popover>
  );
}
