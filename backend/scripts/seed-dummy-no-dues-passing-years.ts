/**
 * Seed ONE dummy No Dues request for a representative student in EACH distinct Student.batch,
 * so the TPO Admin → No Dues Management "Passing Year" filter shows several different values.
 *
 * The filter (getNoDuesPassingYears) lists DISTINCT `Student.batch` among students who have a
 * No Dues request — so to see multiple passing years you need requests spread across students
 * of different batches. This script does exactly that (picks the first student per batch that
 * doesn't already have a seeded dummy row).
 *
 * Every row is tagged with the sentinel token in `admin_remarks`, which is how --remove finds
 * them again — no real No Dues state is touched.
 *
 * Usage (from backend/):
 *   tsx scripts/seed-dummy-no-dues-passing-years.ts                 # dry-run: show what would be created
 *   tsx scripts/seed-dummy-no-dues-passing-years.ts --apply         # create the dummy NDCs (one per batch)
 *   tsx scripts/seed-dummy-no-dues-passing-years.ts --remove --apply  # delete every dummy NDC this script made
 */

import 'dotenv/config';
import { prisma } from '../src/config/database';

/** Sentinel dropped into admin_remarks on every seeded row → how --remove finds them again. */
const SEED_TOKEN = '[DUMMY-NDC-PASSING-YEAR-SEED]';

async function removeDummy(apply: boolean) {
  const existing = await prisma.noDuesRequest.findMany({
    where: { admin_remarks: { contains: SEED_TOKEN } },
    select: { id: true, status: true, student: { select: { full_name: true, batch: true } } },
  });

  console.log(`Found ${existing.length} dummy No Dues request(s).`);
  for (const r of existing) {
    console.log(`  - ${r.status} | ${r.student?.batch ?? '(no batch)'} | ${r.student?.full_name ?? '?'}`);
  }
  if (!apply) {
    console.log('\nDry-run only. Re-run with --remove --apply to delete them.');
    return;
  }
  if (existing.length === 0) return;
  const result = await prisma.noDuesRequest.deleteMany({ where: { admin_remarks: { contains: SEED_TOKEN } } });
  console.log(`\nDeleted ${result.count} dummy No Dues request(s).`);
}

async function seed(apply: boolean) {
  // All students, so we can pick one per distinct batch (null batches skipped below).
  const allStudents = await prisma.student.findMany({
    select: { id: true, tenant_id: true, full_name: true, batch: true },
    orderBy: { batch: 'asc' },
  });
  const students = allStudents.filter((s) => Boolean(s.batch && s.batch.trim()));

  // First student per distinct batch.
  const perBatch = new Map<string, (typeof students)[number]>();
  for (const s of students) {
    const batch = s.batch!.trim();
    if (batch && !perBatch.has(batch)) perBatch.set(batch, s);
  }

  if (perBatch.size === 0) {
    console.log('No students with a batch found — nothing to seed.');
    return;
  }

  // Reuse an existing uploaded PDF so the "View" link opens something; else a placeholder path.
  const anyTenant = students[0].tenant_id;
  const withFile = await prisma.nocRequest.findFirst({
    where: { tenant_id: anyTenant, OR: [{ offer_letter_url: { not: null } }, { certificate_url: { not: null } }] },
    select: { offer_letter_url: true, certificate_url: true },
  });
  const sampleFile = withFile?.offer_letter_url ?? withFile?.certificate_url ?? '/uploads/no-dues-proofs/sample-proof.pdf';

  const rows = [...perBatch.values()].map((s, i) => ({
    tenant_id: s.tenant_id,
    student_id: s.id,
    sou_passing_year: s.batch!.trim(),
    exit_reason: 'employment' as const,
    status: 'pending_review' as const,
    company_name: `Dummy Corp ${i + 1}`,
    designation: 'Software Engineer',
    package_lpa: 6,
    company_sector: 'Information Technology',
    company_address: 'Ahmedabad, Gujarat',
    proof_url: sampleFile,
    declaration_accepted: true,
    admin_remarks: SEED_TOKEN,
  }));

  console.log(`Sample file for links: ${sampleFile}`);
  console.log(`\nWould create ${rows.length} dummy No Dues request(s) — one per distinct batch:`);
  for (const r of rows) {
    const name = [...perBatch.values()].find((s) => s.id === r.student_id)?.full_name ?? '?';
    console.log(`  - batch ${r.sou_passing_year.padEnd(10)} | ${name}`);
  }

  if (!apply) {
    console.log('\nDry-run only. Re-run with --apply to insert.');
    return;
  }

  // Refresh rather than duplicate: drop any prior seed rows from this script first.
  await prisma.noDuesRequest.deleteMany({ where: { admin_remarks: { contains: SEED_TOKEN } } });
  const result = await prisma.noDuesRequest.createMany({ data: rows });
  console.log(`\nCreated ${result.count} dummy No Dues request(s) across ${perBatch.size} batches.`);
  console.log(`Remove them later with: tsx scripts/seed-dummy-no-dues-passing-years.ts --remove --apply`);
}

async function main() {
  const apply = process.argv.includes('--apply');
  const remove = process.argv.includes('--remove');
  if (remove) return removeDummy(apply);
  return seed(apply);
}

void main()
  .catch((err) => {
    console.error('Script failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
