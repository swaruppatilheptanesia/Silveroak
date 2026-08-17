/**
 * React Query hooks for the Events (Drives) API module.
 * Covers events CRUD, panels, student assignment, attendance.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { driveService } from '@/services/driveService';
import type {
  EventQueryParams,
  CreateEventInput,
  UpdateEventInput,
  UpdateEventStatusInput,
  CreatePanelInput,
  AssignStudentsInput,
  MarkAttendanceInput,
} from '@/types/event';

// ── Query Keys ─────────────────────────────────────────

export const eventKeys = {
  all: ['events'] as const,
  list: (params: EventQueryParams) => [...eventKeys.all, 'list', params] as const,
  myList: () => [...eventKeys.all, 'my'] as const,
  detail: (id: string) => [...eventKeys.all, 'detail', id] as const,
  myDetail: (id: string) => [...eventKeys.all, 'my-detail', id] as const,
};

// ── Queries ────────────────────────────────────────────

export function useEvents(params: EventQueryParams = {}) {
  return useQuery({
    queryKey: eventKeys.list(params),
    queryFn: () => driveService.getEvents(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useMyEvents(enabled = true) {
  return useQuery({
    queryKey: eventKeys.myList(),
    queryFn: () => driveService.getMyEvents(),
    staleTime: 2 * 60 * 1000,
    enabled,
  });
}

export function useEventDetail(eventId: string) {
  return useQuery({
    queryKey: eventKeys.detail(eventId),
    queryFn: () => driveService.getEventDetail(eventId),
    enabled: !!eventId,
  });
}

export function useMyEventDetail(eventId: string) {
  return useQuery({
    queryKey: eventKeys.myDetail(eventId),
    queryFn: () => driveService.getMyEventDetail(eventId),
    enabled: !!eventId,
  });
}

// ── Mutations ──────────────────────────────────────────

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateEventInput) => driveService.createEvent(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: eventKeys.all });
    },
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: UpdateEventInput }) =>
      driveService.updateEvent(eventId, data),
    onSuccess: (_, { eventId }) => {
      qc.invalidateQueries({ queryKey: eventKeys.all });
      qc.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
    },
  });
}

export function useUpdateEventStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: UpdateEventStatusInput }) =>
      driveService.updateEventStatus(eventId, data),
    onSuccess: (_, { eventId }) => {
      qc.invalidateQueries({ queryKey: eventKeys.all });
      qc.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
    },
  });
}

export function useCreatePanel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: CreatePanelInput }) =>
      driveService.createPanel(eventId, data),
    onSuccess: (_, { eventId }) => {
      qc.invalidateQueries({ queryKey: eventKeys.all });
      qc.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
    },
  });
}

export function useAssignStudents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: AssignStudentsInput }) =>
      driveService.assignStudents(eventId, data),
    onSuccess: (_, { eventId }) => {
      qc.invalidateQueries({ queryKey: eventKeys.all });
      qc.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
    },
  });
}

export function useMarkAttendance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: MarkAttendanceInput }) =>
      driveService.markAttendance(eventId, data),
    onSuccess: (_, { eventId }) => {
      qc.invalidateQueries({ queryKey: eventKeys.all });
      qc.invalidateQueries({ queryKey: eventKeys.detail(eventId) });
    },
  });
}
