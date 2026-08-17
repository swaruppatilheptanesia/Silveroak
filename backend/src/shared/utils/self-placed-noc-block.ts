import { prisma } from '../../config/database';
import { BusinessRuleError } from '../errors';
import { NocStatus, PlacementSource } from '@prisma/client';

/**
 * Enforces the "self-placed NOC block": once a student has a self-sourced (off-campus,
 * self-placed) NOC that is NOT rejected for a given posting type, they cannot apply to —
 * or register interest in — postings of that SAME posting type. Other posting types stay
 * open. University-drive NOCs never trigger this (those are governed by the offer block).
 *
 * Mirrors offer-block.ts / placement-interest.ts: query-only, throws BusinessRuleError (HTTP 422).
 * NocRequest.program stores the posting-type MasterOption `value` verbatim, so we compare on the
 * trimmed/lowercased value (NOC program ↔ MasterOption.value) — no migration, no schema change.
 */

// A self-placed NOC blocks while it is anything other than rejected.
export const BLOCKING_SELF_PLACED_NOC_STATUSES: NocStatus[] = [
  NocStatus.pending_faculty,
  NocStatus.pending_tpo,
  NocStatus.pending_company_verification,
  NocStatus.approved,
  NocStatus.issued,
];

function normalizeProgram(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Returns the set of normalized posting-type values the student is self-placed for
 * (non-rejected self-sourced NOCs). Empty set when none.
 */
export async function getSelfPlacedNocProgramValues(studentId: string): Promise<Set<string>> {
  const nocs = await prisma.nocRequest.findMany({
    where: {
      student_id: studentId,
      placement_source: PlacementSource.self_sourced,
      status: { in: BLOCKING_SELF_PLACED_NOC_STATUSES },
    },
    select: { program: true },
  });

  return new Set(nocs.map((noc) => normalizeProgram(noc.program)));
}

/**
 * Apply-path guard: blocks when the student has a self-placed NOC for the posting's type.
 * No-op when postingTypeMasterId is missing or the master option can't be resolved.
 */
export async function assertNoSelfPlacedNoc(
  studentId: string,
  postingTypeMasterId: string | null | undefined,
): Promise<void> {
  if (!postingTypeMasterId) return;

  const option = await prisma.masterOption.findUnique({
    where: { id: postingTypeMasterId },
    select: { value: true },
  });
  if (!option?.value) return;

  const blocked = await getSelfPlacedNocProgramValues(studentId);
  if (blocked.has(normalizeProgram(option.value))) {
    throw new BusinessRuleError(
      'You have a self-placed (self-sourced) NOC for this posting type, so applications for it are blocked.',
      'SELF_PLACED_NOC_BLOCK',
    );
  }
}
