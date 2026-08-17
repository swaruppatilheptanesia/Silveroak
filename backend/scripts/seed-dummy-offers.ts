/**
 * Seed dummy Offer records — for exercising the Offer Records list (pagination needs > 20 rows).
 *
 * ⚠ SIDE EFFECT: an offer PERMANENTLY blocks that student from applying to, or registering
 * interest in, ANY posting — `assertNoExistingOffer` (src/shared/utils/offer-block.ts) counts every
 * offer row regardless of status. Students given a dummy offer are locked until you run --remove.
 * For that reason this only targets students who currently have NO offer, so no real offer state is
 * touched, and every row it creates is tagged so it can be removed again.
 *
 * Usage (from docs/silveroak_backend):
 *   tsx scripts/seed-dummy-offers.ts                  # dry-run: show what would be created
 *   tsx scripts/seed-dummy-offers.ts --apply          # create 30 dummy offers
 *   tsx scripts/seed-dummy-offers.ts --apply --count=45
 *   tsx scripts/seed-dummy-offers.ts --remove --apply # delete every dummy offer again
 */

import 'dotenv/config';
import { prisma } from '../src/config/database';

/** Every seeded offer's role starts with this, which is how --remove finds them again. */
const DUMMY_MARKER = '[DUMMY]';

const ROLE_TITLES = [
  'Software Engineer',
  'Data Analyst',
  'QA Engineer',
  'Business Analyst',
  'DevOps Engineer',
  'Frontend Developer',
  'Backend Developer',
  'Product Associate',
];

const LOCATIONS = ['Ahmedabad', 'Pune', 'Bengaluru', 'Hyderabad', 'Mumbai', 'Remote'];

// Spread across statuses so the stat cards and the status filter have something to show.
const STATUSES = ['pending_student_action', 'accepted', 'rejected_by_admin'] as const;

function parseCount(fallback: number) {
  const arg = process.argv.find((value) => value.startsWith('--count='));
  if (!arg) return fallback;
  const parsed = Number.parseInt(arg.split('=')[1] ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

async function removeDummyOffers(apply: boolean) {
  const existing = await prisma.offer.findMany({
    where: { role: { startsWith: DUMMY_MARKER } },
    select: { id: true, role: true, student: { select: { full_name: true, enrollment_number: true } } },
  });

  console.log(`Found ${existing.length} dummy offer(s).`);
  for (const offer of existing.slice(0, 10)) {
    console.log(`  - ${offer.student?.enrollment_number ?? '?'} | ${offer.student?.full_name ?? '?'} | ${offer.role}`);
  }
  if (existing.length > 10) console.log(`  … and ${existing.length - 10} more`);

  if (!apply) {
    console.log('\nDry-run only. Re-run with --remove --apply to delete them.');
    return;
  }
  if (existing.length === 0) return;

  // OfferAudit cascades on offer delete; internships would block, so report instead of failing hard.
  const linkedInternships = await prisma.internship.count({
    where: { offer_id: { in: existing.map((offer) => offer.id) } },
  });
  if (linkedInternships > 0) {
    console.log(`\n⚠ ${linkedInternships} internship(s) reference these offers — delete those first.`);
    return;
  }

  const result = await prisma.offer.deleteMany({ where: { role: { startsWith: DUMMY_MARKER } } });
  console.log(`\nDeleted ${result.count} dummy offer(s). Affected students can apply again.`);
}

async function seedDummyOffers(apply: boolean, count: number) {
  // Postings carry both the company and the tenant, so they anchor everything else.
  const postings = await prisma.posting.findMany({
    where: { status: { in: ['published', 'closed'] } },
    select: {
      id: true,
      title: true,
      tenant_id: true,
      company_id: true,
      company: { select: { name: true } },
      posting_type_master: { select: { value: true } },
    },
    take: 50,
  });

  if (postings.length === 0) {
    console.log('No published/closed postings found — create a posting first (an offer needs one).');
    return;
  }

  const tenantId = postings[0]!.tenant_id;

  // Only students with NO existing offer: adding one locks them out of applying (see header).
  const students = await prisma.student.findMany({
    where: { tenant_id: tenantId, offers: { none: {} } },
    select: { id: true, full_name: true, enrollment_number: true },
    take: count,
    orderBy: { created_at: 'asc' },
  });

  if (students.length === 0) {
    console.log('Every student in this tenant already has an offer — nothing to seed.');
    return;
  }
  if (students.length < count) {
    console.log(`⚠ Only ${students.length} student(s) without an offer available (asked for ${count}).`);
  }

  const rows = students.map((student, index) => {
    const posting = postings[index % postings.length]!;
    const status = STATUSES[index % STATUSES.length]!;
    const typeValue = posting.posting_type_master?.value ?? '';
    const isInternship = typeValue.toLowerCase().includes('intern');

    // Walk offer_date backwards a day at a time so the default sort has a stable, realistic order.
    const offerDate = new Date();
    offerDate.setDate(offerDate.getDate() - index);

    return {
      tenant_id: tenantId,
      student_id: student.id,
      posting_id: posting.id,
      company_id: posting.company_id,
      type: (isInternship ? 'internship' : 'job') as 'internship' | 'job',
      role: `${DUMMY_MARKER} ${ROLE_TITLES[index % ROLE_TITLES.length]}`,
      ctc: isInternship ? null : `${6 + (index % 8)} - ${10 + (index % 8)} LPA`,
      stipend: isInternship ? `${10 + (index % 5)}000 / month` : null,
      location: LOCATIONS[index % LOCATIONS.length]!,
      offer_date: offerDate,
      status,
      accepted_at: status === 'accepted' ? offerDate : null,
      rejected_at: status === 'rejected_by_admin' ? offerDate : null,
      rejection_reason: status === 'rejected_by_admin' ? 'other' : null,
      applications_blocked: status !== 'rejected_by_admin',
    };
  });

  console.log(`Tenant: ${tenantId}`);
  console.log(`Would create ${rows.length} dummy offer(s) across ${postings.length} posting(s).`);
  console.log('Sample (first 5):');
  for (const [index, row] of rows.slice(0, 5).entries()) {
    const student = students[index]!;
    console.log(
      `  - ${student.enrollment_number} | ${student.full_name} | ${row.role} | ${row.status} | ${row.offer_date.toISOString().slice(0, 10)}`,
    );
  }

  if (!apply) {
    console.log('\nDry-run only. Re-run with --apply to insert.');
    console.log('⚠ Each of these students will be blocked from applying until you run --remove --apply.');
    return;
  }

  const result = await prisma.offer.createMany({ data: rows });
  console.log(`\nCreated ${result.count} dummy offer(s).`);
  console.log(`Remove them later with: tsx scripts/seed-dummy-offers.ts --remove --apply`);
}

async function main() {
  const apply = process.argv.includes('--apply');
  const remove = process.argv.includes('--remove');

  if (remove) {
    await removeDummyOffers(apply);
    return;
  }

  await seedDummyOffers(apply, parseCount(30));
}

void main()
  .catch((err) => {
    console.error('Script failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
