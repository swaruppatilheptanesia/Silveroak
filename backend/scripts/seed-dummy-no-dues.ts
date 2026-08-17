/**
 * Seed dummy No Dues Certificate (NDC) requests across the full lifecycle for a single
 * student (default: "Aditi Mehta") so every TPO Admin No Dues tab / status has something
 * to show, and the student's own No Dues page is populated:
 *   - Pending Review, Under Review, Approved, Returned, Rejected, Issued.
 * Covers a spread of exit reasons (employment, higher studies, planning studies,
 * competitive exam, family business) so the per-reason detail cards render.
 *
 * Every row is tagged with the sentinel token in `admin_remarks`, which is how --remove
 * finds them again — no real No Dues state is touched. Issued rows also carry a
 * `DUMMY-NDC-` ndc_number.
 *
 * Usage (from docs/silveroak_backend):
 *   tsx scripts/seed-dummy-no-dues.ts                    # dry-run: show what would be created
 *   tsx scripts/seed-dummy-no-dues.ts --apply           # create the dummy NDCs
 *   tsx scripts/seed-dummy-no-dues.ts --apply --student="Aditi Mehta"
 *   tsx scripts/seed-dummy-no-dues.ts --remove --apply   # delete every dummy NDC again
 */

import 'dotenv/config';
import { prisma } from '../src/config/database';

/** Sentinel dropped into admin_remarks on every seeded row → how --remove finds them again. */
const SEED_TOKEN = '[DUMMY-NDC-SEED]';
/** Prefix for the unique ndc_number on issued dummy rows. */
const DUMMY_PREFIX = 'DUMMY-NDC-';

