/**
 * React Query hooks for the Policies API module.
 * Covers admin CRUD for placement policies.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { policyService } from '@/services/policyService';
import type {
  PolicyQueryParams,
  CreatePolicyInput,
  UpdatePolicyInput,
} from '@/types/policy';

// ── Query Keys ─────────────────────────────────────────

export const policyKeys = {
  all: ['policies'] as const,
  list: (params: PolicyQueryParams) => [...policyKeys.all, 'list', params] as const,
  detail: (id: string) => [...policyKeys.all, 'detail', id] as const,
  institutes: () => [...policyKeys.all, 'audience', 'institutes'] as const,
  courses: (instituteId: number | null) => [...policyKeys.all, 'audience', 'courses', instituteId] as const,
  branches: (courseId: number | null) => [...policyKeys.all, 'audience', 'branches', courseId] as const,
};

// ── Hooks ──────────────────────────────────────────────

export function usePolicies(params: PolicyQueryParams = {}, enabled = true) {
  return useQuery({
    queryKey: policyKeys.list(params),
    queryFn: () => policyService.getPolicies(params),
    staleTime: 5 * 60 * 1000,
    enabled,
  });
}

export function usePolicyDetail(id: string) {
  return useQuery({
    queryKey: policyKeys.detail(id),
    queryFn: () => policyService.getPolicyDetail(id),
    enabled: !!id,
  });
}

export function usePolicyInstituteOptions(enabled = true) {
  return useQuery({
    queryKey: policyKeys.institutes(),
    queryFn: () => policyService.getInstituteOptions(),
    enabled,
    staleTime: 30 * 60 * 1000,
  });
}

export function usePolicyCourseOptions(instituteId: number | null) {
  return useQuery({
    queryKey: policyKeys.courses(instituteId),
    queryFn: () => policyService.getCourseOptions(instituteId!),
    enabled: Boolean(instituteId),
    staleTime: 30 * 60 * 1000,
  });
}

export function usePolicyBranchOptions(courseId: number | null) {
  return useQuery({
    queryKey: policyKeys.branches(courseId),
    queryFn: () => policyService.getBranchOptions(courseId!),
    enabled: Boolean(courseId),
    staleTime: 30 * 60 * 1000,
  });
}

export function useCreatePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePolicyInput) => policyService.createPolicy(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: policyKeys.all });
    },
  });
}

export function useUpdatePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdatePolicyInput }) =>
      policyService.updatePolicy(id, data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: policyKeys.all });
      qc.invalidateQueries({ queryKey: policyKeys.detail(id) });
    },
  });
}

export function useUploadPolicyDocument() {
  return useMutation({
    mutationFn: (file: File) => policyService.uploadPolicyDocument(file),
  });
}

export function useDeletePolicy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => policyService.deletePolicy(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: policyKeys.all });
    },
  });
}
