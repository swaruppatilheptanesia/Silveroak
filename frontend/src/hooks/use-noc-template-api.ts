import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { nocTemplateService } from '@/services/nocTemplateService';
import type { UpsertNocTemplateInput } from '@/types/nocTemplate';

export const nocTemplateKeys = {
  all: ['noc-templates'] as const,
  public: () => [...nocTemplateKeys.all, 'public'] as const,
  admin: () => [...nocTemplateKeys.all, 'admin'] as const,
};

export function useNocTemplates(enabled = true) {
  return useQuery({
    queryKey: nocTemplateKeys.public(),
    queryFn: () => nocTemplateService.getNocTemplates(),
    staleTime: 2 * 60 * 1000,
    enabled,
  });
}

export function useAdminNocTemplates(enabled = true) {
  return useQuery({
    queryKey: nocTemplateKeys.admin(),
    queryFn: () => nocTemplateService.getAdminNocTemplates(),
    staleTime: 60 * 1000,
    enabled,
  });
}

export function useUpsertAdminNocTemplate() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ postingTypeMasterId, data }: { postingTypeMasterId: string; data: UpsertNocTemplateInput }) =>
      nocTemplateService.upsertAdminNocTemplate(postingTypeMasterId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: nocTemplateKeys.all });
    },
  });
}
