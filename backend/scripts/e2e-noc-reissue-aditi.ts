/**
 * E2E demo data for the NOC Re-Issued feature, on student "Aditi Mehta".
 *
 * Creates (idempotent, NON-destructive — never deletes):
 *   A) A standalone ISSUED + ACTIVE NOC  → a valid re-issue TARGET for the wizard dropdown.
 *   B) An ISSUED "original" NOC           → becomes INACTIVE once C supersedes it.
 *   C) A RE-ISSUE of B (pending, ACTIVE)  → shares B's number, carries reason + termination letter.
 *
 * So the tester sees: the Active/Inactive column (B inactive, C active), re-issue details on C,
 * and can still raise a fresh re-issue against A from the UI.
 *
 * Dry-run by default (reads only). Pass --apply to write. Re-runs skip if the demo rows already exist.
 *   cd backend && npx tsx scripts/e2e-noc-reissue-aditi.ts            # dry-run
 *   cd backend && npx tsx scripts/e2e-noc-reissue-aditi.ts --apply    # write
 */
import { prisma } from '../src/config/database';

const APPLY = process.argv.includes('--apply');

const NUM_TARGET = 'SOU/TPO/08-2026/RIS/9002'; // A — standalone issued+active
const NUM_GROUP = 'SOU/TPO/08-2026/RIS/9001';  // B (original) + C (re-issue) share this

async function main() {
  const student = await prisma.student.findFirst({
    where: { full_name: { contains: 'Aditi Mehta', mode: 'insensitive' } },
    select: { id: true, tenant_id: true, full_name: true, department: true, course: true, institute: true },
  });

  if (!student) {
    const sample = await prisma.student.findMany({ select: { full_name: true }, take: 10 });
    console.error('❌ No student matching "Aditi Mehta". First students in DB:');
    console.error(sample.map((s) => `   - ${s.full_name}`).join('\n'));
    process.exit(1);
  }
  console.log(`✔ Student: ${student.full_name} (id=${student.id}, tenant=${student.tenant_id})`);

  // Pick up to two real posting-type program values (fallback to a legacy value).
  const masters = await prisma.masterOption.findMany({
    where: { tenant_id: student.tenant_id, category: 'posting_type', is_active: true },
    select: { value: true },
    take: 2,
  });
  const programs = masters.map((m) => m.value);
  const programA = programs[0] ?? 'summer_internship';
  const programB = programs[1] ?? programs[0] ?? 'summer_internship';
  console.log(`✔ Programs: A="${programA}", B/C="${programB}"`);

  const existing = await prisma.nocRequest.findMany({
    where: { student_id: student.id, noc_number: { in: [NUM_TARGET, NUM_GROUP] } },
    select: { id: true, noc_number: true, is_active: true, is_reissue: true, status: true, company_name: true },
    orderBy: { created_at: 'asc' },
  });
  if (existing.length > 0) {
    console.log('ℹ Demo rows already exist for this student (skipping create):');
    existing.forEach((n) =>
      console.log(`   - ${n.noc_number} · ${n.company_name} · ${n.status} · ${n.is_active ? 'ACTIVE' : 'INACTIVE'}${n.is_reissue ? ' · re-issue' : ''}`),
    );
    return;
  }

  const base = {
    tenant_id: student.tenant_id,
    student_id: student.id,
    noc_type: 'internship' as const,
    placement_source: 'self_sourced' as const,
    role_title: 'Software Engineering Intern',
    start_date: new Date('2026-07-01'),
    end_date: new Date('2026-12-31'),
  };

  console.log('\nPlan:');
  console.log(`   A  ${NUM_TARGET}  Bluewave Systems Pvt Ltd   issued/ACTIVE   (re-issue target)`);
  console.log(`   B  ${NUM_GROUP}  Old Horizon Technologies   issued/INACTIVE (superseded by C)`);
  console.log(`   C  ${NUM_GROUP}  New Innovate Labs          pending/ACTIVE  (re-issue of B)`);

  if (!APPLY) {
    console.log('\n(dry-run) Pass --apply to write these rows.');
    return;
  }

  // A — standalone issued + active
  const a = await prisma.nocRequest.create({
    data: {
      ...base,
      program: programA,
      company_name: 'Bluewave Systems Pvt Ltd',
      status: 'issued',
      noc_number: NUM_TARGET,
      issued_at: new Date('2026-07-05'),
      is_active: true,
    },
    select: { id: true, noc_number: true },
  });

  // B — original issued (active for now)
  const b = await prisma.nocRequest.create({
    data: {
      ...base,
      program: programB,
      company_name: 'Old Horizon Technologies',
      status: 'issued',
      noc_number: NUM_GROUP,
      issued_at: new Date('2026-07-06'),
      is_active: true,
    },
    select: { id: true, noc_number: true },
  });

  // C — re-issue of B: supersede the group, then create the active pending re-issue (mirrors the service).
  const c = await prisma.$transaction(async (tx) => {
    await tx.nocRequest.updateMany({
      where: { tenant_id: student.tenant_id, noc_number: NUM_GROUP },
      data: { is_active: false },
    });
    return tx.nocRequest.create({
      data: {
        ...base,
        program: programB,
        company_name: 'New Innovate Labs',
        status: 'pending_faculty',
        noc_number: NUM_GROUP,
        is_active: true,
        is_reissue: true,
        previous_noc_id: b.id,
        reason_for_company_change: 'Left the previous company for a better role and stipend at New Innovate Labs.',
        termination_letter_url: '/uploads/noc-termination-letters/demo-relieving-letter.pdf',
        termination_letter_name: 'relieving-letter.pdf',
      },
      select: { id: true, noc_number: true },
    });
  });

  console.log('\n✅ Applied:');
  console.log(`   A ${a.noc_number}  id=${a.id}  issued/ACTIVE`);
  console.log(`   B ${b.noc_number}  id=${b.id}  issued/INACTIVE (superseded)`);
  console.log(`   C ${c.noc_number}  id=${c.id}  pending/ACTIVE  re-issue of B`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
