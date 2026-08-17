/**
 * Backfill: any AcademicProfile.cgpa that is NULL becomes 0.
 * Aligns historical data with the new project rule: NULL CGPA = 0.
 *
 * Usage:
 *   tsx scripts/backfill-cgpa-zero.ts            # dry-run (default)
 *   tsx scripts/backfill-cgpa-zero.ts --apply    # actually update
 */

import 'dotenv/config';
import { prisma } from '../src/config/database';

async function main() {
  const apply = process.argv.includes('--apply');

  const nullRows = await prisma.academicProfile.findMany({
    where: { cgpa: null },
    select: { id: true, student_id: true, student: { select: { full_name: true, enrollment_number: true } } },
  });

  console.log(`Found ${nullRows.length} AcademicProfile rows with cgpa = NULL.`);
  if (nullRows.length === 0) {
    console.log('Nothing to backfill.');
    return;
  }

  console.log('Sample (first 10):');
  for (const row of nullRows.slice(0, 10)) {
    console.log(`  - ${row.student?.enrollment_number ?? '(no enrollment)'} | ${row.student?.full_name ?? '(no name)'} | profile ${row.id}`);
  }

  if (!apply) {
    console.log('\nDry-run only. Re-run with --apply to perform the update.');
    return;
  }

  const result = await prisma.academicProfile.updateMany({
    where: { cgpa: null },
    data: { cgpa: 0 },
  });

  console.log(`\nUpdated ${result.count} row(s). cgpa is now 0 wherever it was NULL.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
