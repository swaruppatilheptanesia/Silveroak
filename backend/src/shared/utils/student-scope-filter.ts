import { Prisma } from '@prisma/client';

/**
 * Shared scope filters for admin list screens (FILTER COUNTER EXPORT sheet).
 * "branch" == the REAL ERP Student.branch (from CRM branchName); "semester" == Student.current_semester;
 * "academic_year"/"passing_year" match Student.batch. All matches are case-insensitive `contains`.
 * NOTE: un-backfilled students have a null `branch`, so a branch filter excludes them until the
 * `scripts/backfill-student-branch.ts` backfill runs.
 */
export type StudentScopeFilters = {
  institute?: string | null;
  course?: string | null;
  branch?: string | null;
  semester?: string | null;
  academic_year?: string | null;
  passing_year?: string | null;
};

const ci = (value: string): Prisma.StringFilter => ({ contains: value, mode: 'insensitive' });

/**
 * Returns Prisma conditions against the Student model. Use directly (spread into a Student
 * `where`) for student lists, or nest under `{ student: { AND: conditions } }` for lists whose
 * rows relate to a student (applications/offers/nocs/no-dues).
 */
export function buildStudentScopeConditions(filters: StudentScopeFilters): Prisma.StudentWhereInput[] {
  const conditions: Prisma.StudentWhereInput[] = [];
  if (filters.institute) conditions.push({ institute: ci(filters.institute) });
  if (filters.course) conditions.push({ course: ci(filters.course) });
  if (filters.branch) conditions.push({ branch: ci(filters.branch) });
  if (filters.semester) conditions.push({ current_semester: ci(filters.semester) });
  const passing = filters.academic_year ?? filters.passing_year;
  if (passing) conditions.push({ batch: ci(passing) });
  return conditions;
}

/** Nested `student` scope clause for non-student lists (returns null when nothing to filter). */
export function buildStudentScopeRelation(filters: StudentScopeFilters): { student: Prisma.StudentWhereInput } | null {
  const conditions = buildStudentScopeConditions(filters);
  return conditions.length > 0 ? { student: { AND: conditions } } : null;
}

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Inclusive date-range clause on a Date/DateTime field; returns null when both bounds are absent.
 *
 * A date-only `yyyy-MM-dd` string is interpreted as a full UTC calendar day (start-of-day for `from`,
 * end-of-day for `to`) so the result is deterministic regardless of the server's local timezone — the
 * clients send date-only strings for exactly this reason. Full ISO instants / `Date` objects keep the
 * legacy server-local end-of-day behaviour for any non-list caller.
 */
export function buildDateRangeCondition(from?: string | Date | null, to?: string | Date | null): Prisma.DateTimeFilter | null {
  const clause: Prisma.DateTimeFilter = {};
  if (from) {
    const start = typeof from === 'string' && DATE_ONLY_PATTERN.test(from)
      ? new Date(`${from}T00:00:00.000Z`)
      : new Date(from);
    if (!Number.isNaN(start.getTime())) clause.gte = start;
  }
  if (to) {
    if (typeof to === 'string' && DATE_ONLY_PATTERN.test(to)) {
      const end = new Date(`${to}T23:59:59.999Z`);
      if (!Number.isNaN(end.getTime())) clause.lte = end;
    } else {
      const end = new Date(to);
      if (!Number.isNaN(end.getTime())) {
        end.setHours(23, 59, 59, 999);
        clause.lte = end;
      }
    }
  }
  return clause.gte || clause.lte ? clause : null;
}
