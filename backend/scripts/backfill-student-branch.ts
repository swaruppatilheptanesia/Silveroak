/**
 * Backfill Student.branch from the ERP/CRM (field `branchName`) for existing students.
 *
 * New signups already seed `branch` from the CRM detail (auth.service `deriveBranch`). This script
 * fills the column for students created before that change, by re-fetching each student's CRM detail
 * by enrollment number. Best-effort per student — a CRM failure or a student with no ERP `branchName`
 * is logged and skipped (their `branch` stays null, so the targeting matcher falls back to course for
 * them until they get a value).
 *
 * Usage (from backend/):
 *   npx tsx scripts/backfill-student-branch.ts             # dry-run: report what would change
 *   npx tsx scripts/backfill-student-branch.ts --apply     # write branch
 *   npx tsx scripts/backfill-student-branch.ts --apply --all   # also refresh students that already have a value
 */

import 'dotenv/config';
import { prisma } from '../src/config/database';
import { fetchStudentFromCrm } from '../src/modules/auth/auth.service';

const APPLY = process.argv.includes('--apply');
const ALL = process.argv.includes('--all');

function clean(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str.length > 0 ? str : null;
}

async function main() {
  console.log(`Backfill branch — ${APPLY ? 'APPLY (writing)' : 'DRY-RUN (no writes)'}${ALL ? ' [refresh all]' : ''}`);

  const students = await prisma.student.findMany({
    where: {
      enrollment_number: { not: '' },
      ...(ALL ? {} : { branch: null }),
    },
    select: { id: true, enrollment_number: true, full_name: true, branch: true },
  });
  console.log(`Candidates: ${students.length}`);

  let filled = 0;
  let missing = 0;
  let failed = 0;

  for (const student of students) {
    let branch: string | null = null;
    try {
      const crm = await fetchStudentFromCrm(student.enrollment_number);
      branch = clean(crm.branchName);
    } catch (err) {
      failed += 1;
      console.log(`  ! ${student.enrollment_number} (${student.full_name}) — CRM lookup failed: ${(err as Error).message}`);
      continue;
    }

    if (!branch) {
      missing += 1;
      console.log(`  · ${student.enrollment_number} (${student.full_name}) — no branchName from ERP`);
      continue;
    }

    if (!ALL && student.branch === branch) {
      // unchanged; nothing to do
      continue;
    }

    console.log(`  + ${student.enrollment_number} (${student.full_name}) — ${student.branch ?? '(null)'} -> ${branch}`);
    filled += 1;
    if (APPLY) {
      await prisma.student.update({ where: { id: student.id }, data: { branch } });
    }
  }

  console.log(`\nSummary: ${filled} to fill, ${missing} no ERP value, ${failed} CRM failures.`);
  if (!APPLY) console.log('Dry-run only. Re-run with --apply to write.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
