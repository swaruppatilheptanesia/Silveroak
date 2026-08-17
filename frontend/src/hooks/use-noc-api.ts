/**
 * React Query hooks for the NOC API module.
 * Covers student NOC requests, faculty/TPO approval, rejection, issuance.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { nocService } from '@/services/nocService';
import type {
  NocQueryParams,
  CreateNocInput,
  ApproveNocInput,
  RejectNocInput,
} from '@/types/noc';

// ── Query Keys ─────────────────────────────────────────

export const nocKeys = {
  all: ['nocs'] as const,
  myNocs: () => [...nocKeys.all, 'my'] as const,
  list: (params: NocQueryParams) => [...nocKeys.all, 'list', params] as const,
  detail: (id: string) => [...nocKeys.all, 'detail', id] as const,
  fieldSuggestions: () => [...nocKeys.all, 'field-suggestions'] as const,
};

// ── Student Hooks ──────────────────────────────────────

export function useMyNocs() {
  return useQuery({
    queryKey: nocKeys.myNocs(),
    queryFn: () => nocService.getMyNocs(),
  });
}

export function useCreateNoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateNocInput) => nocService.createNoc(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: nocKeys.myNocs() });
      qc.invalidateQueries({ queryKey: nocKeys.all });
    },
  });
}

export function useUploadNocOfferLetter() {
  return useMutation({
    mutationFn: (file: File) => nocService.uploadOfferLetter(file),
  });
}

export function useUploadNocSupportingDocument() {
  return useMutation({
    mutationFn: (file: File) => nocService.uploadSupportingDocument(file),
  });
}

export function useNocFieldSuggestions(enabled = true) {
  return useQuery({
    queryKey: nocKeys.fieldSuggestions(),
    queryFn: () => nocService.getFieldSuggestions(),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

// ── Admin / Faculty Hooks ──────────────────────────────

export function useNocs(params: NocQueryParams = {}) {
  return useQuery({
    queryKey: nocKeys.list(params),
    queryFn: () => nocService.getNocs(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useNocDetail(nocId: string) {
  return useQuery({
    queryKey: nocKeys.detail(nocId),
    queryFn: () => nocService.getNocDetail(nocId),
    enabled: !!nocId,
  });
}

export function useFacultyApproveNoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ nocId, data }: { nocId: string; data: ApproveNocInput }) =>
      nocService.facultyApprove(nocId, data),
    onSuccess: (_, { nocId }) => {
      qc.invalidateQueries({ queryKey: nocKeys.all });
      qc.invalidateQueries({ queryKey: nocKeys.detail(nocId) });
    },
  });
}

export function useTpoApproveNoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ nocId, data }: { nocId: string; data: ApproveNocInput }) =>
      nocService.tpoApprove(nocId, data),
    onSuccess: (_, { nocId }) => {
      qc.invalidateQueries({ queryKey: nocKeys.all });
      qc.invalidateQueries({ queryKey: nocKeys.detail(nocId) });
    },
  });
}

export function useRejectNoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ nocId, data }: { nocId: string; data: RejectNocInput }) =>
      nocService.rejectNoc(nocId, data),
    onSuccess: (_, { nocId }) => {
      qc.invalidateQueries({ queryKey: nocKeys.all });
      qc.invalidateQueries({ queryKey: nocKeys.detail(nocId) });
    },
  });
}

export function useIssueNoc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nocId: string) => nocService.issueNoc(nocId),
    onSuccess: (_, nocId) => {
      qc.invalidateQueries({ queryKey: nocKeys.all });
      qc.invalidateQueries({ queryKey: nocKeys.detail(nocId) });
    },
  });
}

// ── Completion Certificate ─────────────────────────────

export function useSubmitCompletionCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ nocId, file }: { nocId: string; file: File }) =>
      nocService.uploadCompletionCertificate(nocId, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: nocKeys.myNocs() });
      qc.invalidateQueries({ queryKey: nocKeys.all });
    },
  });
}

export function useApproveCompletionCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (nocId: string) => nocService.approveCompletionCertificate(nocId),
    onSuccess: (_, nocId) => {
      qc.invalidateQueries({ queryKey: nocKeys.all });
      qc.invalidateQueries({ queryKey: nocKeys.detail(nocId) });
    },
  });
}

export function useRejectCompletionCertificate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ nocId, remarks }: { nocId: string; remarks: string }) =>
      nocService.rejectCompletionCertificate(nocId, remarks),
    onSuccess: (_, { nocId }) => {
      qc.invalidateQueries({ queryKey: nocKeys.all });
      qc.invalidateQueries({ queryKey: nocKeys.detail(nocId) });
    },
  });
}
