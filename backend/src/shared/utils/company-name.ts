import { prisma } from '../../config/database';

/**
 * Company name normalization + duplicate lookup.
 *
 * Prevents the same employer being created twice under cosmetically different names
 * ("Infosys" / "infosys" / "Info-sys"), which fragments postings, recruiters and offers
 * across several Company rows.
 *
 * ⚠ MIRRORED on the frontend in `src/lib/employerModule.ts` (normalizeCompanyName).
 * The two must stay in sync — the UI uses it to warn before saving, this copy is the
 * authoritative check. If they drift, the server still wins.
 */

/**
 * Lowercase and drop everything that is not a letter or digit — punctuation AND all
 * whitespace. So "TechCorp", "Tech Corp" and "Tech-Corp" share one key, which is the
 * whole point: those are the same employer typed three ways.
 *
 * Deliberately does NOT strip legal suffixes (pvt / ltd / inc): that would make
 * "Acme Ltd" and "Acme Inc" collide, and those are genuinely different companies.
 * Suffix differences are left to the advisory (substring) suggestions in the UI.
 *
 * \p{L}/\p{N} rather than [a-z0-9] so a non-Latin company name doesn't normalize to
 * an empty string and silently bypass the check.
 */
export function normalizeCompanyName(name: string): string {
  return name.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
}

/**
 * Returns the tenant's existing company whose normalized name equals `name`, else null.
 *
 * Pass `excludeCompanyId` when checking a rename, so a company never matches itself.
 *
 * ⚠ The comparison cannot be pushed into the Prisma `where`: `mode: 'insensitive'` covers
 * case but not spacing or punctuation, which is exactly what this guard exists to catch.
 * A tenant holds hundreds of companies, so pulling {id, name} and comparing in memory is fine.
 */
export async function findDuplicateCompany(
  tenantId: string,
  name: string,
  excludeCompanyId?: string,
): Promise<{ id: string; name: string } | null> {
  const normalized = normalizeCompanyName(name);
  if (!normalized) return null;

  const companies = await prisma.company.findMany({
    where: {
      tenant_id: tenantId,
      ...(excludeCompanyId ? { id: { not: excludeCompanyId } } : {}),
    },
    select: { id: true, name: true },
  });

  return companies.find((company) => normalizeCompanyName(company.name) === normalized) ?? null;
}
