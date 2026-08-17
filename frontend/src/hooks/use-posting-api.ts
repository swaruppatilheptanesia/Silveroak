/**
 * React Query hooks for the Postings API module.
 * Covers listing, detail, create, update, publish, close.
 */
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { postingService } from '@/services/postingService';
import type {
  PostingQueryParams,
  CreatePostingInput,
  UpdatePostingInput,
  PublishPostingInput,
  RepublishPostingInput,
} from '@/types/posting';

// ── Query Keys ─────────────────────────────────────────

export const postingKeys = {
  all: ['postings'] as const,
  list: (params: PostingQueryParams) => [...postingKeys.all, 'list', params] as const,
  detail: (id: string) => [...postingKeys.all, 'detail', id] as const,
};

// ── Queries ────────────────────────────────────────────

export function usePostings(params: PostingQueryParams = {}) {
  return useQuery({
    queryKey: postingKeys.list(params),
    queryFn: () => postingService.getPostings(params),
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
  });
}

export function usePostingDetail(postingId: string) {
  return useQuery({
    queryKey: postingKeys.detail(postingId),
    queryFn: () => postingService.getPostingById(postingId),
    enabled: !!postingId,
  });
}

// ── Mutations ──────────────────────────────────────────

export function useCreatePosting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreatePostingInput) => postingService.createPosting(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: postingKeys.all });
    },
  });
}

export function useUpdatePosting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ postingId, data }: { postingId: string; data: UpdatePostingInput }) =>
      postingService.updatePosting(postingId, data),
    onSuccess: (_, { postingId }) => {
      qc.invalidateQueries({ queryKey: postingKeys.all });
      qc.invalidateQueries({ queryKey: postingKeys.detail(postingId) });
    },
  });
}

export function usePublishPosting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ postingId, data }: { postingId: string; data?: PublishPostingInput }) =>
      postingService.publishPosting(postingId, data),
    onSuccess: (_, { postingId }) => {
      qc.invalidateQueries({ queryKey: postingKeys.all });
      qc.invalidateQueries({ queryKey: postingKeys.detail(postingId) });
    },
  });
}

export function useRepublishPosting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ postingId, data }: { postingId: string; data: RepublishPostingInput }) =>
      postingService.republishPosting(postingId, data),
    onSuccess: (_, { postingId }) => {
      qc.invalidateQueries({ queryKey: postingKeys.all });
      qc.invalidateQueries({ queryKey: postingKeys.detail(postingId) });
    },
  });
}

export function useClosePosting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (postingId: string) => postingService.closePosting(postingId),
    onSuccess: (_, postingId) => {
      qc.invalidateQueries({ queryKey: postingKeys.all });
      qc.invalidateQueries({ queryKey: postingKeys.detail(postingId) });
    },
  });
}

export function useUploadPostingJobDescription() {
  return useMutation({
    mutationFn: (file: File) => postingService.uploadJobDescription(file),
  });
}
