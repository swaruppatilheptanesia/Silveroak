import { prisma } from '../../config/database';
import { BusinessRuleError } from '../errors';
import { NdcStatus } from '@prisma/client';

/**
 * Enforces the "one approved No Dues per student" rule. Once a student has an approved (or issued)
 * No Dues record, the process is complete: no new submission/resubmission and no admin review, edit,
 * or status change is allowed for any of that student's requests.
 *
 * Mirrors the assert* guard pattern (offer-block.ts / self-placed-noc-block.ts): query-only, throws
 * BusinessRuleError (HTTP 422). Always call it as a PRE-CHECK before the mutation so the FIRST
 * approval still succeeds (no approved record exists yet at that moment). issueNoDues is deliberately
 * NOT guarded — approved→issued is the legitimate completion of an already-approved request.
 */

// A No Dues record locks the student's process while it is approved or issued.
export const APPROVED_NO_DUES_STATUSES: NdcStatus[] = [NdcStatus.approved, NdcStatus.issued];

/** True if the student already has an approved (or issued) No Dues record. Query-only. */
export async function hasApprovedNoDues(studentId: string, tenantId: string): Promise<boolean> {
  const existing = await prisma.noDuesRequest.findFirst({
    where: {
      tenant_id: tenantId,
      student_id: studentId,
      status: { in: APPROVED_NO_DUES_STATUSES },
    },
    select: { id: true },
  });

  return Boolean(existing);
}

/** Throws 422 if the student already has an approved/issued No Dues record (No Dues module guard). */
export async function assertNoApprovedNoDues(studentId: string, tenantId: string): Promise<void> {
  if (await hasApprovedNoDues(studentId, tenantId)) {
    throw new BusinessRuleError(
      'This student already has an approved No Dues certificate; no further No Dues requests or actions are allowed.',
      'NO_DUES_ALREADY_APPROVED',
    );
  }
}
