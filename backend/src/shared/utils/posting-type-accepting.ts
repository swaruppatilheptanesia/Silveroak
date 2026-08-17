import { prisma } from '../../config/database';
import { BusinessRuleError } from '../errors';

/**
 * Enforces the "Application Receiving" toggle on a posting-type master.
 *
 * When a TPO admin sets `accepting_applications = false` on a posting type, students may still SEE
 * the type (it is not hidden like `is_active = false`), but they may not register interest in it or
 * apply to its postings. Called in application.service.apply() and student.service.registerInterests().
 * No-op when no posting type is provided or the type is accepting.
 *
 * Mirrors the assertPostingTypePolicyAccepted / assertPlacementInterest guard pattern.
 */
export async function assertPostingTypeAcceptingApplications(
  postingTypeMasterId: string | null | undefined,
): Promise<void> {
  if (!postingTypeMasterId) return;

  const master = await prisma.masterOption.findUnique({
    where: { id: postingTypeMasterId },
    select: { accepting_applications: true, value: true },
  });

  if (master && master.accepting_applications === false) {
    throw new BusinessRuleError(
      `Applications are currently closed for "${master.value}".`,
      'POSTING_TYPE_NOT_RECEIVING',
    );
  }
}
