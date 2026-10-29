/**
 * Backfill students' CGPA (and SPI/CPI/CGPA columns) from the ERP/CRM.
 *
 * The CRM renamed its score fields (currentSemesterSPI/CPI/CGPA → spi/cpi/cgpa). Signup only read the old
 * names, so every student created since then got academic_profile.cgpa = 0 — shown as CGPA 0 in TPO Admin →
 * Students and failing every CGPA eligibility rule. Signup is fixed (auth.service `crmScores`/`crmCgpa`);
 * this script repairs existing students by re-fetching each one's CRM detail by enrollment number.
 *
 * CGPA = CRM `cgpa`, else `cpi` (SOU's cumulative index). Best-effort per student — a CRM failure or a
 * student with no published score is logged and skipped.
 *
 * Usage (from backend/):
 *   npx tsx scripts/backfill-student-cgpa-from-crm.ts               # dry-run: report what would change
 *   npx tsx scripts/backfill-student-cgpa-from-crm.ts --apply       # write students whose CGPA is 0 / missing
 *   npx tsx scripts/backfill-student-cgpa-from-crm.ts --apply --all # refresh every student (e.g. new results)
 */

import 'dotenv/config';
import { prisma } from '../src/config/database';
import { crmCgpa, crmScores, fetchStudentFromCrm } from '../src/modules/auth/auth.service';

const APPLY = process.argv.includes('--apply');
const ALL = process.argv.includes('--all');

const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));

async function main() {
  console.log(`Backfill CGPA from CRM — ${APPLY ? 'APPLY (writing)' : 'DRY-RUN (no writes)'}${ALL ? ' [refresh all]' : ''}`);

  const students = await prisma.student.findMany({
    where: { enrollment_number: { not: '' } },
    select: {
      id: true,
      enrollment_number: true,
      full_name: true,
      current_semester_spi: true,
      current_semester_cpi: true,
      current_semester_cgpa: true,
      academic_profile: { select: { id: true, cgpa: true } },
    },
    orderBy: { enrollment_number: 'asc' },
  });
  const candidates = ALL ? students : students.filter((s) => !num(s.academic_profile?.cgpa));
  console.log(`Students: ${students.length} · candidates: ${candidates.length}`);

  let updated = 0;
  let noScore = 0;
  let failed = 0;
  let unchanged = 0;

  for (const s of candidates) {
    let scores: ReturnType<typeof crmScores>;
    let cgpa: number | null;
    try {
      const crm = await fetchStudentFromCrm(s.enrollment_number);
      scores = crmScores(crm);
      cgpa = crmCgpa(crm);
    } catch (err) {
      failed += 1;
      console.log(`  ! ${s.enrollment_number} (${s.full_name}) — CRM lookup failed: ${(err as Error).message}`);
      continue;
    }
    if (cgpa === null) {
      noScore += 1;
      console.log(`  · ${s.enrollment_number} (${s.full_name}) — no CGPA/CPI published in CRM`);
      continue;
    }

    const before = num(s.academic_profile?.cgpa);
    const sameScores =
      num(s.current_semester_spi) === scores.spi && num(s.current_semester_cpi) === scores.cpi && num(s.current_semester_cgpa) === scores.cgpa;
    if (before === cgpa && sameScores) {
      unchanged += 1;
      continue;
    }

    console.log(`  + ${s.enrollment_number} (${s.full_name}) — CGPA ${before ?? '(none)'} -> ${cgpa}  [spi ${scores.spi ?? '-'} · cpi ${scores.cpi ?? '-'} · cgpa ${scores.cgpa ?? '-'}]`);
    updated += 1;
    if (APPLY) {
      await prisma.$transaction([
        prisma.student.update({
          where: { id: s.id },
          data: { current_semester_spi: scores.spi, current_semester_cpi: scores.cpi, current_semester_cgpa: scores.cgpa },
        }),
        s.academic_profile
          ? prisma.academicProfile.update({ where: { id: s.academic_profile.id }, data: { cgpa } })
          : prisma.academicProfile.create({ data: { student_id: s.id, cgpa } }),
      ]);
    }
  }

  console.log(`\nSummary: ${updated} to update, ${unchanged} already correct, ${noScore} no CRM score, ${failed} CRM failures.`);
  if (!APPLY) console.log('Dry-run only. Re-run with --apply to write.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
