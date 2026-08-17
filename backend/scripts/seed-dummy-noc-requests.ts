/**
 * Seed dummy NOC requests across the full lifecycle for a single student
 * (default: "Aditi Mehta") so every TPO Admin NOC tab has something to show:
 *   - Pending by Faculty, Pending TPO, Approved, Rejected, Issued, All Requests.
 *
 * Every row is tagged with the sentinel token in `reference_details`, which is how
 * --remove finds them again — no real NOC state is touched. Issued rows also carry a
 * `DUMMY-REQ-` noc_number.
 *
 * Companion to seed-dummy-completion-certs.ts (which only creates ISSUED NOCs for the
 * completion-certificate demo).
 *
 * Usage (from docs/silveroak_backend):
 *   tsx scripts/seed-dummy-noc-requests.ts                    # dry-run: show what would be created
 *   tsx scripts/seed-dummy-noc-requests.ts --apply           # create the dummy NOCs
 *   tsx scripts/seed-dummy-noc-requests.ts --apply --student="Aditi Mehta"
 *   tsx scripts/seed-dummy-noc-requests.ts --remove --apply   # delete every dummy request again
 */

import 'dotenv/config';
import { prisma } from '../src/config/database';

/** Sentinel dropped into reference_details on every seeded row → how --remove finds them again. */
const SEED_TOKEN = '[DUMMY-NOC-SEED]';
/** Prefix for the unique noc_number on issued dummy rows. */
const DUMMY_PREFIX = 'DUMMY-REQ-';

