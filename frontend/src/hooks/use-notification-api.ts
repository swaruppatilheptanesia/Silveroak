import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationService } from '@/services/notificationService';
import type { NotificationPreference, NotificationQueryParams } from '@/types/notification';

export const notificationKeys = {
  all: ['notifications'] as const,
  meBase: () => [...notificationKeys.all, 'me'] as const,
  me: (params: NotificationQueryParams) => [...notificationKeys.meBase(), params] as const,
  preferences: () => [...notificationKeys.all, 'preferences'] as const,
};

export function useMyNotifications(params: NotificationQueryParams = {}, enabled = true) {
  return useQuery({
    queryKey: notificationKeys.me(params),
    queryFn: () => notificationService.getMyNotifications(params),
    enabled,
    staleTime: 30 * 1000,
  });
}

export function useMarkNotificationRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => notificationService.markAsRead(notificationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useDismissNotification() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (notificationId: string) => notificationService.dismissNotification(notificationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: () => notificationService.getMyPreferences(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateNotificationPreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (preferences: NotificationPreference[]) => notificationService.updateMyPreferences(preferences),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: notificationKeys.preferences() });
    },
  });
}
