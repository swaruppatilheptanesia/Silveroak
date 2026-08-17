/**
 * React Query hooks for the Reports & Dashboard API module.
 * All read-only — no mutations.
 */
import { useQuery } from '@tanstack/react-query';
import { reportService } from '@/services/reportService';

// ── Query Keys ─────────────────────────────────────────

export const reportKeys = {
  all: ['reports'] as const,
  dashboard: () => [...reportKeys.all, 'dashboard'] as const,
  placement: () => [...reportKeys.all, 'placement'] as const,
  pipeline: () => [...reportKeys.all, 'pipeline'] as const,
  companyWise: () => [...reportKeys.all, 'companyWise'] as const,
  departmentWise: () => [...reportKeys.all, 'departmentWise'] as const,
  profileCompletion: () => [...reportKeys.all, 'profileCompletion'] as const,
};

// ── Hooks ──────────────────────────────────────────────

export function useDashboardStats() {
  return useQuery({
    queryKey: reportKeys.dashboard(),
    queryFn: () => reportService.getDashboardStats(),
    staleTime: 60 * 1000,
  });
}

export function usePlacementStats() {
  return useQuery({
    queryKey: reportKeys.placement(),
    queryFn: () => reportService.getPlacementStats(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useApplicationPipeline() {
  return useQuery({
    queryKey: reportKeys.pipeline(),
    queryFn: () => reportService.getApplicationPipeline(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useCompanyWiseStats() {
  return useQuery({
    queryKey: reportKeys.companyWise(),
    queryFn: () => reportService.getCompanyWiseStats(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useDepartmentWiseStats() {
  return useQuery({
    queryKey: reportKeys.departmentWise(),
    queryFn: () => reportService.getDepartmentWiseStats(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useProfileCompletionStats() {
  return useQuery({
    queryKey: reportKeys.profileCompletion(),
    queryFn: () => reportService.getProfileCompletionStats(),
    staleTime: 5 * 60 * 1000,
  });
}
