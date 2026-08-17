/**
 * React Query hooks for the Employer API module.
 * Covers companies, recruiters, and engagements.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employerService } from '@/services/employerService';
import type {
  CompanyQueryParams,
  RecruiterQueryParams,
  CreateCompanyInput,
  UpdateCompanyInput,
  ClassifyCompanyInput,
  CreateRecruiterInput,
  UpdateRecruiterInput,
  VerifyRecruiterInput,
  CreateEngagementInput,
} from '@/types/employer';

// ── Query Keys ─────────────────────────────────────────

export const employerKeys = {
  all: ['employer'] as const,
  companies: () => [...employerKeys.all, 'companies'] as const,
  companyList: (params: CompanyQueryParams) => [...employerKeys.companies(), params] as const,
  companyDetail: (id: string) => [...employerKeys.companies(), id] as const,
  recruiterList: (params: RecruiterQueryParams) => [...employerKeys.all, 'recruiter-list', params] as const,
  recruiters: (companyId: string) => [...employerKeys.all, 'recruiters', companyId] as const,
  engagements: (companyId: string) => [...employerKeys.all, 'engagements', companyId] as const,
};

// ── Companies ──────────────────────────────────────────

// `enabled` lets callers gate the request (e.g. the Add Company duplicate lookup, which
// should stay idle until the admin has typed enough to search for).
export function useCompanies(params: CompanyQueryParams = {}, enabled = true) {
  return useQuery({
    queryKey: employerKeys.companyList(params),
    queryFn: () => employerService.getCompanies(params),
    staleTime: 2 * 60 * 1000,
    enabled,
  });
}

export function useCompanyDetail(companyId: string) {
  return useQuery({
    queryKey: employerKeys.companyDetail(companyId),
    queryFn: () => employerService.getCompanyById(companyId),
    enabled: !!companyId,
  });
}

export function useCreateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateCompanyInput) => employerService.createCompany(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employerKeys.companies() });
    },
  });
}

export function useImportCompanies() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => employerService.importCompanies(file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employerKeys.companies() });
    },
  });
}

export function useUpdateCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, data }: { companyId: string; data: UpdateCompanyInput }) =>
      employerService.updateCompany(companyId, data),
    onSuccess: (_, { companyId }) => {
      qc.invalidateQueries({ queryKey: employerKeys.companies() });
      qc.invalidateQueries({ queryKey: employerKeys.companyDetail(companyId) });
    },
  });
}

export function useClassifyCompany() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, data }: { companyId: string; data: ClassifyCompanyInput }) =>
      employerService.classifyCompany(companyId, data),
    onSuccess: (_, { companyId }) => {
      qc.invalidateQueries({ queryKey: employerKeys.companies() });
      qc.invalidateQueries({ queryKey: employerKeys.companyDetail(companyId) });
    },
  });
}

// ── Recruiters ─────────────────────────────────────────

export function useRecruiters(params: RecruiterQueryParams = {}, enabled = true) {
  return useQuery({
    queryKey: employerKeys.recruiterList(params),
    queryFn: () => employerService.getRecruiters(params),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useRecruitersByCompany(companyId: string) {
  return useQuery({
    queryKey: employerKeys.recruiters(companyId),
    queryFn: () => employerService.getRecruitersByCompany(companyId),
    enabled: !!companyId,
  });
}

export function useCreateRecruiter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, data }: { companyId: string; data: CreateRecruiterInput }) =>
      employerService.createRecruiter(companyId, data),
    onSuccess: (_, { companyId }) => {
      qc.invalidateQueries({ queryKey: employerKeys.all });
      qc.invalidateQueries({ queryKey: employerKeys.recruiters(companyId) });
    },
  });
}

export function useUpdateRecruiter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ recruiterId, data }: { recruiterId: string; data: UpdateRecruiterInput }) =>
      employerService.updateRecruiter(recruiterId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employerKeys.all });
    },
  });
}

export function useVerifyRecruiter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ recruiterId, data }: { recruiterId: string; data: VerifyRecruiterInput }) =>
      employerService.verifyRecruiter(recruiterId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employerKeys.all });
    },
  });
}

export function useDeleteRecruiter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (recruiterId: string) => employerService.deleteRecruiter(recruiterId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: employerKeys.all });
    },
  });
}

// ── Engagements ────────────────────────────────────────

export function useEngagementsByCompany(companyId: string) {
  return useQuery({
    queryKey: employerKeys.engagements(companyId),
    queryFn: () => employerService.getEngagementsByCompany(companyId),
    enabled: !!companyId,
  });
}

export function useCreateEngagement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ companyId, data }: { companyId: string; data: CreateEngagementInput }) =>
      employerService.createEngagement(companyId, data),
    onSuccess: (_, { companyId }) => {
      qc.invalidateQueries({ queryKey: employerKeys.engagements(companyId) });
      qc.invalidateQueries({ queryKey: employerKeys.companyDetail(companyId) });
    },
  });
}
