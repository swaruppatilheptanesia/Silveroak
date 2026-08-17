/**
 * React Query hooks for the Circulars API module.
 * Covers templates CRUD, generated circulars.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { circularService } from '@/services/circularService';
import type {
  TemplateQueryParams,
  CreateTemplateInput,
  UpdateTemplateInput,
  GenerateCircularInput,
} from '@/types/circular';

// ── Query Keys ─────────────────────────────────────────

export const circularKeys = {
  all: ['circulars'] as const,
  templates: (params: TemplateQueryParams) => [...circularKeys.all, 'templates', params] as const,
  templateDetail: (id: string) => [...circularKeys.all, 'template', id] as const,
  generated: () => [...circularKeys.all, 'generated'] as const,
  myCirculars: () => [...circularKeys.all, 'my'] as const,
};

// ── Template Hooks ─────────────────────────────────────

export function useTemplates(params: TemplateQueryParams = {}) {
  return useQuery({
    queryKey: circularKeys.templates(params),
    queryFn: () => circularService.getTemplates(params),
    staleTime: 2 * 60 * 1000,
  });
}

export function useTemplateDetail(templateId: string) {
  return useQuery({
    queryKey: circularKeys.templateDetail(templateId),
    queryFn: () => circularService.getTemplateDetail(templateId),
    enabled: !!templateId,
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTemplateInput) => circularService.createTemplate(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: circularKeys.all });
    },
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: UpdateTemplateInput }) =>
      circularService.updateTemplate(templateId, data),
    onSuccess: (_, { templateId }) => {
      qc.invalidateQueries({ queryKey: circularKeys.all });
      qc.invalidateQueries({ queryKey: circularKeys.templateDetail(templateId) });
    },
  });
}

// ── Generated Circular Hooks ───────────────────────────

export function useGeneratedCirculars() {
  return useQuery({
    queryKey: circularKeys.generated(),
    queryFn: () => circularService.getGeneratedCirculars(),
    staleTime: 2 * 60 * 1000,
  });
}

export function useMyCirculars(enabled = true) {
  return useQuery({
    queryKey: circularKeys.myCirculars(),
    queryFn: () => circularService.getMyCirculars(),
    staleTime: 2 * 60 * 1000,
    enabled,
  });
}

export function useGenerateCircular() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: GenerateCircularInput) => circularService.generateCircular(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: circularKeys.generated() });
      qc.invalidateQueries({ queryKey: circularKeys.all });
    },
  });
}
