import { prisma } from '../../config/database';
import { BusinessRuleError } from '../errors';
import { OfferStatus } from '@prisma/client';

/**
 * Enforces the per-Posting-Type offer lock: once a student has a NON-REJECTED offer for a given
 * posting type (and that offer has NOT been granted an admin override), they cannot apply to — or
 * register interest in — postings of that SAME posting type. Other posting types stay open.
 *
 * Scoped + override-aware (changed 2026-09-21 from a global, permanent, override-blind block —
 * see CLAUDE.md "Offer flow"):
 *   - only `pending_student_action` / `accepted` offers block (rejected offers do NOT block);
 *   - an offer with `admin_override_enabled: true` (admin set compliance = "override_enabled")
 *     stops blocking its posting type.
 *
 * Mirrors self-placed-noc-block.ts / posting-type-interest.ts: query-only, no-op when the posting
 * type id is null, throws BusinessRuleError (HTTP 422). Matching is on the posting-type MasterOption
 * `value` (Offer → posting → posting_type_master.value), trimmed/lowercased — no migration.
 */

// An offer blocks its posting type while it is released (awaiting the student) or accepted.
export const BLOCKING_OFFER_STATUSES: OfferStatus[] = [
  OfferStatus.pending_student_action,
  OfferStatus.accepted,
];

function normalizeType(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Returns the set of normalized posting-type values the student is locked into by a non-rejected,
 * non-overridden offer. Empty set when none.
 */
export async function getBlockingOfferProgramValues(studentId: string): Promise<Set<string>> {
  const offers = await prisma.offer.findMany({
    where: {
      student_id: studentId,
      status: { in: BLOCKING_OFFER_STATUSES },
      admin_override_enabled: false,
    },
    select: { posting: { select: { posting_type_master: { select: { value: true } } } } },
  });

  const values = new Set<string>();
  for (const offer of offers) {
    const value = offer.posting?.posting_type_master?.value;
    if (value) values.add(normalizeType(value));
  }
  return values;
}

/**
 * Apply-path guard: blocks when the student has a non-rejected, non-overridden offer for the
 * posting's type. No-op when postingTypeMasterId is missing or the master option can't be resolved.
 */
export async function assertNoBlockingOfferForType(
  studentId: string,
  postingTypeMasterId: string | null | undefined,
): Promise<void> {
  if (!postingTypeMasterId) return;

  const option = await prisma.masterOption.findUnique({
    where: { id: postingTypeMasterId },
    select: { value: true },
  });
  if (!option?.value) return;

  const blocked = await getBlockingOfferProgramValues(studentId);
  if (blocked.has(normalizeType(option.value))) {
    throw new BusinessRuleError(
      'You already have an active offer for this posting type; applications for it are locked.',
      'APPLICATIONS_LOCKED_BY_OFFER',
    );
  }
}
