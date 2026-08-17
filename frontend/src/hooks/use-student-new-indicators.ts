import { useSyncExternalStore } from 'react';
import { useAnnouncements } from '@/hooks/use-announcement-api';
import { useMyCirculars } from '@/hooks/use-circular-api';
import { useMyEvents } from '@/hooks/use-event-api';

/**
 * Tracks "new since last visit" state for student sidebar surfaces that have no
 * backend read flag (Circulars, Drives). A per-surface "last seen" timestamp is
 * stored in localStorage; an item is "new" when its created_at is newer than that.
 *
 * The browser `storage` event does NOT fire in the tab that writes it, so the store
 * keeps its own listener set and notifies via useSyncExternalStore — this lets the
 * sidebar clear a dot the instant a page calls markSurfaceSeen, without a reload.
 */
export type NewSurface = 'circulars' | 'drives';

const STORAGE_PREFIX = 'sou:lastSeen:';
const listeners = new Set<() => void>();

function storageKey(surface: NewSurface): string {
  return `${STORAGE_PREFIX}${surface}`;
}

function readLastSeen(surface: NewSurface): number {
  try {
    return Number(localStorage.getItem(storageKey(surface)) ?? '0') || 0;
  } catch {
    return 0;
  }
}

export function markSurfaceSeen(surface: NewSurface): void {
  try {
    localStorage.setItem(storageKey(surface), String(Date.now()));
  } catch {
    // ignore (private mode / storage disabled)
  }
  listeners.forEach((listener) => listener());
}

function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function useLastSeen(surface: NewSurface): number {
  return useSyncExternalStore(
    subscribe,
    () => readLastSeen(surface),
    () => 0,
  );
}

function hasNewer(items: Array<{ created_at: string }>, lastSeen: number): boolean {
  return items.some((item) => {
    const created = new Date(item.created_at).getTime();
    return Number.isFinite(created) && created > lastSeen;
  });
}

export interface StudentNewIndicators {
  announcements: boolean;
  circulars: boolean;
  drives: boolean;
}

/**
 * Combined "new"/unread indicators for the student sidebar. Queries only run when
 * `enabled` is true (i.e. the current role is a student), so non-student sessions
 * fire no requests and get no dots.
 */
export function useStudentNewIndicators(enabled: boolean): StudentNewIndicators {
  const announcementsQuery = useAnnouncements(
    { limit: 100, sort_by: 'published_at', sort_order: 'desc' },
    enabled,
  );
  const circularsQuery = useMyCirculars(enabled);
  const eventsQuery = useMyEvents(enabled);

  const circularsSeen = useLastSeen('circulars');
  const drivesSeen = useLastSeen('drives');

  const announcements = (announcementsQuery.data?.data ?? []).some(
    (announcement) => !announcement.my_receipt?.is_read,
  );
  const circulars = hasNewer(circularsQuery.data ?? [], circularsSeen);
  const drives = hasNewer(eventsQuery.data?.data ?? [], drivesSeen);

  return { announcements, circulars, drives };
}
