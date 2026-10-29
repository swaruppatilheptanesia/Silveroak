/**
 * Seed real test data for the "Academic Year controls Posting Type" filter dependency.
 *
 * The Academic-Year dropdown is sourced from the `academic_year` master category, and a
 * posting type is tied to a year through the posting-type master's `target_academic_years`
 * array. On the dev DB almost none of the posting types were tagged, so selecting a year
 * never narrowed the Posting Type list (an empty tag means "applies to every year").
 *
 * This script:
 *   1. Ensures at least 10 `academic_year` master options exist (upsert by normalized value,
 *      keeping the existing ones untouched).
 *   2. Tags every `posting_type` master with a distinct academic year — the four ACTIVE
 *      posting types (the only ones the filter dropdowns show) each get their OWN year so
 *      switching the Academic Year visibly changes the Posting Type list.
 *
 * Idempotent: re-running produces the same end state. Reversible with --reset (clears every
 * posting-type tag back to []) — the seeded academic-year options are left in place.
 *
 * Usage (from backend/):
 *   npx tsx scripts/seed-academic-year-posting-type-tags.ts            # dry-run: show the plan
 *   npx tsx scripts/seed-academic-year-posting-type-tags.ts --apply    # write the tags
 *   npx tsx scripts/seed-academic-year-posting-type-tags.ts --reset --apply   # clear all tags
 */

import 'dotenv/config';
import { prisma } from '../src/config/database';

const SEED_TOKEN = '[AY-PT-SEED]';

const APPLY = process.argv.includes('--apply');
const RESET = process.argv.includes('--reset');

/** Mirror of masters.service normalizeMasterValue so upserts match existing rows exactly. */
function cleanMasterValue(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}
function normalizeMasterValue(value: string) {
  return cleanMasterValue(value).toLowerCase();
}

/** Academic years we want to guarantee exist (union with whatever is already there). */
const ACADEMIC_YEARS = [
  '2020-21',
  '2021-22',
  '2022-23',
  '2023-24',
  '2024-25',
  '2025-26',
  '2026-27',
  '2027-28',
  '2028-29',
  '2029-30',
];

/**
 * Explicit posting-type -> academic-year tags (matched case-insensitively on the master value).
 * The four ACTIVE posting types get four DISTINCT years so the filter demo is crisp; the
 * inactive ones are spread across the remaining years for completeness.
 */
const POSTING_TYPE_TAGS: Record<string, string> = {
  // --- active (shown in the filter dropdowns) — one distinct year each ---
  'bca special ojt - 3rd semester': '2024-25',
  'new test': '2025-26',
  'new stipend based internship program -2026 5th b.tech': '2026-27',
  'test placement': '2027-28',
  // --- inactive (not shown in dropdowns, tagged for report/value lists + auditability) ---
  'bca posting 1': '2028-29',
  'internship': '2029-30',
  'job': '2023-24',
  'nep internship program -2026': '2021-22',
  'ojt - 2026 honours nep internship': '2020-21',
  'placement 2026': '2022-23',
  'stipend based internship program - socca(bca) 2026': '2024-25',
  'stipend_internship': '2025-26',
  'summer intenrship for bca 2026': '2026-27',
  'summer internship 2023': '2027-28',
};

async function resolveTenantId(): Promise<string> {
  const rows = await prisma.masterOption.findMany({
    where: { category: 'posting_type' as never },
    select: { tenant_id: true },
    distinct: ['tenant_id'],
  });
  if (rows.length === 0) throw new Error('No posting_type masters found — nothing to tag.');
  if (rows.length > 1) {
    throw new Error(
      `Found posting_type masters across ${rows.length} tenants: ${rows
        .map((r) => r.tenant_id)
        .join(', ')}. Re-run this script with an explicit tenant filter.`,
    );
  }
  return rows[0].tenant_id;
}

async function ensureAcademicYears(tenantId: string) {
  const existing = await prisma.masterOption.findMany({
    where: { tenant_id: tenantId, category: 'academic_year' as never },
    select: { value: true, normalized_value: true },
  });
  const existingNorm = new Set(existing.map((e) => e.normalized_value));

  const toCreate = ACADEMIC_YEARS.filter((y) => !existingNorm.has(normalizeMasterValue(y)));
  console.log(`\nAcademic years — existing: ${existing.length}, to create: ${toCreate.length}`);
  existing.forEach((e) => console.log(`  · keep   ${e.value}`));
  toCreate.forEach((y) => console.log(`  + create ${y}`));

  if (APPLY && toCreate.length > 0) {
    await prisma.masterOption.createMany({
      data: toCreate.map((y) => ({
        tenant_id: tenantId,
        category: 'academic_year' as never,
        value: cleanMasterValue(y),
        normalized_value: normalizeMasterValue(y),
        is_active: true,
      })),
      skipDuplicates: true,
    });
  }
}

async function applyTags(tenantId: string) {
  const postingTypes = await prisma.masterOption.findMany({
    where: { tenant_id: tenantId, category: 'posting_type' as never },
    select: { id: true, value: true, is_active: true, normalized_value: true, target_academic_years: true },
    orderBy: { value: 'asc' },
  });

  console.log(`\nPosting types — ${postingTypes.length} total (tagging plan):`);
  const yearToTypes = new Map<string, string[]>();

  for (const pt of postingTypes) {
    const target = RESET ? [] : (() => {
      const tag = POSTING_TYPE_TAGS[pt.normalized_value];
      return tag ? [tag] : [];
    })();

    const before = `[${pt.target_academic_years.join(', ')}]`;
    const after = `[${target.join(', ')}]`;
    const changed = before !== after;
    console.log(
      `  ${changed ? '±' : '='} ${pt.is_active ? '[active] ' : '[inactv] '}${pt.value.padEnd(52)} ${before} -> ${after}`,
    );

    if (!RESET && target.length > 0) {
      const arr = yearToTypes.get(target[0]) ?? [];
      arr.push(`${pt.value}${pt.is_active ? '' : ' (inactive)'}`);
      yearToTypes.set(target[0], arr);
    }

    if (APPLY && changed) {
      await prisma.masterOption.update({
        where: { id: pt.id },
        data: { target_academic_years: target },
      });
    }
  }

  if (!RESET) {
    console.log('\nResulting Academic Year -> Posting Type map:');
    [...yearToTypes.keys()].sort().forEach((year) => {
      console.log(`  ${year}: ${yearToTypes.get(year)!.join('  |  ')}`);
    });
  }
}

async function main() {
  console.log(`${SEED_TOKEN} ${RESET ? 'RESET' : 'SEED'} — ${APPLY ? 'APPLY (writing)' : 'DRY-RUN (no writes)'}`);
  const tenantId = await resolveTenantId();
  console.log(`Tenant: ${tenantId}`);

  if (!RESET) await ensureAcademicYears(tenantId);
  await applyTags(tenantId);

  if (!APPLY) {
    console.log('\nDry-run only. Re-run with --apply to write these changes.');
  } else {
    console.log('\nDone.');
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
