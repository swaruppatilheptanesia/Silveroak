/**
 * Seed a University-Placement-Drive test fixture for a student (default: "Aditi Mehta"):
 *   Company (with a Recruiter) → Posting → released Offer.
 *
 * Purpose: let you test the NOC recruiter-fallback fix end to end. Log in as the student,
 * go to Apply for NOC → Offer Source = University Placement Drive, pick the released offer,
 * and submit. The created NOC links to this company, so its recruiter's name/contact/email/
 * designation flow into the NOC record, the Internship-NOC report, and the certificate.
 *
 * Everything is tied to the demo company name below, which is how --remove finds it again.
 *
 * Usage (from backend/):
 *   tsx scripts/seed-dummy-drive-offer.ts                    # dry-run
 *   tsx scripts/seed-dummy-drive-offer.ts --apply            # create the fixture
 *   tsx scripts/seed-dummy-drive-offer.ts --apply --student="Aditi Mehta"
 *   tsx scripts/seed-dummy-drive-offer.ts --remove --apply   # delete the fixture again
 */

import 'dotenv/config';
import { prisma } from '../src/config/database';
import { CompanySource, CompanyVerificationStatus, VerificationStatus, OfferStatus, OfferType, PostingStatus, WorkMode } from '@prisma/client';

const COMPANY_NAME = 'Innovatech Systems Pvt Ltd';
const RECRUITER = {
  name: 'Priya Sharma',
  email: 'priya.sharma@innovatech-demo.example',
  phone: '9825011122',
  designation: 'HR Manager',
};

