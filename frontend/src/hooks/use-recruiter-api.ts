/**
 * React Query hooks for the Recruiter Portal API module.
 * All read-only — PII-filtered responses.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { recruiterService } from '@/services/recruiterService';
import type { RecruiterProfileUpdateInput } from '@/types/recruiter';

// ── Query Keys ─────────────────────────────────────────

export const recruiterKeys = {
  all: ['recruiter'] as const,
  dashboard: () => [...recruiterKeys.all, 'dashboard'] as const,
  company: () => [...recruiterKeys.all, 'company'] as const,
  postings: (companyId: string) => [...recruiterKeys.all, 'postings', companyId] as const,
  applications: (postingId: string) => [...recruiterKeys.all, 'applications', postingId] as const,
};

// ── Hooks ──────────────────────────────────────────────

export function useRecruiterDashboard() {
  return useQuery({
    queryKey: recruiterKeys.dashboard(),
    queryFn: () => recruiterService.getDashboard(),
    staleTime: 60 * 1000,
  });
}

export function useRecruiterCompany() {
  return useQuery({
    queryKey: recruiterKeys.company(),
    queryFn: () => recruiterService.getCompany(),
    staleTime: 60 * 1000,
  });
}

export function useCompanyPostings(companyId: string) {
  return useQuery({
    queryKey: recruiterKeys.postings(companyId),
    queryFn: () => recruiterService.getCompanyPostings(companyId),
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000,
  });
}

export function usePostingApplications(postingId: string) {
  return useQuery({
    queryKey: recruiterKeys.applications(postingId),
    queryFn: () => recruiterService.getPostingApplications(postingId),
    enabled: !!postingId,
    staleTime: 60 * 1000,
  });
}

export function useUpdateRecruiterProfile() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: (data: RecruiterProfileUpdateInput) => recruiterService.updateProfile(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: recruiterKeys.all });
    },
  });
}
