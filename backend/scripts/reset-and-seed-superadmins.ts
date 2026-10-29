/**
 * ⚠ DESTRUCTIVE — wipe the ENTIRE database, then create exactly two super_admin users.
 *
 * It targets whatever `DATABASE_URL` in backend/.env points at (same as every script here),
 * so run it in the environment whose DB you want to reset (yours OR the client's).
 *
 * What it does on --apply:
 *   1. Deletes every Tenant → cascades to all 45 tables (all FKs cascade or SetNull from Tenant),
 *      leaving the schema + migration history intact (no re-migrate needed).
 *   2. Recreates ONE tenant with slug `silver-oak-university` (matches DEFAULT_TENANT_SLUG so
 *      slug-less login resolves to it).
 *   3. Seeds the role-permission matrix (so any later-created role works; super_admin bypasses it).
 *   4. Creates two super_admin users, each with a fresh 15-char strong password, printed once.
 *
 * Safety: --apply prints the target DB (host + database name) and requires you to type `WIPE`
 * at the prompt before anything is deleted. Pass --yes to skip the prompt (non-interactive).
 *
 * Usage (from backend/):
 *   tsx scripts/reset-and-seed-superadmins.ts            # dry-run: show target DB + current counts
 *   tsx scripts/reset-and-seed-superadmins.ts --apply    # wipe + seed (asks you to type WIPE)
 *   tsx scripts/reset-and-seed-superadmins.ts --apply --yes   # non-interactive (CI/hand-off)
 *
 * Or from the repo root via the wrapper:  ./reset-db-and-seed-superadmins.sh --apply
 */

import 'dotenv/config';
import readline from 'readline';
import { prisma } from '../src/config/database';
import { hashPassword, generateTemporaryPassword } from '../src/shared/utils/password';
import {
  PERMISSION_MODULES,
  PERMISSION_ROLES,
  getDefaultPermissionFlags,
} from '../src/shared/permissions';

const TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG || 'silver-oak-university';

/** The two super_admin accounts to create. Both role = super_admin. */
const SUPER_ADMINS = [
  { email: 'krishnasalvi.web@silveroakuni.ac.in', name: 'Krishna Salvi' },
  { email: 'placement.tpo@silveroakuni.ac.in', name: 'Placement TPO' },
];

/** Parse host + database name out of DATABASE_URL for the confirmation banner (no password shown). */
function describeTargetDb(): { host: string; database: string; raw: string } {
  const raw = process.env.DATABASE_URL || '(unset)';
  try {
    const url = new URL(raw);
    return {
      host: `${url.hostname}${url.port ? `:${url.port}` : ''}`,
      database: url.pathname.replace(/^\//, '') || '(default)',
      raw,
    };
  } catch {
    return { host: '(unparseable)', database: '(unparseable)', raw };
  }
}

function askToConfirm(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function printCurrentCounts() {
  const [tenants, users, students] = await Promise.all([
    prisma.tenant.count(),
    prisma.user.count(),
    prisma.student.count(),
  ]);
  console.log(`Current data:  tenants=${tenants}  users=${users}  students=${students}`);
}

async function seedRolePermissions(tenantId: string): Promise<number> {
  let count = 0;
  for (const role of PERMISSION_ROLES) {
    for (const module of PERMISSION_MODULES) {
      await prisma.rolePermission.create({
        data: { tenant_id: tenantId, role, module, ...getDefaultPermissionFlags(role, module) },
      });
      count += 1;
    }
  }
  return count;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const skipPrompt = process.argv.includes('--yes');
  const target = describeTargetDb();

  console.log('==================================================================');
  console.log(' RESET DATABASE + SEED TWO SUPER ADMINS');
  console.log('==================================================================');
  console.log(`Target DB host:     ${target.host}`);
  console.log(`Target database:    ${target.database}`);
  console.log(`Tenant slug:        ${TENANT_SLUG}`);
  console.log('Super admins to create:');
  for (const a of SUPER_ADMINS) console.log(`  - ${a.email}  (${a.name})`);
  console.log('------------------------------------------------------------------');
  await printCurrentCounts();
  console.log('------------------------------------------------------------------');

  if (!apply) {
    console.log('\nDry-run only. Nothing was changed.');
    console.log('Re-run with --apply to WIPE this database and create the two super admins.');
    return;
  }

  console.log('\n⚠  --apply given: this will PERMANENTLY ERASE ALL DATA in the database above.');

  if (!skipPrompt) {
    const answer = await askToConfirm('Type WIPE to proceed (anything else aborts): ');
    if (answer !== 'WIPE') {
      console.log('Aborted — confirmation not given. No changes made.');
      return;
    }
  } else {
    console.log('(--yes given: skipping interactive confirmation)');
  }

  // 1. Wipe — deleting all tenants cascades to every tenant-scoped table.
  console.log('\nWiping all data...');
  const deleted = await prisma.tenant.deleteMany({});
  console.log(`  Deleted ${deleted.count} tenant(s) and all cascaded data.`);

  // 2. Recreate the tenant (slug must match DEFAULT_TENANT_SLUG for slug-less login).
  const tenant = await prisma.tenant.create({
    data: {
      slug: TENANT_SLUG,
      name: 'Silver Oak University',
      short_name: 'SOU',
      tagline: 'Training & Placement Portal',
      contact_email: 'tpo@silveroak.ac.in',
      contact_phone: '+91-79-61900100',
      website: 'https://www.silveroak.ac.in',
      config: {
        academic_year: '2025-26',
        max_resumes: 5,
        max_file_size_mb: 5,
        allowed_resume_types: ['application/pdf'],
        placement_policy_version: '1.0',
      },
    },
  });
  console.log(`  Created tenant: ${tenant.name} (${tenant.slug})`);

  // 3. Seed the role-permission matrix (optional for super_admin, but keeps other roles usable).
  const permCount = await seedRolePermissions(tenant.id);
  console.log(`  Seeded ${permCount} role-permission entries.`);

  // 4. Create the two super_admin users with fresh 15-char strong passwords.
  const created: { email: string; password: string }[] = [];
  for (const admin of SUPER_ADMINS) {
    const password = generateTemporaryPassword(15);
    const password_hash = await hashPassword(password);
    await prisma.user.create({
      data: {
        tenant_id: tenant.id,
        email: admin.email,
        password_hash,
        role: 'super_admin',
        name: admin.name,
      },
    });
    created.push({ email: admin.email, password });
  }

  // 5. Print the credentials once.
  console.log('\n==================================================================');
  console.log(' ✅ DONE — SUPER ADMIN CREDENTIALS (shown once — store them now)');
  console.log('==================================================================');
  for (const c of created) {
    console.log(`  Email:    ${c.email}`);
    console.log(`  Password: ${c.password}`);
    console.log('  ------------------------------------------------------------');
  }
  console.log('These passwords are NOT stored anywhere else. Copy them now.');
}

void main()
  .catch((err) => {
    console.error('Script failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
