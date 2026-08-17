/**
 * One-off repair: link an orphaned recruiter User to a Company by creating
 * (or attaching) the Recruiter profile row. Idempotent. Uses the same
 * service function as the admin endpoint, so the same validations apply.
 *
 * Usage:
 *   tsx scripts/link-recruiter-once.ts <email> <company_id>
 *
 * Example:
 *   tsx scripts/link-recruiter-once.ts recruiter@gmail.com e2a02e21-ae60-4c12-9130-e27547e3a8c8
 */

import 'dotenv/config';
import { prisma } from '../src/config/database';
import { linkRecruiterToCompany } from '../src/modules/admin/admin.service';

async function main() {
  const [, , emailArg, companyIdArg] = process.argv;
  if (!emailArg || !companyIdArg) {
    console.error('Usage: tsx scripts/link-recruiter-once.ts <email> <company_id>');
    process.exit(1);
  }

  const email = emailArg.trim().toLowerCase();
  const company_id = companyIdArg.trim();

  const users = await prisma.user.findMany({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { id: true, email: true, name: true, role: true, tenant_id: true },
  });

  if (users.length === 0) {
    console.error(`No user found with email ${email}`);
    process.exit(1);
  }
  if (users.length > 1) {
    console.error(`Multiple users with email ${email} across tenants:`, users);
    process.exit(1);
  }

  const user = users[0];
  console.log('User:', user);

  if (user.role !== 'recruiter') {
    console.error(`User role is ${user.role}, expected recruiter`);
    process.exit(1);
  }

  const existingRecruiter = await prisma.recruiter.findUnique({
    where: { user_id: user.id },
    select: { id: true, company_id: true, company: { select: { name: true } } },
  });
  console.log('Existing recruiter profile (by user_id):', existingRecruiter);

  const orphanByEmail = await prisma.recruiter.findUnique({
    where: { tenant_id_email: { tenant_id: user.tenant_id, email: user.email } },
    select: { id: true, user_id: true, company_id: true },
  });
  console.log('Existing recruiter row (by tenant+email):', orphanByEmail);

  const company = await prisma.company.findFirst({
    where: { id: company_id, tenant_id: user.tenant_id },
    select: { id: true, name: true, tenant_id: true },
  });
  if (!company) {
    console.error(`Company ${company_id} not found in tenant ${user.tenant_id}`);
    process.exit(1);
  }
  console.log('Target company:', company);

  console.log('\nApplying link...');
  const result = await linkRecruiterToCompany(user.id, user.tenant_id, { company_id });
  console.log('Result user:', {
    id: result?.id,
    email: result?.email,
    role: result?.role,
    recruiter_profile: (result as { recruiter_profile?: unknown })?.recruiter_profile,
  });

  console.log('\nDone.');
}

main()
  .catch((err) => {
    console.error('Script failed:', err);
    process.exit(1);
  })
  .finally(() => {
    void prisma.$disconnect();
  });
