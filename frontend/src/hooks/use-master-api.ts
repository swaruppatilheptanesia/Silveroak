import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRole } from '@/contexts/RoleContext';
import { masterService } from '@/services/masterService';
import type {
  AdminMasterQueryParams,
  CreateMasterInput,
  MasterCategory,
  MasterQueryParams,
  UpdateMasterInput,
} from '@/types/master';

export const masterKeys = {
  all: ['masters'] as const,
  public: (params: MasterQueryParams, scope = 'all') => [...masterKeys.all, 'public', scope, params] as const,
  publicValues: (category: MasterCategory, scope = 'all', allTargets = false) =>
    [...masterKeys.all, 'public', 'values', scope, category, allTargets] as const,
  admin: (params: AdminMasterQueryParams) => [...masterKeys.all, 'admin', params] as const,
};

export function useMasters(params: MasterQueryParams = {}, enabled = true) {
  const { currentRole } = useRole();
  return useQuery({
    queryKey: masterKeys.public(params, currentRole),
    queryFn: () => masterService.getMasters(params),
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMasterValues(category: MasterCategory, enabled = true, allTargets = false) {
  const { currentRole } = useRole();
  return useQuery({
    queryKey: masterKeys.publicValues(category, currentRole, allTargets),
    queryFn: async () => {
      const items = await masterService.getMasters({
        category,
        all_targets: allTargets ? true : undefined,
      });
      return items.map((item) => item.value);
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdminMasters(params: AdminMasterQueryParams = {}, enabled = true) {
  return useQuery({
    queryKey: masterKeys.admin(params),
    queryFn: () => masterService.getAdminMasters(params),
    enabled,
    staleTime: 60 * 1000,
  });
}

export function useCreateAdminMaster() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMasterInput) => masterService.createAdminMaster(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterKeys.all });
    },
  });
}

export function useUpdateAdminMaster() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ masterId, data }: { masterId: string; data: UpdateMasterInput }) =>
      masterService.updateAdminMaster(masterId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterKeys.all });
    },
  });
}

export function useDeleteAdminMaster() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (masterId: string) => masterService.deleteAdminMaster(masterId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: masterKeys.all });
    },
  });
}
