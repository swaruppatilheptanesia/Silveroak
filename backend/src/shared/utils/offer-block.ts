import { prisma } from '../../config/database';
import { BusinessRuleError } from '../errors';

/**
 * Enforces the "permanent applications block" rule: once a student has any
 * offer record (released, accepted, rejected by student or admin), they
 * cannot apply to or register interest in any other posting.
 *
 * Rule is intentionally strict per project decision — even rejected offers
 * count. See plan and CLAUDE.md if revisiting.
 */
export async function assertNoExistingOffer(studentId: string): Promise<void> {
  const offerCount = await prisma.offer.count({ where: { student_id: studentId } });
  if (offerCount > 0) {
    throw new BusinessRuleError(
      'You already have an offer on record; applications are locked.',
      'APPLICATIONS_LOCKED_BY_OFFER',
    );
  }
}
