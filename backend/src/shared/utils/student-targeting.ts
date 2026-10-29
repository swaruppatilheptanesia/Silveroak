const NO_TARGET_MATCH = '__student_target_no_match__';

export type StudentTargetContext = {
  institute: string | null;
  course: string | null;
  branch: string | null;
  semester: number | null;
};

export type ScopeRow = { institute: string; course: string; branch: string; semesters: string[] };

export type StudentTargetValues = {
  target_institutes?: string[];
  target_courses?: string[];
  target_branches?: string[];
  target_semesters?: string[];
  // posting_type only: cascading targeting rows (Institute → Course → Branch → Semester). When present these
  // supersede the flat arrays and a student matching ANY row is eligible. Typed `unknown` because callers pass
  // the raw MasterOption row whose Json column is `JsonValue`; parseScopeRows coerces it defensively.
  scope_rows?: unknown;
};

export function normalizeComparable(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

// Students now carry a real ERP branch (`Student.branch`), but existing rows are null until the
// backfill runs. Branch is therefore NULL-GATED: enforced strictly when the student has a branch,
// skipped (relying on the course/institute/semester dimensions) when it's empty.
function hasBranch(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function matchesTargetValue(studentValue: string | number | null | undefined, targetValues: string[] | undefined) {
  if (!targetValues || targetValues.length === 0) {
    return true;
  }

  if (studentValue === null || studentValue === undefined || studentValue === '') {
    return false;
  }

  const normalizedStudent = normalizeComparable(String(studentValue));

  return targetValues.some((targetValue) => {
    const normalizedTarget = normalizeComparable(targetValue);
    return normalizedStudent === normalizedTarget
      || normalizedStudent.includes(normalizedTarget)
      || normalizedTarget.includes(normalizedStudent);
  });
}

function parseScopeRows(value: unknown): ScopeRow[] {
  if (!Array.isArray(value)) return [];
  const rows: ScopeRow[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue;
    const { institute, course, branch, semesters } = entry as {
      institute?: unknown;
      course?: unknown;
      branch?: unknown;
      semesters?: unknown;
    };
    if (
      typeof institute !== 'string'
      || typeof course !== 'string'
      || typeof branch !== 'string'
      || !Array.isArray(semesters)
    ) {
      continue;
    }
    rows.push({
      institute,
      course,
      branch,
      semesters: semesters.filter((s): s is string => typeof s === 'string'),
    });
  }
  return rows;
}

/**
 * Cascading-row eligibility: a student matches if they match ANY row (institute AND course AND branch AND
 * semester). `branchFallback` is used by the master variant because students carry no real branch attribute
 * (Student.department is course-derived) — a row's branch is then satisfied by matching its parent course.
 */
// Branch is null-gated (see hasBranch): a target branch is enforced only when the student carries a
// real branch value; a null/empty branch passes on this dimension so the course/institute/semester
// dimensions gate instead (the transitional "fall back to course" behaviour until backfill).
function branchDimensionMatches(studentBranch: string | null, targetBranches: string[]) {
  if (!hasBranch(studentBranch)) return true;
  return matchesTargetValue(studentBranch, targetBranches);
}

function matchesScopeRows(rows: ScopeRow[], student: StudentTargetContext) {
  return rows.some(
    (row) =>
      matchesTargetValue(student.institute, [row.institute])
      && matchesTargetValue(student.course, [row.course])
      && branchDimensionMatches(student.branch, [row.branch])
      && matchesTargetValue(student.semester, row.semesters),
  );
}

export function matchesStudentTargeting(targets: StudentTargetValues, student: StudentTargetContext) {
  const rows = parseScopeRows(targets.scope_rows);
  if (rows.length > 0) {
    return matchesScopeRows(rows, student);
  }

  return matchesTargetValue(student.institute, targets.target_institutes)
    && matchesTargetValue(student.course, targets.target_courses)
    && branchDimensionMatches(student.branch, targets.target_branches ?? [])
    && matchesTargetValue(student.semester, targets.target_semesters);
}

/**
 * Master/posting-type variant of matchesStudentTargeting. Since students now carry a real ERP branch
 * (`Student.branch`), branch semantics are identical to the strict matcher — the old course-fallback
 * workaround (students had no branch attribute) is gone. Branch is null-gated (branchDimensionMatches):
 * strict when the student has a branch, skipped when it's null so course/institute/semester gate. Kept
 * as a separate export because callers differ (this one is the student-facing master-visibility path).
 */
export function matchesStudentTargetingForMaster(targets: StudentTargetValues, student: StudentTargetContext) {
  return matchesStudentTargeting(targets, student);
}

export function buildTargetWhereClause(field: keyof StudentTargetValues, studentValue: string | number | null | undefined) {
  const comparisonValue = studentValue === null || studentValue === undefined || studentValue === ''
    ? NO_TARGET_MATCH
    : String(studentValue);

  return {
    OR: [
      { [field]: { isEmpty: true } },
      { [field]: { has: comparisonValue } },
    ],
  } as const;
}

