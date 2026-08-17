import { prisma } from '../../config/database';
import { BusinessRuleError } from '../errors';

const NO_POLICY_MATCH = '__no_policy_audience_match__';

/**
 * Enforces posting-type policy acceptance before apply / register-interest.
 *
 * If the posting type has one or more LINKED policies (Policy.posting_type_master_id set),
 * the student must hold an EXPLICIT current acceptance (PolicyAcceptance row matching the policy's
 * updated_at) for EVERY audience-visible one. No-op when the posting type has no linked policy or
 * none is provided.
 *
 * Kept strictly separate from the GLOBAL policy gate (student.policy_accepted /
 * areAllVisiblePoliciesAccepted) — mixing linked policies into that gate would deadlock it.
 * Mirrors the assertPlacementInterest / assertNoSelfPlacedNoc guard pattern.
 */
export async function assertPostingTypePolicyAccepted(
  studentId: string,
  postingTypeMasterId: string | null | undefined,
): Promise<void> {
  if (!postingTypeMasterId) return;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      tenant_id: true,
      institute: true,
      department: true,
      course: true,
    },
  });
  if (!student) return;

  const policies = await prisma.policy.findMany({
    where: {
      tenant_id: student.tenant_id,
      posting_type_master_id: postingTypeMasterId,
      AND: [
        {
          OR: [
            { target_institutes: { isEmpty: true } },
            { target_institutes: { has: student.institute ?? NO_POLICY_MATCH } },
          ],
        },
        {
          OR: [
            { target_branches: { isEmpty: true } },
            { target_branches: { has: student.department ?? NO_POLICY_MATCH } },
          ],
        },
        {
          OR: [
            { target_courses: { isEmpty: true } },
            { target_courses: { has: student.course ?? NO_POLICY_MATCH } },
          ],
        },
      ],
    },
    select: { id: true, updated_at: true },
  });

  if (policies.length === 0) return;

  const acceptances = await prisma.policyAcceptance.findMany({
    where: { student_id: studentId, policy_id: { in: policies.map((policy) => policy.id) } },
    select: { policy_id: true, policy_updated_at: true },
  });

  // Every policy here is posting-type-LINKED by construction (queried by posting_type_master_id), so
  // acceptance must be explicit. There is deliberately NO fallback to Student.policy_accepted_at —
  // that timestamp records acceptance of the GLOBAL policy and says nothing about this one; honouring
  // it here silently exempted any student whose global acceptance postdated the policy's last edit.
  const allAccepted = policies.every((policy) =>
    acceptances.some(
      (acceptance) =>
        acceptance.policy_id === policy.id
        && acceptance.policy_updated_at?.getTime() === policy.updated_at.getTime(),
    ),
  );

  if (!allAccepted) {
    throw new BusinessRuleError(
      'Please read and accept the policy for this posting type before continuing.',
      'POSTING_TYPE_POLICY_NOT_ACCEPTED',
    );
  }
}