function parseStudentName(fallback: string) {
  const arg = process.argv.find((value) => value.startsWith('--student='));
  if (!arg) return fallback;
  const value = arg.split('=').slice(1).join('=').replace(/^["']|["']$/g, '').trim();
  return value || fallback;
}

async function removeDummyNocs(apply: boolean) {
  const existing = await prisma.nocRequest.findMany({
    where: { reference_details: { contains: SEED_TOKEN } },
    select: {
      id: true,
      noc_number: true,
      status: true,
      company_name: true,
      student: { select: { full_name: true } },
    },
  });

  console.log(`Found ${existing.length} dummy NOC request(s).`);
  for (const noc of existing) {
    console.log(`  - ${noc.status} | ${noc.student?.full_name ?? '?'} | ${noc.company_name} | ${noc.noc_number ?? '(no number)'}`);
  }

  if (!apply) {
    console.log('\nDry-run only. Re-run with --remove --apply to delete them.');
    return;
  }
  if (existing.length === 0) return;

  const result = await prisma.nocRequest.deleteMany({ where: { reference_details: { contains: SEED_TOKEN } } });
  console.log(`\nDeleted ${result.count} dummy NOC request(s).`);
}

async function seedDummyNocs(apply: boolean, studentName: string) {
  const student =
    (await prisma.student.findFirst({
      where: { full_name: { equals: studentName, mode: 'insensitive' } },
      select: { id: true, tenant_id: true, full_name: true, enrollment_number: true },
    })) ??
    (await prisma.student.findFirst({
      where: { full_name: { contains: studentName, mode: 'insensitive' } },
      select: { id: true, tenant_id: true, full_name: true, enrollment_number: true },
    }));

  if (!student) {
    console.log(`No student matching "${studentName}" found. Pass --student="First Last".`);
    return;
  }

  const tenantId = student.tenant_id;
  console.log(`Student: ${student.full_name} (${student.enrollment_number ?? 'no-enrollment'})  tenant=${tenantId}`);

  // A valid posting-type value for `program` so the type labels render.
  const postingType = await prisma.masterOption.findFirst({
    where: { tenant_id: tenantId, category: 'posting_type', is_active: true },
    select: { value: true },
    orderBy: { created_at: 'asc' },
  });
  const program = postingType?.value ?? 'internship';

  // Reuse an existing uploaded PDF path so the "View" links actually open something; else a placeholder.
  const withFile = await prisma.nocRequest.findFirst({
    where: {
      tenant_id: tenantId,
      OR: [{ offer_letter_url: { not: null } }, { certificate_url: { not: null } }, { supporting_document_url: { not: null } }],
    },
    select: { offer_letter_url: true, certificate_url: true, supporting_document_url: true },
  });
  const sampleFile =
    withFile?.offer_letter_url ??
    withFile?.certificate_url ??
    withFile?.supporting_document_url ??
    '/uploads/noc-offer-letters/sample-offer-letter.pdf';

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  const base = {
    tenant_id: tenantId,
    student_id: student.id,
    noc_type: 'internship' as const,
    internship_type: 'internship',
    program,
    placement_source: 'self_sourced' as const,
    company_state: 'Gujarat',
    company_city: 'Ahmedabad',
    contact_person_name: 'Ramesh Iyer',
    contact_person_designation: 'HR Manager',
    contact_person_email: 'hr@example.com',
    contact_person_phone: '9876543210',
    technology_domain: 'Full Stack Development',
    stipend_amount: 15000,
    offer_letter_url: sampleFile,
    start_date: daysAgo(30),
    end_date: daysAgo(-60), // ~2 months out
    reference_details: `${SEED_TOKEN} demo data`,
  };

  // One row per lifecycle status so every TPO NOC tab is populated.
  const rows = [
    {
      ...base,
      company_name: 'Zomato',
      role_title: 'Frontend Developer Intern',
      status: 'pending_faculty' as const,
    },
    {
      ...base,
      company_name: 'Swiggy',
      role_title: 'Android Developer Intern',
      status: 'pending_faculty' as const,
    },
    {
      ...base,
      company_name: 'Flipkart',
      role_title: 'Backend Developer Intern',
      status: 'pending_tpo' as const,
      faculty_approved_at: daysAgo(4),
      faculty_remarks: 'Verified with the student. Forwarding to TPO.',
    },
    {
      ...base,
      company_name: 'Amazon',
      role_title: 'SDE Intern',
      status: 'approved' as const,
      faculty_approved_at: daysAgo(8),
      faculty_remarks: 'Approved at department level.',
      tpo_approved_at: daysAgo(5),
      tpo_remarks: 'Approved. Certificate can be issued.',
    },
    {
      ...base,
      company_name: 'Paytm',
      role_title: 'Data Analyst Intern',
      status: 'rejected' as const,
      rejected_at: daysAgo(2),
      rejection_reason: 'Company offer letter could not be verified. Please resubmit with a valid letter.',
    },
    {
      ...base,
      company_name: 'Google',
      role_title: 'Machine Learning Intern',
      status: 'issued' as const,
      noc_number: `${DUMMY_PREFIX}001`,
      faculty_approved_at: daysAgo(15),
      tpo_approved_at: daysAgo(12),
      issued_at: daysAgo(11),
      certificate_url: sampleFile,
    },
  ];

  console.log(`\nProgram (posting type): ${program}`);
  console.log(`Sample file for links:   ${sampleFile}`);
  console.log(`\nWould create ${rows.length} dummy NOC request(s):`);
  for (const row of rows) {
    console.log(`  - ${row.status.padEnd(16)} | ${row.company_name} | ${row.role_title}`);
  }

  if (!apply) {
    console.log('\nDry-run only. Re-run with --apply to insert.');
    return;
  }

  // Remove any prior seed rows first so re-running --apply refreshes rather than duplicates
  // (non-issued rows have no unique key to upsert on).
  await prisma.nocRequest.deleteMany({ where: { student_id: student.id, reference_details: { contains: SEED_TOKEN } } });

  const result = await prisma.nocRequest.createMany({ data: rows });
  console.log(`\nCreated ${result.count} dummy NOC request(s) for ${student.full_name}.`);
  console.log(`Remove them later with: tsx scripts/seed-dummy-noc-requests.ts --remove --apply`);
}

async function main() {
  const apply = process.argv.includes('--apply');
  const remove = process.argv.includes('--remove');

  if (remove) {
    await removeDummyNocs(apply);
    return;
  }

  await seedDummyNocs(apply, parseStudentName('Aditi Mehta'));
}

void main()
  .catch((err) => {
    console.error('Script failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
