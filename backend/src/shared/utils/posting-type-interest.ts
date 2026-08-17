import { prisma } from '../../config/database';
import { BusinessRuleError } from '../errors';

/**
 * Enforces the "enrollment before viewing/applying" rule: a student must first enroll
 * (Show Interest) in a Posting Type before they can view — or apply to — postings under it.
 *
 * Mirrors offer-block.ts / placement-interest.ts / self-placed-noc-block.ts: query-only,
 * no-op when the posting type id is null, throws BusinessRuleError (HTTP 422).
 *
 * InterestRegistration.interest_type stores the posting-type MasterOption `value` verbatim,
 * so all matching is done on the trimmed/lowercased value (interest_type ↔ MasterOption.value).
 * No migration, no schema change.
 */

function normalizeType(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * The set of normalized posting-type values the student has registered interest in and NOT been
 * withdrawn from (i.e. `pending` OR `approved`). Drives VISIBILITY — a pending registration keeps
 * the posting type visible while it awaits TPO approval. Empty set when none.
 */
export async function getRegisteredInterestValues(studentId: string): Promise<Set<string>> {
  const registrations = await prisma.interestRegistration.findMany({
    where: { student_id: studentId, status: { in: ['pending', 'approved'] } },
    select: { interest_type: true },
  });

  return new Set(registrations.map((r) => normalizeType(r.interest_type)));
}

/**
 * The set of normalized posting-type values the student is APPROVED to apply to (`status: approved`).
 * Narrower than the visibility set — a pending registration does not grant apply rights until a TPO
 * admin approves it. Empty set when none.
 */
export async function getApprovedInterestValues(studentId: string): Promise<Set<string>> {
  const registrations = await prisma.interestRegistration.findMany({
    where: { student_id: studentId, status: 'approved' },
    select: { interest_type: true },
  });

  return new Set(registrations.map((r) => normalizeType(r.interest_type)));
}

/**
 * The set of normalized posting-type values a student is allowed to SEE. Wider than the
 * enrolled set: it also includes posting types the student already has an application or
 * offer for, so in-flight applications made before this rule existed aren't hidden.
 */
export async function getVisiblePostingTypeValues(studentId: string): Promise<Set<string>> {
  const [interests, applications, offers] = await Promise.all([
    getRegisteredInterestValues(studentId),
    prisma.application.findMany({
      where: { student_id: studentId },
      select: { posting: { select: { posting_type_master: { select: { value: true } } } } },
    }),
    prisma.offer.findMany({
      where: { student_id: studentId },
      select: { posting: { select: { posting_type_master: { select: { value: true } } } } },
    }),
  ]);

  const values = new Set<string>(interests);
  for (const app of applications) {
    const value = app.posting?.posting_type_master?.value;
    if (value) values.add(normalizeType(value));
  }
  for (const offer of offers) {
    const value = offer.posting?.posting_type_master?.value;
    if (value) values.add(normalizeType(value));
  }
  return values;
}

/**
 * Apply-path guard: the student must have an APPROVED registration for the posting's type. A
 * `pending` registration (awaiting TPO approval) does NOT grant apply rights → distinct 422 so the
 * caller can show a clearer "awaiting approval" message. No-op when postingTypeMasterId is missing or
 * the master can't be resolved. (Visibility uses the wider getVisiblePostingTypeValues.)
 */
export async function assertInterestRegistered(
  studentId: string,
  postingTypeMasterId: string | null | undefined,
): Promise<void> {
  if (!postingTypeMasterId) return;

  const option = await prisma.masterOption.findUnique({
    where: { id: postingTypeMasterId },
    select: { value: true },
  });
  if (!option?.value) return;

  const normalizedValue = normalizeType(option.value);
  const approved = await getApprovedInterestValues(studentId);
  if (approved.has(normalizedValue)) return;

  // Not approved — distinguish "registered but pending TPO approval" from "never registered".
  const registered = await getRegisteredInterestValues(studentId);
  if (registered.has(normalizedValue)) {
    throw new BusinessRuleError(
      'Your registration for this posting type is awaiting TPO approval. You can apply once it is approved.',
      'POSTING_TYPE_PENDING_APPROVAL',
    );
  }
  throw new BusinessRuleError(
    'You have not enrolled in this posting type. Register your interest in it before applying.',
    'POSTING_TYPE_NOT_ENROLLED',
  );
}

export { normalizeType as normalizePostingTypeValue };
