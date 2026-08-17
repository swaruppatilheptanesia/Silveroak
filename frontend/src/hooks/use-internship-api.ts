/**
 * React Query hooks for the Internship Tracking API module.
 * Covers student internships, admin CRUD, issue management.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { internshipService } from '@/services/internshipService';
import type {
  InternshipQueryParams,
  CreateInternshipInput,
  UpdateInternshipInput,
  CreateIssueInput,
} from '@/types/internship';

// ── Query Keys ─────────────────────────────────────────

export const internshipKeys = {
  all: ['internships'] as const,
  myInternships: () => [...internshipKeys.all, 'my'] as const,
  list: (params: InternshipQueryParams) => [...internshipKeys.all, 'list', params] as const,
  detail: (id: string) => [...internshipKeys.all, 'detail', id] as const,
};

// ── Student Hooks ──────────────────────────────────────

export function useMyInternships() {
  return useQuery({
    queryKey: internshipKeys.myInternships(),
    queryFn: () => internshipService.getMyInternships(),
  });
}

export function useCreateInternship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateInternshipInput) => internshipService.createInternship(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: internshipKeys.myInternships() });
      qc.invalidateQueries({ queryKey: internshipKeys.all });
    },
  });
}

export function useUploadInternshipDocument() {
  return useMutation({
    mutationFn: (file: File) => internshipService.uploadInternshipDocument(file),
  });
}

// ── Admin Hooks ────────────────────────────────────────

export function useInternships(params: InternshipQueryParams = {}) {
  return useQuery({
    queryKey: internshipKeys.list(params),
    queryFn: () => internshipService.getInternships(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useInternshipDetail(internshipId: string) {
  return useQuery({
    queryKey: internshipKeys.detail(internshipId),
    queryFn: () => internshipService.getInternshipDetail(internshipId),
    enabled: !!internshipId,
  });
}

export function useUpdateInternship() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ internshipId, data }: { internshipId: string; data: UpdateInternshipInput }) =>
      internshipService.updateInternship(internshipId, data),
    onSuccess: (_, { internshipId }) => {
      qc.invalidateQueries({ queryKey: internshipKeys.all });
      qc.invalidateQueries({ queryKey: internshipKeys.myInternships() });
      qc.invalidateQueries({ queryKey: internshipKeys.detail(internshipId) });
    },
  });
}

// ── Issue Hooks ────────────────────────────────────────

export function useCreateIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ internshipId, data }: { internshipId: string; data: CreateIssueInput }) =>
      internshipService.createIssue(internshipId, data),
    onSuccess: (_, { internshipId }) => {
      qc.invalidateQueries({ queryKey: internshipKeys.all });
      qc.invalidateQueries({ queryKey: internshipKeys.detail(internshipId) });
      qc.invalidateQueries({ queryKey: internshipKeys.myInternships() });
    },
  });
}

export function useResolveIssue() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ issueId }: { issueId: string; internshipId: string }) =>
      internshipService.resolveIssue(issueId),
    onSuccess: (_, { internshipId }) => {
      qc.invalidateQueries({ queryKey: internshipKeys.detail(internshipId) });
      qc.invalidateQueries({ queryKey: internshipKeys.all });
      qc.invalidateQueries({ queryKey: internshipKeys.myInternships() });
    },
  });
}
