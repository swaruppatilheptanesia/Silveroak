import { prisma } from '../../config/database';
import { BusinessRuleError } from '../errors';

/**
 * Enforces the student placement opt-out rule before apply / register-interest:
 *  - If the student globally opted out of placement → block everything.
 *  - Else if the student opted out of this specific posting type → block.
 *
 * Postings stay visible to the student; this only blocks the register/apply action.
 * Managed from Profile → Placement. See CLAUDE.md (global overrides per-type).
 */
export async function assertPlacementInterest(
  studentId: string,
  postingTypeMasterId: string | null | undefined,
): Promise<void> {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { placement_opt_out: true },
  });

  if (student?.placement_opt_out) {
    throw new BusinessRuleError(
      'You have opted out of placement. Contact the T&P office to re-enable it to continue.',
      'PLACEMENT_OPT_OUT',
    );
  }

  if (!postingTypeMasterId) return;

  const preference = await prisma.studentPostingTypePreference.findUnique({
    where: { student_id_posting_type_master_id: { student_id: studentId, posting_type_master_id: postingTypeMasterId } },
    select: { interested: true },
  });

  if (preference && !preference.interested) {
    throw new BusinessRuleError(
      'You have opted out of this posting type. Contact the T&P office to re-enable it to continue.',
      'POSTING_TYPE_OPT_OUT',
    );
  }
}
