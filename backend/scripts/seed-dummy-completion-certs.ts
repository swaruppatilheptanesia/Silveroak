/**
 * Seed dummy NOC + Internship Completion Certificate records for a single student
 * (default: "Aditi Mehta") so the TPO Admin NOC screens can be demoed end to end:
 *   - the "Completion Certificates" tab (a PENDING submission awaiting review),
 *   - the "Issued" tab consolidation (Offer Letter / NOC Certificate / Completion links + status),
 *   - and the student's "Completed" tab (an issued NOC still DUE for upload).
 *
 * Everything it creates is an ISSUED NocRequest with a `DUMMY-` noc_number prefix, which is how
 * --remove finds them again — no real NOC state is touched.
 *
 * Usage (from docs/silveroak_backend):
 *   tsx scripts/seed-dummy-completion-certs.ts                    # dry-run: show what would be created
 *   tsx scripts/seed-dummy-completion-certs.ts --apply           # create the dummy NOCs
 *   tsx scripts/seed-dummy-completion-certs.ts --apply --student="Aditi Mehta"
 *   tsx scripts/seed-dummy-completion-certs.ts --remove --apply   # delete every DUMMY- NOC again
 */

import 'dotenv/config';
import { prisma } from '../src/config/database';

/** Every seeded NOC's noc_number starts with this, which is how --remove finds them again. */
const DUMMY_PREFIX = 'DUMMY-';

function parseStudentName(fallback: string) {
  const arg = process.argv.find((value) => value.startsWith('--student='));
  if (!arg) return fallback;
  const value = arg.split('=').slice(1).join('=').replace(/^["']|["']$/g, '').trim();
  return value || fallback;
}

async function removeDummyNocs(apply: boolean) {
  const existing = await prisma.nocRequest.findMany({
    where: { noc_number: { startsWith: DUMMY_PREFIX } },
    select: {
      id: true,
      noc_number: true,
      company_name: true,
      completion_status: true,
      student: { select: { full_name: true } },
    },
  });

  console.log(`Found ${existing.length} dummy NOC(s).`);
  for (const noc of existing) {
    console.log(
      `  - ${noc.noc_number} | ${noc.student?.full_name ?? '?'} | ${noc.company_name} | completion=${noc.completion_status ?? 'not-submitted'}`,
    );
  }

  if (!apply) {
    console.log('\nDry-run only. Re-run with --remove --apply to delete them.');
    return;
  }
  if (existing.length === 0) return;

  const result = await prisma.nocRequest.deleteMany({ where: { noc_number: { startsWith: DUMMY_PREFIX } } });
  console.log(`\nDeleted ${result.count} dummy NOC(s).`);
}

async function seedDummyNocs(apply: boolean, studentName: string) {
  // Match the student by name (case-insensitive). Prefer an exact full-name match, else contains.
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
    withFile?.certificate_url ??
    withFile?.offer_letter_url ??
    withFile?.supporting_document_url ??
    '/uploads/noc-completion-certificates/sample-completion-certificate.pdf';

  const now = new Date();
  const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

  // Four issued NOCs, one per completion state, so every surface has something to show.
  const base = {
    tenant_id: tenantId,
    student_id: student.id,
    noc_type: 'internship' as const,
    internship_type: 'internship' as const,
    program,
    placement_source: 'self_sourced' as const,
    status: 'issued' as const,
    start_date: daysAgo(120),
    end_date: daysAgo(20), // ended → completion is due
    issued_at: daysAgo(110),
    certificate_url: sampleFile,
    offer_letter_url: sampleFile,
    contact_person_name: 'Ramesh Iyer',
    contact_person_designation: 'HR Manager',
    contact_person_email: 'hr@example.com',
    company_city: 'Ahmedabad',
    company_state: 'Gujarat',
  };

  const rows = [
    {
      ...base,
      noc_number: `${DUMMY_PREFIX}001`,
      company_name: 'Infosys Ltd',
      role_title: 'Software Engineering Intern',
      // PENDING — awaiting TPO review → shows in the "Completion Certificates" tab.
      completion_status: 'pending' as const,
      completion_certificate_url: sampleFile,
      completion_certificate_name: 'Aditi_Mehta_Completion_Certificate.pdf',
      completion_certificate_mime_type: 'application/pdf',
      completion_certificate_size: 245678,
      completion_submitted_at: daysAgo(3),
    },
    {
      ...base,
      noc_number: `${DUMMY_PREFIX}002`,
      company_name: 'Tata Consultancy Services',
      role_title: 'Data Analyst Intern',
      // APPROVED — shows in the Issued tab consolidation with status + approval date.
      completion_status: 'approved' as const,
      completion_certificate_url: sampleFile,
      completion_certificate_name: 'Aditi_Mehta_TCS_Completion.pdf',
      completion_certificate_mime_type: 'application/pdf',
      completion_certificate_size: 198432,
      completion_submitted_at: daysAgo(10),
      completion_reviewed_at: daysAgo(8),
      completion_reviewed_by_name: 'TPO Admin',
      completion_remarks: 'Verified against company records. Approved.',
    },
    {
      ...base,
      noc_number: `${DUMMY_PREFIX}003`,
      company_name: 'Wipro Technologies',
      role_title: 'QA Intern',
      // REJECTED — student can re-upload; remark is shown.
      completion_status: 'rejected' as const,
      completion_certificate_url: sampleFile,
      completion_certificate_name: 'Aditi_Mehta_Wipro_Completion.pdf',
      completion_certificate_mime_type: 'application/pdf',
      completion_certificate_size: 176543,
      completion_submitted_at: daysAgo(6),
      completion_reviewed_at: daysAgo(5),
      completion_reviewed_by_name: 'TPO Admin',
      completion_remarks: 'Certificate is blurry and the company seal is not visible. Please re-upload a clear copy.',
    },
    {
      ...base,
      noc_number: `${DUMMY_PREFIX}004`,
      company_name: 'Accenture',
      role_title: 'Backend Developer Intern',
      // NOT SUBMITTED — end date passed → student sees the "Upload Completion Certificate" button (DUE).
      completion_status: null,
      completion_certificate_url: null,
    },
  ];

  console.log(`\nProgram (posting type): ${program}`);
  console.log(`Sample file for links:   ${sampleFile}`);
  console.log(`\nWould create ${rows.length} dummy issued NOC(s):`);
  for (const row of rows) {
    console.log(
      `  - ${row.noc_number} | ${row.company_name} | ${row.role_title} | completion=${row.completion_status ?? 'not-submitted (due)'}`,
    );
  }

  if (!apply) {
    console.log('\nDry-run only. Re-run with --apply to insert.');
    return;
  }

  let created = 0;
  for (const row of rows) {
    // Idempotent on the unique noc_number so re-running --apply refreshes rather than duplicates.
    await prisma.nocRequest.upsert({
      where: { noc_number: row.noc_number },
      update: row,
      create: row,
    });
    created += 1;
  }
  console.log(`\nCreated/updated ${created} dummy NOC(s) for ${student.full_name}.`);
  console.log(`Remove them later with: tsx scripts/seed-dummy-completion-certs.ts --remove --apply`);
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
