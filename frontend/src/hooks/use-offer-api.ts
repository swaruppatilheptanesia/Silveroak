/**
 * React Query hooks for the Offer Management API module.
 * Covers student offers, admin CRUD, joining, compliance.
 */
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { offerService } from '@/services/offerService';
import type {
  OfferQueryParams,
  CreateOfferInput,
  RejectOfferInput,
  JoiningStatusInput,
  ComplianceInput,
} from '@/types/offer';

// ── Query Keys ─────────────────────────────────────────

export const offerKeys = {
  all: ['offers'] as const,
  myOffers: () => [...offerKeys.all, 'my'] as const,
  list: (params: OfferQueryParams) => [...offerKeys.all, 'list', params] as const,
  detail: (id: string) => [...offerKeys.all, 'detail', id] as const,
};

// ── Student Hooks ──────────────────────────────────────

export function useMyOffers() {
  return useQuery({
    queryKey: offerKeys.myOffers(),
    queryFn: () => offerService.getMyOffers(),
  });
}

export function useAcceptOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (offerId: string) => offerService.acceptOffer(offerId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: offerKeys.all });
      qc.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}

export function useRejectOfferByStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ offerId, reason }: { offerId: string; reason?: string }) =>
      offerService.rejectOfferByStudent(offerId, reason ? { reason } : {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: offerKeys.all });
      qc.invalidateQueries({ queryKey: ['applications'] });
    },
  });
}

// ── Admin Hooks ────────────────────────────────────────

export function useOffers(params: OfferQueryParams = {}) {
  return useQuery({
    queryKey: offerKeys.list(params),
    queryFn: () => offerService.getOffers(params),
    staleTime: 60 * 1000,
    // Search and page live in the query key. Without this, every keystroke produces a new key →
    // `isLoading` true → the page's early skeleton return unmounts the search input mid-typing
    // (same fix as useUsers / usePostings).
    placeholderData: keepPreviousData,
  });
}

export function useOfferDetail(offerId: string) {
  return useQuery({
    queryKey: offerKeys.detail(offerId),
    queryFn: () => offerService.getOfferDetail(offerId),
    enabled: !!offerId,
  });
}

export function useCreateOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateOfferInput) => offerService.createOffer(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: offerKeys.all });
    },
  });
}

export function useRejectOffer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ offerId, data }: { offerId: string; data: RejectOfferInput }) =>
      offerService.rejectOffer(offerId, data),
    onSuccess: (_, { offerId }) => {
      qc.invalidateQueries({ queryKey: offerKeys.all });
      qc.invalidateQueries({ queryKey: offerKeys.detail(offerId) });
    },
  });
}

export function useUpdateJoiningStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ offerId, data }: { offerId: string; data: JoiningStatusInput }) =>
      offerService.updateJoiningStatus(offerId, data),
    onSuccess: (_, { offerId }) => {
      qc.invalidateQueries({ queryKey: offerKeys.all });
      qc.invalidateQueries({ queryKey: offerKeys.detail(offerId) });
    },
  });
}

export function useUpdateCompliance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ offerId, data }: { offerId: string; data: ComplianceInput }) =>
      offerService.updateCompliance(offerId, data),
    onSuccess: (_, { offerId }) => {
      qc.invalidateQueries({ queryKey: offerKeys.all });
      qc.invalidateQueries({ queryKey: offerKeys.detail(offerId) });
    },
  });
}
