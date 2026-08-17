/**
 * React Query hooks for the No-Dues API module.
 * Covers student requests, admin review, NDC issuance.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { noDuesService } from '@/services/noDuesService';
import type {
  NoDuesQueryParams,
  CreateNoDuesInput,
  ReviewNoDuesInput,
} from '@/types/noDues';

// ── Query Keys ─────────────────────────────────────────

export const noDuesKeys = {
  all: ['noDues'] as const,
  myRequests: () => [...noDuesKeys.all, 'my'] as const,
  myEligibility: () => [...noDuesKeys.all, 'my-eligibility'] as const,
  list: (params: NoDuesQueryParams) => [...noDuesKeys.all, 'list', params] as const,
  detail: (id: string) => [...noDuesKeys.all, 'detail', id] as const,
};

// ── Student Hooks ──────────────────────────────────────

export function useMyNoDuesRequests() {
  return useQuery({
    queryKey: noDuesKeys.myRequests(),
    queryFn: () => noDuesService.getMyRequests(),
  });
}

export function useMyNoDuesEligibility() {
  return useQuery({
    queryKey: noDuesKeys.myEligibility(),
    queryFn: () => noDuesService.getMyEligibility(),
  });
}

export function useCreateNoDuesRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateNoDuesInput) => noDuesService.createRequest(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: noDuesKeys.myRequests() });
      qc.invalidateQueries({ queryKey: noDuesKeys.all });
    },
  });
}

export function useUploadNoDuesProof() {
  return useMutation({
    mutationFn: (file: File) => noDuesService.uploadProof(file),
  });
}

export function useResubmitNoDuesRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateNoDuesInput }) =>
      noDuesService.resubmitRequest(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: noDuesKeys.myRequests() });
      qc.invalidateQueries({ queryKey: noDuesKeys.all });
      qc.invalidateQueries({ queryKey: noDuesKeys.detail(id) });
    },
  });
}

// ── Admin Hooks ────────────────────────────────────────

export function useNoDuesRequests(params: NoDuesQueryParams = {}) {
  return useQuery({
    queryKey: noDuesKeys.list(params),
    queryFn: () => noDuesService.getRequests(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useNoDuesDetail(id: string) {
  return useQuery({
    queryKey: noDuesKeys.detail(id),
    queryFn: () => noDuesService.getRequestDetail(id),
    enabled: !!id,
  });
}

export function useReviewNoDues() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReviewNoDuesInput }) =>
      noDuesService.reviewRequest(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: noDuesKeys.all });
      qc.invalidateQueries({ queryKey: noDuesKeys.detail(id) });
    },
  });
}

export function useUpdateNoDuesRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: CreateNoDuesInput }) =>
      noDuesService.updateRequest(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: noDuesKeys.all });
      qc.invalidateQueries({ queryKey: noDuesKeys.detail(id) });
    },
  });
}

export function useImportNoDuesEligibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => noDuesService.importEligibility(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: noDuesKeys.all });
    },
  });
}

export function useEnableNoDuesEligibility() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (enrollmentNumber: string) => noDuesService.enableEligibility(enrollmentNumber),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: noDuesKeys.all });
    },
  });
}

export function useIssueNdc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => noDuesService.issueNdc(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: noDuesKeys.all });
      qc.invalidateQueries({ queryKey: noDuesKeys.detail(id) });
    },
  });
}
