/**
 * Drive/Event Service — campus events, panels, attendance.
 * Real API calls + mock data re-exports for gradual migration.
 */
import { apiClient } from './apiClient';
import { parseApiErrorEnvelope, type ApiErrorDetail } from '@/lib/apiError';
import type {
  ApiEventDetail,
  ApiEventPanel,
  PaginatedEvents,
  AssignStudentsResult,
  EventQueryParams,
  CreateEventInput,
  UpdateEventInput,
  UpdateEventStatusInput,
  CreatePanelInput,
  AssignStudentsInput,
  MarkAttendanceInput,
} from '@/types/event';

// ── Re-export mock data for gradual migration ──────────
import {
  mockEvents,
  getEventById,
  getEventsByStatus,
  getEventsByCompany,
  getEventsForStudent,
  getEventsForRecruiter,
  getEventStats,
} from '@/data/mockDrivesData';
import type { PlacementEvent } from '@/types/event';

export {
  mockEvents,
  getEventById,
  getEventsByStatus,
  getEventsByCompany,
  getEventsForStudent,
  getEventsForRecruiter,
  getEventStats,
};

// ── Helper ─────────────────────────────────────────────

class EventApiError extends Error {
  status: number;
  code: string;
  details: ApiErrorDetail[];

  constructor(message: string, status: number, code: string, details: ApiErrorDetail[] = []) {
    super(message);
    this.name = 'EventApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function throwIfError<T>(res: { data: T; error: string | null; status: number }, successStatus = 200): T {
  if (res.status !== successStatus || res.error) {
    const parsed = parseApiErrorEnvelope(res.data, res.error ?? undefined);
    throw new EventApiError(parsed.message, res.status, parsed.code, parsed.details);
  }
  return res.data;
}

function toQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  }
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

// ── Real API ───────────────────────────────────────────

const eventApi = {
  getEvents: async (params: EventQueryParams = {}): Promise<PaginatedEvents> => {
    const res = await apiClient.get<PaginatedEvents>(
      `/events${toQueryString(params as Record<string, unknown>)}`,
    );
    return throwIfError(res);
  },

  getMyEvents: async (): Promise<PaginatedEvents> => {
    const res = await apiClient.get<PaginatedEvents>('/events/my');
    return throwIfError(res);
  },

  getMyEventDetail: async (eventId: string): Promise<ApiEventDetail> => {
    const res = await apiClient.get<ApiEventDetail>(`/events/my/${eventId}`);
    return throwIfError(res);
  },

  getEventDetail: async (eventId: string): Promise<ApiEventDetail> => {
    const res = await apiClient.get<ApiEventDetail>(`/events/${eventId}`);
    return throwIfError(res);
  },

  createEvent: async (data: CreateEventInput): Promise<ApiEventDetail> => {
    const res = await apiClient.post<ApiEventDetail>('/events', data);
    return throwIfError(res, 201);
  },

  updateEvent: async (eventId: string, data: UpdateEventInput): Promise<ApiEventDetail> => {
    const res = await apiClient.put<ApiEventDetail>(`/events/${eventId}`, data);
    return throwIfError(res);
  },

  updateEventStatus: async (eventId: string, data: UpdateEventStatusInput): Promise<ApiEventDetail> => {
    const res = await apiClient.put<ApiEventDetail>(`/events/${eventId}/status`, data);
    return throwIfError(res);
  },

  createPanel: async (eventId: string, data: CreatePanelInput): Promise<ApiEventPanel> => {
    const res = await apiClient.post<ApiEventPanel>(`/events/${eventId}/panels`, data);
    return throwIfError(res, 201);
  },

  assignStudents: async (eventId: string, data: AssignStudentsInput): Promise<AssignStudentsResult> => {
    const res = await apiClient.post<AssignStudentsResult>(`/events/${eventId}/students`, data);
    return throwIfError(res);
  },

  markAttendance: async (eventId: string, data: MarkAttendanceInput): Promise<unknown> => {
    const res = await apiClient.put<unknown>(`/events/${eventId}/attendance`, data);
    return throwIfError(res);
  },
};

// ── Combined export ────────────────────────────────────

export const driveService = {
  // Real API methods
  ...eventApi,

  // Legacy mock methods
  getEventsLegacy: async (): Promise<PlacementEvent[]> => mockEvents,
  getEventByIdLegacy: async (id: string) => getEventById(id),
  getEventsByStatusLegacy: async (status: PlacementEvent['status']) => getEventsByStatus(status),
  getEventsByCompanyLegacy: async (companyId: string) => getEventsByCompany(companyId),
  getEventsForStudentLegacy: async (studentId: string) => getEventsForStudent(studentId),
  getEventsForRecruiterLegacy: async (companyId: string) => getEventsForRecruiter(companyId),
  getEventStatsLegacy: async () => getEventStats(),
};

export { EventApiError };
