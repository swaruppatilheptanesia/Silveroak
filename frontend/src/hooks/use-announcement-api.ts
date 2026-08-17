/**
 * React Query hooks for the Announcements API module.
 * Covers admin CRUD, publish/archive, student read/consent.
 */
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { announcementService } from '@/services/announcementService';
import type {
  AnnouncementAudienceScopeParams,
  AnnouncementQueryParams,
  CreateAnnouncementInput,
  UpdateAnnouncementInput,
} from '@/types/announcement';

// ── Query Keys ─────────────────────────────────────────

export const announcementKeys = {
  all: ['announcements'] as const,
  list: (params: AnnouncementQueryParams) => [...announcementKeys.all, 'list', params] as const,
  detail: (id: string) => [...announcementKeys.all, 'detail', id] as const,
  audienceSemesters: (scope: AnnouncementAudienceScopeParams) =>
    [...announcementKeys.all, 'audience', 'semesters', scope] as const,
};

// ── Admin Hooks ────────────────────────────────────────

export function useAnnouncements(params: AnnouncementQueryParams = {}, enabled = true) {
  return useQuery({
    queryKey: announcementKeys.list(params),
    queryFn: () => announcementService.getAnnouncements(params),
    staleTime: 2 * 60 * 1000,
    enabled,
  });
}

/**
 * Semester options for the announcement audience picker, derived from the students in the given
 * Institute/Course/Branch scope. Disabled until at least one course is chosen — an unscoped call
 * would return every semester in the tenant, which is exactly the cross-selection we're preventing.
 */
export function useAnnouncementAudienceSemesters(
  scope: AnnouncementAudienceScopeParams,
  enabled = true,
) {
  return useQuery({
    queryKey: announcementKeys.audienceSemesters(scope),
    queryFn: () => announcementService.getAudienceSemesterOptions(scope),
    enabled,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function useAnnouncementDetail(announcementId: string) {
  return useQuery({
    queryKey: announcementKeys.detail(announcementId),
    queryFn: () => announcementService.getAnnouncementDetail(announcementId),
    enabled: !!announcementId,
  });
}

export function useUploadAnnouncementAttachment() {
  return useMutation({
    mutationFn: (file: File) => announcementService.uploadAttachment(file),
  });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateAnnouncementInput) => announcementService.createAnnouncement(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: announcementKeys.all });
    },
  });
}

export function useUpdateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ announcementId, data }: { announcementId: string; data: UpdateAnnouncementInput }) =>
      announcementService.updateAnnouncement(announcementId, data),
    onSuccess: (_, { announcementId }) => {
      qc.invalidateQueries({ queryKey: announcementKeys.all });
      qc.invalidateQueries({ queryKey: announcementKeys.detail(announcementId) });
    },
  });
}

export function usePublishAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (announcementId: string) => announcementService.publishAnnouncement(announcementId),
    onSuccess: (_, announcementId) => {
      qc.invalidateQueries({ queryKey: announcementKeys.all });
      qc.invalidateQueries({ queryKey: announcementKeys.detail(announcementId) });
    },
  });
}

export function useArchiveAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (announcementId: string) => announcementService.archiveAnnouncement(announcementId),
    onSuccess: (_, announcementId) => {
      qc.invalidateQueries({ queryKey: announcementKeys.all });
      qc.invalidateQueries({ queryKey: announcementKeys.detail(announcementId) });
    },
  });
}

// ── Student Hooks ──────────────────────────────────────

export function useMarkAnnouncementRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (announcementId: string) => announcementService.markAsRead(announcementId),
    onSuccess: (_, announcementId) => {
      qc.invalidateQueries({ queryKey: announcementKeys.all });
      qc.invalidateQueries({ queryKey: announcementKeys.detail(announcementId) });
    },
  });
}

export function useGiveAnnouncementConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (announcementId: string) => announcementService.giveConsent(announcementId),
    onSuccess: (_, announcementId) => {
      qc.invalidateQueries({ queryKey: announcementKeys.all });
      qc.invalidateQueries({ queryKey: announcementKeys.detail(announcementId) });
    },
  });
}
