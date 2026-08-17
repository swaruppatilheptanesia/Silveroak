import { toDateInputValue } from '@/lib/studentModule';
import type { ApiApplicationListItem } from '@/types/application';
import type { ApiPostingListItem, ApiPostingType } from '@/types/posting';
import type {
  ApiMyOffer,
  ApiOfferAuditEntry,
  ApiOfferDetail,
  ApiOfferListItem,
  ComplianceStatus,
  CreateOfferInput,
  JoiningStatus,
  OfferLifecycleState,
} from '@/types/offer';

export interface OfferFormValues {
  posting_id: string;
  student_id: string;
  type: CreateOfferInput['type'];
  role: string;
  ctc: string;
  stipend: string;
  location: string;
  offer_date: string;
}

type OfferWithJoiningState = Pick<ApiMyOffer | ApiOfferListItem | ApiOfferDetail, 'status' | 'joining_status'>;

export function createEmptyOfferFormValues(): OfferFormValues {
  return {
    posting_id: '',
    student_id: '',
    type: 'job',
    role: '',
    ctc: '',
    stipend: '',
    location: '',
    offer_date: toDateInputValue(new Date().toISOString()),
  };
}

export function postingTypeToOfferType(type: ApiPostingType): CreateOfferInput['type'] {
  return type === 'job' ? 'job' : 'internship';
}

function normalizeNullableString(value: string | null | undefined) {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export function buildCreateOfferPayload(
  values: OfferFormValues,
  posting: Pick<ApiPostingListItem, 'company' | 'type'>
): CreateOfferInput {
  return {
    posting_id: values.posting_id,
    student_id: values.student_id,
    company_id: posting.company.id,
    type: values.type || postingTypeToOfferType(posting.type),
    role: (values.role ?? '').trim(),
    ctc: normalizeNullableString(values.ctc),
    stipend: normalizeNullableString(values.stipend),
    location: normalizeNullableString(values.location),
    offer_date: values.offer_date,
  };
}

export function getEligibleOfferStudents(applications: ApiApplicationListItem[]) {
  const seen = new Set<string>();

  return applications.filter((application) => {
    if (seen.has(application.student.id)) return false;
    seen.add(application.student.id);
    return true;
  });
}

export function getOfferCompensation(offer: Pick<ApiMyOffer | ApiOfferListItem | ApiOfferDetail, 'ctc' | 'stipend'>) {
  return offer.ctc || offer.stipend || '—';
}

export function getOfferLifecycleState(offer: OfferWithJoiningState): OfferLifecycleState {
  if (offer.joining_status === 'joined') return 'joined';
  if (offer.joining_status === 'did_not_join') return 'did_not_join';
  return offer.status;
}

export function formatOfferAuditAction(action: string) {
  switch (action) {
    case 'created':
      return 'Offer created';
    case 'accepted':
      return 'Offer accepted';
    case 'rejected':
      return 'Offer rejected by admin';
    case 'joining_joined':
      return 'Joining confirmed';
    case 'joining_did_not_join':
      return 'Marked as did not join';
    case 'compliance_compliant':
      return 'Compliance set to compliant';
    case 'compliance_blocked':
      return 'Compliance set to blocked';
    case 'compliance_override_enabled':
      return 'Compliance override enabled';
    default:
      return action.replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }
}

export function getDefaultApplicationsBlocked(status: ComplianceStatus) {
  return status === 'blocked';
}

export function buildOfferDefaultsFromPosting(
  current: OfferFormValues,
  posting: Pick<ApiPostingListItem, 'type' | 'role_name' | 'ctc' | 'stipend' | 'location'>
): OfferFormValues {
  return {
    ...current,
    type: postingTypeToOfferType(posting.type),
    role: posting.role_name || current.role,
    ctc: posting.ctc ?? '',
    stipend: posting.stipend ?? '',
    location: posting.location ?? '',
  };
}

export function isJoiningPending(offer: Pick<ApiOfferListItem | ApiOfferDetail, 'status' | 'joining_status'>) {
  return offer.status === 'accepted' && offer.joining_status === 'pending';
}

export function offerSupportsComplianceUpdate(
  offer: Pick<ApiOfferListItem | ApiOfferDetail, 'status'>
) {
  return offer.status === 'accepted' || offer.status === 'rejected_by_admin';
}

export function sortOffersByLatest<T extends Pick<ApiOfferListItem, 'offer_date'>>(offers: T[]) {
  return [...offers].sort((left, right) => {
    return new Date(right.offer_date).getTime() - new Date(left.offer_date).getTime();
  });
}
