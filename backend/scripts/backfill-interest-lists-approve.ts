/**
 * Backfill: grant tpo_admin the `can_approve` flag on the `interest_lists` module for every
 * EXISTING tenant.
 *
 * Why this is needed: RolePermission rows are only auto-seeded for role:module combos that don't
 * yet exist (`ensureTenantRolePermissions`). The `interest_lists` row already exists for every
 * tenant with `can_approve = false`, so the new default in `shared/permissions.ts` only applies to
 * brand-new tenants. Existing tenants need this one-time backfill so TPO admins can approve/withdraw
 * program registrations (PUT /admin/interests/registrations/:id/approve|withdraw).
 *
 * Usage (from docs/silveroak_backend):
 *   tsx scripts/backfill-interest-lists-approve.ts            # dry-run (default)
 *   tsx scripts/backfill-interest-lists-approve.ts --apply    # actually update
 */

import 'dotenv/config';
import { prisma } from '../src/config/database';

async function main() {
  const apply = process.argv.includes('--apply');

  const rows = await prisma.rolePermission.findMany({
    where: { role: 'tpo_admin', module: 'interest_lists', can_approve: false },
    select: { id: true, tenant_id: true },
  });

  console.log(`Found ${rows.length} tpo_admin/interest_lists rows with can_approve = false.`);
  if (rows.length === 0) {
    console.log('Nothing to backfill.');
    return;
  }

  if (!apply) {
    console.log('Dry-run. Re-run with --apply to set can_approve = true for these rows:');
    for (const row of rows) console.log(`  - tenant ${row.tenant_id} (permission ${row.id})`);
    return;
  }

  const result = await prisma.rolePermission.updateMany({
    where: { role: 'tpo_admin', module: 'interest_lists', can_approve: false },
    data: { can_approve: true },
  });
  console.log(`Updated ${result.count} rows → can_approve = true.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
