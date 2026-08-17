/**
 * React Query hooks for the Portfolio API module.
 * Covers student portfolio, projects, internship showcases.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { portfolioService } from '@/services/portfolioService';
import type {
  UpdatePortfolioStatusInput,
  CreatePortfolioProjectInput,
  UpdatePortfolioProjectInput,
  CreateShowcaseInput,
} from '@/types/portfolio';

// ── Query Keys ─────────────────────────────────────────

export const portfolioKeys = {
  all: ['portfolio'] as const,
  me: () => [...portfolioKeys.all, 'me'] as const,
  student: (studentId: string) => [...portfolioKeys.all, 'student', studentId] as const,
};

// ── Hooks ──────────────────────────────────────────────

export function useMyPortfolio() {
  return useQuery({
    queryKey: portfolioKeys.me(),
    queryFn: () => portfolioService.getMyPortfolio(),
  });
}

export function useStudentPortfolio(studentId: string) {
  return useQuery({
    queryKey: portfolioKeys.student(studentId),
    queryFn: () => portfolioService.getStudentPortfolio(studentId),
    enabled: Boolean(studentId),
  });
}

export function useUpdatePortfolioStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdatePortfolioStatusInput) => portfolioService.updateStatus(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: portfolioKeys.me() });
    },
  });
}

export function useAddPortfolioProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePortfolioProjectInput) => portfolioService.addProject(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: portfolioKeys.me() });
      qc.invalidateQueries({ queryKey: ['student', 'projects'] });
      qc.invalidateQueries({ queryKey: ['student', 'profile'] });
    },
  });
}

export function useUpdatePortfolioProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, data }: { projectId: string; data: UpdatePortfolioProjectInput }) =>
      portfolioService.updateProject(projectId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: portfolioKeys.me() });
      qc.invalidateQueries({ queryKey: ['student', 'projects'] });
    },
  });
}

export function useDeletePortfolioProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => portfolioService.deleteProject(projectId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: portfolioKeys.me() });
      qc.invalidateQueries({ queryKey: ['student', 'projects'] });
      qc.invalidateQueries({ queryKey: ['student', 'profile'] });
    },
  });
}

export function useAddShowcase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateShowcaseInput) => portfolioService.addShowcase(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: portfolioKeys.me() });
    },
  });
}

export function useUploadShowcaseProof() {
  return useMutation({
    mutationFn: (file: File) => portfolioService.uploadShowcaseProof(file),
  });
}

export function useDeleteShowcase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (showcaseId: string) => portfolioService.deleteShowcase(showcaseId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: portfolioKeys.me() });
    },
  });
}
