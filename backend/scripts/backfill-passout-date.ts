/**
 * Backfill Student.pass_out_date from the ERP/CRM (field `passOutDate`) for existing students.
 *
 * New signups already seed `pass_out_date` from the CRM detail (auth.service). This script fills the
 * column for students created before that change, by re-fetching each student's CRM detail by
 * enrollment number. Best-effort per student — a CRM failure or a student with no ERP record is
 * logged and skipped (their pass_out_date stays null, and the No-Dues reports show "—").
 *
 * Usage (from backend/):
 *   npx tsx scripts/backfill-passout-date.ts             # dry-run: report what would change
 *   npx tsx scripts/backfill-passout-date.ts --apply     # write pass_out_date
 *   npx tsx scripts/backfill-passout-date.ts --apply --all   # also refresh students that already have a value
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
  console.log(`Backfill pass_out_date — ${APPLY ? 'APPLY (writing)' : 'DRY-RUN (no writes)'}${ALL ? ' [refresh all]' : ''}`);

  const students = await prisma.student.findMany({
    where: {
      enrollment_number: { not: '' },
      ...(ALL ? {} : { pass_out_date: null }),
    },
    select: { id: true, enrollment_number: true, full_name: true, pass_out_date: true },
  });
  console.log(`Candidates: ${students.length}`);

  let filled = 0;
  let missing = 0;
  let failed = 0;

  for (const student of students) {
    let passOutDate: string | null = null;
    try {
      const crm = await fetchStudentFromCrm(student.enrollment_number);
      passOutDate = clean(crm.passOutDate);
    } catch (err) {
      failed += 1;
      console.log(`  ! ${student.enrollment_number} (${student.full_name}) — CRM lookup failed: ${(err as Error).message}`);
      continue;
    }

    if (!passOutDate) {
      missing += 1;
      console.log(`  · ${student.enrollment_number} (${student.full_name}) — no passOutDate from ERP`);
      continue;
    }

    console.log(`  + ${student.enrollment_number} (${student.full_name}) — ${student.pass_out_date ?? '(null)'} -> ${passOutDate}`);
    filled += 1;
    if (APPLY) {
      await prisma.student.update({ where: { id: student.id }, data: { pass_out_date: passOutDate } });
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
