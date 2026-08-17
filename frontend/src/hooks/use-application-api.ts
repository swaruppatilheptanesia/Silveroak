/**
 * React Query hooks for the Application Pipeline API module.
 * Covers student apply/withdraw, admin pipeline management, bulk ops, mock rounds.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationService } from '@/services/applicationService';
import type {
  ApplicationQueryParams,
  ApplyInput,
  MoveStageInput,
  BulkMoveStageInput,
  MockRoundResultInput,
} from '@/types/application';

// ── Query Keys ─────────────────────────────────────────

export const applicationKeys = {
  all: ['applications'] as const,
  myApps: () => [...applicationKeys.all, 'my'] as const,
  list: (params: ApplicationQueryParams) => [...applicationKeys.all, 'list', params] as const,
  listAll: (params: ApplicationQueryParams) => [...applicationKeys.all, 'list-all', params] as const,
  detail: (id: string) => [...applicationKeys.all, 'detail', id] as const,
};

// ── Student Hooks ──────────────────────────────────────

export function useMyApplications() {
  return useQuery({
    queryKey: applicationKeys.myApps(),
    queryFn: () => applicationService.getMyApplications(),
  });
}

export function useApplyToPosting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ApplyInput) => applicationService.apply(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: applicationKeys.myApps() });
    },
  });
}

export function useWithdrawApplication() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (applicationId: string) => applicationService.withdraw(applicationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: applicationKeys.myApps() });
    },
  });
}

// ── Admin Hooks ────────────────────────────────────────

export function useApplications(params: ApplicationQueryParams = {}) {
  return useQuery({
    queryKey: applicationKeys.list(params),
    queryFn: () => applicationService.getApplications(params),
    staleTime: 60 * 1000,
  });
}

export function useAllApplications(params: ApplicationQueryParams = {}, enabled = true) {
  return useQuery({
    queryKey: applicationKeys.listAll(params),
    queryFn: () => applicationService.getAllApplications(params),
    staleTime: 60 * 1000,
    enabled,
  });
}

export function useApplicationDetail(applicationId: string) {
  return useQuery({
    queryKey: applicationKeys.detail(applicationId),
    queryFn: () => applicationService.getApplicationDetail(applicationId),
    enabled: !!applicationId,
  });
}

export function useMoveStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ applicationId, data }: { applicationId: string; data: MoveStageInput }) =>
      applicationService.moveStage(applicationId, data),
    onSuccess: (_, { applicationId }) => {
      qc.invalidateQueries({ queryKey: applicationKeys.all });
      qc.invalidateQueries({ queryKey: applicationKeys.detail(applicationId) });
    },
  });
}

export function useBulkMoveStage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BulkMoveStageInput) => applicationService.bulkMoveStage(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: applicationKeys.all });
    },
  });
}

export function useSetMockRoundResult() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ applicationId, data }: { applicationId: string; data: MockRoundResultInput }) =>
      applicationService.setMockRoundResult(applicationId, data),
    onSuccess: (_, { applicationId }) => {
      qc.invalidateQueries({ queryKey: applicationKeys.all });
      qc.invalidateQueries({ queryKey: applicationKeys.detail(applicationId) });
    },
  });
}