function parseStudentName(fallback: string) {
  const arg = process.argv.find((value) => value.startsWith('--student='));
  if (!arg) return fallback;
  const value = arg.split('=').slice(1).join('=').replace(/^["']|["']$/g, '').trim();
  return value || fallback;
}

async function removeDummyNoDues(apply: boolean) {
  const existing = await prisma.noDuesRequest.findMany({
    where: { admin_remarks: { contains: SEED_TOKEN } },
    select: {
      id: true,
      ndc_number: true,
      status: true,
      exit_reason: true,
      student: { select: { full_name: true } },
    },
  });

  console.log(`Found ${existing.length} dummy No Dues request(s).`);
  for (const ndc of existing) {
    console.log(`  - ${ndc.status} | ${ndc.student?.full_name ?? '?'} | ${ndc.exit_reason} | ${ndc.ndc_number ?? '(no number)'}`);
  }

  if (!apply) {
    console.log('\nDry-run only. Re-run with --remove --apply to delete them.');
    return;
  }
  if (existing.length === 0) return;

  const result = await prisma.noDuesRequest.deleteMany({ where: { admin_remarks: { contains: SEED_TOKEN } } });
  console.log(`\nDeleted ${result.count} dummy No Dues request(s).`);
}

async function seedDummyNoDues(apply: boolean, studentName: string) {
  const student =
    (await prisma.student.findFirst({
      where: { full_name: { equals: studentName, mode: 'insensitive' } },
      select: { id: true, tenant_id: true, full_name: true, enrollment_number: true, batch: true },
    })) ??
    (await prisma.student.findFirst({
      where: { full_name: { contains: studentName, mode: 'insensitive' } },
      select: { id: true, tenant_id: true, full_name: true, enrollment_number: true, batch: true },
    }));

  if (!student) {
    console.log(`No student matching "${studentName}" found. Pass --student="First Last".`);
    return;
  }

  const tenantId = student.tenant_id;
  console.log(`Student: ${student.full_name} (${student.enrollment_number ?? 'no-enrollment'})  tenant=${tenantId}`);

  // Reuse an existing uploaded PDF path so the "View" links actually open something; else a placeholder.
  const withFile = await prisma.nocRequest.findFirst({
    where: { tenant_id: tenantId, OR: [{ offer_letter_url: { not: null } }, { certificate_url: { not: null } }] },
    select: { offer_letter_url: true, certificate_url: true },
  });
  const sampleFile = withFile?.offer_letter_url ?? withFile?.certificate_url ?? '/uploads/no-dues-proofs/sample-proof.pdf';

  const passingYear = student.batch ?? '2026';
  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  const base = {
    tenant_id: tenantId,
    student_id: student.id,
    sou_passing_year: passingYear,
    proof_url: sampleFile,
    declaration_accepted: true,
    admin_remarks: SEED_TOKEN,
  };

  // One row per status, spread across exit reasons so the per-reason detail cards render.
  const rows = [
    {
      ...base,
      exit_reason: 'employment' as const,
      status: 'pending_review' as const,
      company_name: 'Infosys Ltd',
      designation: 'Software Engineer',
      package_lpa: 6.5,
      joining_date: daysAgo(-30),
      company_sector: 'Information Technology',
      company_address: 'Electronics City, Bengaluru, Karnataka',
    },
    {
      ...base,
      exit_reason: 'higher_studies' as const,
      status: 'under_review' as const,
      institution_name: 'IIM Ahmedabad',
      program_name: 'MBA',
      country: 'India',
      university_address: 'Vastrapur, Ahmedabad, Gujarat',
    },
    {
      ...base,
      exit_reason: 'planning_studies' as const,
      status: 'approved' as const,
      institution_name: 'University of Toronto',
      program_name: 'MS in Computer Science',
      country: 'Canada',
      language_test: 'IELTS - 7.5',
      university_address: '27 King’s College Cir, Toronto, ON, Canada',
      reviewed_at: daysAgo(4),
    },
    {
      ...base,
      exit_reason: 'competitive_exam' as const,
      status: 'rejected' as const,
      examination_name: 'UPSC Civil Services',
      additional_details: 'Preparing full-time for the 2026 attempt.',
      admin_remarks: `${SEED_TOKEN} Proof document is not clearly legible. Please resubmit.`,
      reviewed_at: daysAgo(3),
    },
    {
      ...base,
      exit_reason: 'family_business' as const,
      status: 'returned' as const,
      business_name: 'Mehta Textiles',
      business_nature: 'Wholesale textile trading',
      business_address: 'Ring Road, Surat, Gujarat',
      admin_remarks: `${SEED_TOKEN} Please attach the business registration proof and resubmit.`,
      reviewed_at: daysAgo(2),
    },
    {
      ...base,
      exit_reason: 'employment' as const,
      status: 'issued' as const,
      company_name: 'Tata Consultancy Services',
      designation: 'Systems Engineer',
      package_lpa: 7.0,
      joining_date: daysAgo(-45),
      company_sector: 'Information Technology',
      company_address: 'Gandhinagar, Gujarat',
      ndc_number: `${DUMMY_PREFIX}001`,
      reviewed_at: daysAgo(9),
      issued_at: daysAgo(8),
      certificate_url: sampleFile,
    },
  ];

  console.log(`\nSample file for links: ${sampleFile}`);
  console.log(`Passing year:          ${passingYear}`);
  console.log(`\nWould create ${rows.length} dummy No Dues request(s):`);
  for (const row of rows) {
    console.log(`  - ${row.status.padEnd(16)} | ${row.exit_reason}`);
  }

  if (!apply) {
    console.log('\nDry-run only. Re-run with --apply to insert.');
    return;
  }

  // Remove any prior seed rows first so re-running --apply refreshes rather than duplicates.
  await prisma.noDuesRequest.deleteMany({ where: { student_id: student.id, admin_remarks: { contains: SEED_TOKEN } } });

  const result = await prisma.noDuesRequest.createMany({ data: rows });
  console.log(`\nCreated ${result.count} dummy No Dues request(s) for ${student.full_name}.`);
  console.log(`Remove them later with: tsx scripts/seed-dummy-no-dues.ts --remove --apply`);
}

async function main() {
  const apply = process.argv.includes('--apply');
  const remove = process.argv.includes('--remove');

  if (remove) {
    await removeDummyNoDues(apply);
    return;
  }

  await seedDummyNoDues(apply, parseStudentName('Aditi Mehta'));
}

void main()
  .catch((err) => {
    console.error('Script failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
