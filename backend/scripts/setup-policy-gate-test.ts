/**
 * Test fixture: make a student eligible to apply to a posting whose POSTING TYPE has a linked
 * policy, so the program-specific policy gate can be exercised end to end.
 *
 * It reports the student's state against every apply guard, then (with --apply) clears the blockers
 * and creates the fixture. Everything it creates is tagged "[TEST]" so --remove can undo it.
 *
 * Usage (from docs/silveroak_backend):
 *   tsx scripts/setup-policy-gate-test.ts                    # dry-run: report only
 *   tsx scripts/setup-policy-gate-test.ts --apply            # set it up
 *   tsx scripts/setup-policy-gate-test.ts --apply --student="Aditi"
 *   tsx scripts/setup-policy-gate-test.ts --remove --apply   # undo (keeps the student's own data)
 *
 * The apply guard chain it satisfies (application.service.apply, in order):
 *   assertNoExistingOffer -> published + application window -> student.policy_accepted ->
 *   assertInterestRegistered -> assertPlacementInterest -> assertNoSelfPlacedNoc ->
 *   assertPostingTypePolicyAccepted (the gate under test — deliberately LEFT unsatisfied) ->
 *   already-applied -> branch / batch / cgpa / backlog eligibility
 */

import 'dotenv/config';
import { prisma } from '../src/config/database';

const TEST_MARKER = '[TEST]';
const POSTING_TYPE_VALUE = 'Test Placement'; // untargeted master -> visible to every student
const POSTING_TITLE = `${TEST_MARKER} Policy Gate QA Role`;
const POLICY_TITLE = `${TEST_MARKER} Program Policy - Test Placement`;
const GLOBAL_POLICY_TITLE = `${TEST_MARKER} Placement Policy (Global)`;