function parseStudentName(fallback: string) {
  const arg = process.argv.find((v) => v.startsWith('--student='));
  if (!arg) return fallback;
  return arg.split('=').slice(1).join('=').replace(/^["']|["']$/g, '').trim() || fallback;
}

async function findCompany(tenantId: string) {
  return prisma.company.findFirst({
    where: { tenant_id: tenantId, name: { equals: COMPANY_NAME, mode: 'insensitive' } },
    select: { id: true },
  });
}

async function removeFixture(apply: boolean, tenantId: string) {
  const company = await findCompany(tenantId);
  if (!company) {
    console.log(`No demo company "${COMPANY_NAME}" found — nothing to remove.`);
    return;
  }
  const postings = await prisma.posting.findMany({ where: { company_id: company.id }, select: { id: true } });
  const postingIds = postings.map((p) => p.id);
  const offerCount = await prisma.offer.count({ where: { company_id: company.id } });
  const recCount = await prisma.recruiter.count({ where: { company_id: company.id } });
  console.log(`Would delete: ${offerCount} offer(s), ${postingIds.length} posting(s), ${recCount} recruiter(s), company "${COMPANY_NAME}".`);
  if (!apply) {
    console.log('\nDry-run only. Re-run with --remove --apply to delete.');
    return;
  }
  await prisma.offer.deleteMany({ where: { company_id: company.id } });
  await prisma.posting.deleteMany({ where: { company_id: company.id } });
  await prisma.recruiter.deleteMany({ where: { company_id: company.id } });
  await prisma.company.delete({ where: { id: company.id } });
  console.log('\nDeleted the demo drive-offer fixture.');
}

async function seedFixture(apply: boolean, studentName: string) {
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

  // Pick an active posting type the student has NO issued NOC for — the NOC wizard disables (labels
  // "(Issued)") any program the student already has an issued NOC in, so an "issued" type would show
  // but not be selectable. Fall back to the first active type if every one is already issued.
  const activeTypes = await prisma.masterOption.findMany({
    where: { tenant_id: tenantId, category: 'posting_type', is_active: true },
    select: { id: true, value: true },
    orderBy: { created_at: 'asc' },
  });
  if (activeTypes.length === 0) {
    console.log('No active posting_type master found for this tenant — cannot create a posting.');
    return;
  }
  const norm = (v: string) => v.trim().replace(/\s+/g, ' ').toLowerCase();
  const issuedNocs = await prisma.nocRequest.findMany({
    where: { student_id: student.id, status: 'issued' },
    select: { program: true },
  });
  const issued = new Set(issuedNocs.map((n) => norm(n.program)));
  const postingType = activeTypes.find((t) => !issued.has(norm(t.value))) ?? activeTypes[0];
  if (issued.has(norm(postingType.value))) {
    console.log('⚠ Every active posting type already has an issued NOC for this student — the program will show as "(Issued)" and be unselectable in the wizard.');
  }

  console.log(`Student : ${student.full_name} (${student.enrollment_number ?? 'no-enrollment'})`);
  console.log(`Tenant  : ${tenantId}`);
  console.log(`Company : ${COMPANY_NAME}`);
  console.log(`Recruiter: ${RECRUITER.name} · ${RECRUITER.designation} · ${RECRUITER.phone} · ${RECRUITER.email}`);
  console.log(`Posting type: ${postingType.value}`);
  console.log(`Offer   : Software Engineer Trainee (status pending_student_action)`);

  if (!apply) {
    console.log('\nDry-run only. Re-run with --apply to create.');
    return;
  }

  // Idempotent: clear any prior fixture for this company first.
  const prior = await findCompany(tenantId);
  if (prior) {
    await prisma.offer.deleteMany({ where: { company_id: prior.id } });
    await prisma.posting.deleteMany({ where: { company_id: prior.id } });
    await prisma.recruiter.deleteMany({ where: { company_id: prior.id } });
    await prisma.company.delete({ where: { id: prior.id } });
  }

  const company = await prisma.company.create({
    data: {
      tenant_id: tenantId,
      name: COMPANY_NAME,
      city: 'Ahmedabad',
      state: 'Gujarat',
      source: CompanySource.admin,
      verification_status: CompanyVerificationStatus.verified,
    },
    select: { id: true },
  });

  await prisma.recruiter.create({
    data: {
      tenant_id: tenantId,
      company_id: company.id,
      name: RECRUITER.name,
      email: RECRUITER.email,
      phone: RECRUITER.phone,
      designation: RECRUITER.designation,
      verification_status: VerificationStatus.verified,
    },
  });

  const posting = await prisma.posting.create({
    data: {
      tenant_id: tenantId,
      company_id: company.id,
      title: 'Software Engineer Trainee',
      posting_type_master_id: postingType.id,
      academic_year: '2025-26',
      role_name: 'Software Engineer',
      location: 'Ahmedabad',
      work_mode: WorkMode.onsite,
      status: PostingStatus.published,
    },
    select: { id: true },
  });

  const offer = await prisma.offer.create({
    data: {
      tenant_id: tenantId,
      student_id: student.id,
      posting_id: posting.id,
      company_id: company.id,
      role: 'Software Engineer Trainee',
      type: OfferType.internship,
      offer_date: new Date(),
      status: OfferStatus.pending_student_action,
      is_locked: true,
      applications_blocked: true,
    },
    select: { id: true },
  });

  console.log(`\nCreated company=${company.id}, posting=${posting.id}, offer=${offer.id} with recruiter ${RECRUITER.name}.`);
  console.log(`Now log in as ${student.full_name} → Apply for NOC → University Placement Drive → pick the "${COMPANY_NAME}" offer → submit.`);
  console.log(`Remove later with: tsx scripts/seed-dummy-drive-offer.ts --remove --apply`);
}

async function main() {
  const apply = process.argv.includes('--apply');
  const remove = process.argv.includes('--remove');
  const studentName = parseStudentName('Aditi Mehta');

  const student = await prisma.student.findFirst({
    where: { full_name: { contains: studentName, mode: 'insensitive' } },
    select: { tenant_id: true },
  });
  if (!student) {
    console.log(`No student matching "${studentName}" found.`);
    return;
  }

  if (remove) {
    await removeFixture(apply, student.tenant_id);
    return;
  }
  await seedFixture(apply, studentName);
}

void main()
  .catch((err) => {
    console.error('Script failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