function arg(name: string, fallback: string) {
  const found = process.argv.find((value) => value.startsWith(`--${name}=`));
  return found ? found.split('=')[1]!.replace(/^["']|["']$/g, '') : fallback;
}

async function remove(apply: boolean) {
  const postings = await prisma.posting.findMany({ where: { title: { startsWith: TEST_MARKER } }, select: { id: true, title: true } });
  const policies = await prisma.policy.findMany({ where: { title: { startsWith: TEST_MARKER } }, select: { id: true, title: true } });
  const apps = await prisma.application.count({ where: { posting_id: { in: postings.map((p) => p.id) } } });

  console.log(`Test postings: ${postings.length}, test policies: ${policies.length}, applications on them: ${apps}`);
  if (!apply) return console.log('\nDry-run. Re-run with --remove --apply to delete.');

  await prisma.application.deleteMany({ where: { posting_id: { in: postings.map((p) => p.id) } } });
  await prisma.policyAcceptance.deleteMany({ where: { policy_id: { in: policies.map((p) => p.id) } } });
  await prisma.policy.deleteMany({ where: { id: { in: policies.map((p) => p.id) } } });
  await prisma.posting.deleteMany({ where: { id: { in: postings.map((p) => p.id) } } });
  console.log('Removed test posting(s), policy(ies) (global + linked), their acceptances and applications.');
  console.log('NOTE: the student keeps the interest registration this script added.');
  console.log('⚠ Removing the GLOBAL policy leaves this tenant with none again, so Apply goes back to being');
  console.log('  disabled with "Accept the placement policy before applying" — expected, not a regression.');
}

async function main() {
  const apply = process.argv.includes('--apply');
  if (process.argv.includes('--remove')) return remove(apply);

  const nameFragment = arg('student', 'Aditi');
  const student = await prisma.student.findFirst({
    where: { full_name: { contains: nameFragment, mode: 'insensitive' } },
    include: { academic_profile: true, user: { select: { email: true } } },
  });
  if (!student) return console.log(`No student matching "${nameFragment}".`);

  const master = await prisma.masterOption.findFirst({
    where: { tenant_id: student.tenant_id, category: 'posting_type', value: POSTING_TYPE_VALUE },
  });
  if (!master) return console.log(`Posting type "${POSTING_TYPE_VALUE}" not found.`);

  const company = await prisma.company.findFirst({ where: { tenant_id: student.tenant_id }, select: { id: true, name: true } });
  if (!company) return console.log('No company exists to attach a posting to.');

  const offers = await prisma.offer.findMany({ where: { student_id: student.id }, select: { id: true, role: true, status: true } });
  const dummyOffers = offers.filter((offer) => offer.role.startsWith('[DUMMY]'));
  const realOffers = offers.filter((offer) => !offer.role.startsWith('[DUMMY]'));
  const interests = await prisma.interestRegistration.findMany({ where: { student_id: student.id }, select: { interest_type: true } });
  const hasInterest = interests.some((i) => i.interest_type.trim().toLowerCase() === POSTING_TYPE_VALUE.toLowerCase());
  const backlogs = student.academic_profile?.backlog_count ?? 0;

  console.log(`STUDENT  ${student.full_name} <${student.user?.email}>  ${student.enrollment_number}`);
  console.log(`         ${student.institute} / ${student.course} / ${student.department} / batch ${student.batch}`);
  console.log(`         cgpa=${student.academic_profile?.cgpa ?? 'NULL'} backlog_count=${backlogs} verification=${student.verification_status}\n`);
  const globalPolicyCount = await prisma.policy.count({
    where: { tenant_id: student.tenant_id, posting_type_master_id: null },
  });

  console.log('BLOCKERS ON THE APPLY PATH:');
  console.log(`  offer block      : ${offers.length === 0 ? 'clear' : `${offers.length} offer(s) BLOCK apply (${dummyOffers.length} dummy, ${realOffers.length} real)`}`);
  console.log(
    `  global policy    : ${globalPolicyCount} in tenant${
      globalPolicyCount === 0
        ? ' — areAllVisiblePoliciesAccepted returns false with none, so getMyProfile forces\n                     policy_accepted=false on every load and Apply stays disabled'
        : ' (clear once accepted at the policy gate)'
    }`,
  );
  console.log(`  policy_accepted  : ${student.policy_accepted ? 'true' : 'false'} (recomputed by getMyProfile on every profile load — not authoritative here)`);
  console.log(`  placement opt-out: ${student.placement_opt_out ? 'OPTED OUT — blocks' : 'clear'}`);
  console.log(`  interest in type : ${hasInterest ? 'registered (clear)' : `NOT registered — blocks apply AND hides the posting`}`);

  if (realOffers.length > 0) {
    console.log('\n⚠ This student has a REAL (non-dummy) offer. Any offer permanently blocks applying.');
    console.log('  This script will NOT delete real offers — pick another student or remove it deliberately.');
    return;
  }

  console.log('\nWILL DO:');
  console.log(`  1. delete ${dummyOffers.length} dummy offer(s) (clears the permanent offer block)`);
  console.log(`  2. create GLOBAL policy "${GLOBAL_POLICY_TITLE}" — the student accepts this once at`);
  console.log(`     /student/policy-gate, which is what flips policy_accepted to true`);
  console.log(`  3. register interest in "${POSTING_TYPE_VALUE}"${hasInterest ? ' (already present, skip)' : ''}`);
  console.log(`  4. create policy "${POLICY_TITLE}" linked to "${POSTING_TYPE_VALUE}" (the gate under test)`);
  console.log(`  5. create published posting "${POSTING_TITLE}" at ${company.name} (min_cgpa 0, max_backlogs 99, no branch/batch limits)`);
  console.log(`  NOT done: accepting either policy — that is what you are testing.`);
  console.log(`  ⚠ The global policy applies tenant-wide: every student will be asked to accept it at next login.`);

  if (!apply) return console.log('\nDry-run. Re-run with --apply.');

  if (dummyOffers.length > 0) {
    await prisma.offer.deleteMany({ where: { id: { in: dummyOffers.map((o) => o.id) } } });
  }

  // NOTE: policy_accepted is deliberately NOT written here. getMyProfile recomputes it from
  // areAllVisiblePoliciesAccepted on every profile load and overwrites the column, so setting it is a
  // misleading no-op. The student accepts the global policy below through the real policy gate, which
  // is also what makes policy_accepted_at realistic (see the header note).

  // InterestRegistration is just (student_id, interest_type) + registered_at — no academic_year.
  // Upsert on the @@unique([student_id, interest_type]) so re-running is safe.
  await prisma.interestRegistration.upsert({
    where: { student_id_interest_type: { student_id: student.id, interest_type: master.value } },
    create: { student_id: student.id, interest_type: master.value },
    update: {},
  });

  const policyData = {
    tenant_id: student.tenant_id,
    title: POLICY_TITLE,
    category: 'placement_policy',
    description: 'Fixture policy for testing the program-specific policy gate.',
    content:
      '<h3>Program Specific Policy</h3><p>This is a test policy for the <strong>Test Placement</strong> programme. Accepting it should be required before applying.</p><ul><li>Rule one.</li><li>Rule two.</li></ul>',
    version: '1.0',
    effective_date: new Date(),
    posting_type_master_id: master.id,
  };

  const existingPolicy = await prisma.policy.findFirst({
    where: { tenant_id: student.tenant_id, title: POLICY_TITLE },
    select: { id: true },
  });
  const policy = existingPolicy
    ? await prisma.policy.update({ where: { id: existingPolicy.id }, data: policyData })
    : await prisma.policy.create({ data: policyData });

  // A GLOBAL policy (posting_type_master_id: null) — without at least one, areAllVisiblePoliciesAccepted
  // returns false, getMyProfile forces student.policy_accepted = false on every load, and Apply is
  // disabled with "Accept the placement policy before applying" even though nothing is pending.
  const globalPolicyData = {
    tenant_id: student.tenant_id,
    title: GLOBAL_POLICY_TITLE,
    category: 'placement_policy',
    description: 'Fixture global placement policy — accepted once at the student policy gate.',
    content:
      '<h3>Placement Policy</h3><p>General placement policy for all students. Accept once to unlock applications.</p><ul><li>Attend every drive you register for.</li><li>Inform the TPO cell of any offer received.</li></ul>',
    version: '1.0',
    effective_date: new Date(),
    posting_type_master_id: null,
  };

  const existingGlobalPolicy = await prisma.policy.findFirst({
    where: { tenant_id: student.tenant_id, title: GLOBAL_POLICY_TITLE },
    select: { id: true },
  });
  const globalPolicy = existingGlobalPolicy
    ? await prisma.policy.update({ where: { id: existingGlobalPolicy.id }, data: globalPolicyData })
    : await prisma.policy.create({ data: globalPolicyData });

  const existingPosting = await prisma.posting.findFirst({ where: { tenant_id: student.tenant_id, title: POSTING_TITLE }, select: { id: true } });
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 1);
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + 30);

  const postingData = {
    tenant_id: student.tenant_id,
    company_id: company.id,
    title: POSTING_TITLE,
    posting_type_master_id: master.id,
    academic_year: student.batch ?? '2022-26',
    role_name: 'QA Test Engineer',
    location: 'Ahmedabad',
    locations: ['Ahmedabad'],
    work_mode: 'onsite' as const,
    ctc: '6 - 9 LPA',
    role_description: 'Fixture posting used to test the program-specific policy gate.',
    eligible_branches: [],
    eligible_batches: [],
    min_cgpa: 0,
    max_backlogs: 99,
    application_start_date: startDate,
    application_end_date: endDate,
    status: 'published' as const,
    published_at: new Date(),
  };

  const posting = existingPosting
    ? await prisma.posting.update({ where: { id: existingPosting.id }, data: postingData })
    : await prisma.posting.create({ data: postingData });

  console.log('\nDONE.');
  console.log(`  global policy : ${globalPolicy.id}  "${globalPolicy.title}"`);
  console.log(`  linked policy : ${policy.id}  "${policy.title}"`);
  console.log(`  posting       : ${posting.id}  "${posting.title}" [${posting.status}] @ ${company.name}`);
  console.log(`\nNEXT, as ${student.user?.email}:`);
  console.log('  1. Log in — you are routed to the policy gate. Accept the GLOBAL placement policy.');
  console.log('     (This is what sets policy_accepted=true and enables the Apply button.)');
  console.log(`  2. Opportunities -> "${POSTING_TITLE}" -> Apply should now be ENABLED.`);
  console.log('  3. Click Apply -> the PROGRAM-SPECIFIC policy modal must appear before the apply dialog.');
  console.log('     It should appear even though the global acceptance is newer than that policy —');
  console.log('     that timestamp is exactly the condition that used to bypass the gate.');
  console.log(`\nUndo with: tsx scripts/setup-policy-gate-test.ts --remove --apply`);
}

void main()
  .catch((err) => {
    console.error('Script failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
