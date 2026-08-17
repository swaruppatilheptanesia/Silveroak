import { normalizeComparable, type StudentTargetValues } from './student-targeting';

/**
 * Faculty coordinator → student scoping.
 *
 * A faculty coordinator has no explicit student mapping; they are "assigned" via the
 * institute/course/branch arrays (and/or a single department string) set on their User
 * row in Add/Edit User. Historically only the single `department` string was used and it
 * was matched with an exact, case-sensitive equality against `Student.department` — which
 * is itself course-derived (CRM courseShortName/Full). That almost never matched, so the
 * Faculty Directory / NOC list / dropdowns came back empty.
 *
 * Here we resolve the faculty's full assignment and match students tolerantly: a target
 * program value (department/course/branch) matches the student's department OR course
 * (normalized, branch-falls-back-to-course, same idea as matchesStudentTargetingForMaster),
 * institute-gated only when the faculty has assigned institutes.
 */

type FacultyUserLike = {
  department?: string | null;
  courses?: string[] | null;
  branches?: string[] | null;
  institutes?: string[] | null;
};

type StudentScopeFields = {
  department?: string | null;
  course?: string | null;
  institute?: string | null;
};

export type FacultyScope = {
  programValues: string[]; // normalized union of department + courses + branches
  institutes: string[]; // normalized institutes
  hasScope: boolean;
};

function normalizedUnique(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (!value) continue;
    const normalized = normalizeComparable(String(value));
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    out.push(normalized);
  }
  return out;
}

function rawUnique(values: Array<string | null | undefined>) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (!value) continue;
    const trimmed = String(value).trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

export function resolveFacultyScope(user: FacultyUserLike): FacultyScope {
  const programValues = normalizedUnique([user.department, ...(user.courses ?? []), ...(user.branches ?? [])]);
  const institutes = normalizedUnique(user.institutes ?? []);
  return { programValues, institutes, hasScope: programValues.length > 0 || institutes.length > 0 };
}

function matchesAny(value: string | null | undefined, normalizedTargets: string[]) {
  if (value == null || value === '') return false;
  const normalizedStudent = normalizeComparable(String(value));
  if (!normalizedStudent) return false;
  return normalizedTargets.some(
    (target) =>
      normalizedStudent === target || normalizedStudent.includes(target) || target.includes(normalizedStudent),
  );
}

export function studentMatchesFacultyScope(student: StudentScopeFields, scope: FacultyScope): boolean {
  if (!scope.hasScope) return false;

  // Institute gate — only when the faculty has assigned institutes.
  if (scope.institutes.length > 0 && !matchesAny(student.institute, scope.institutes)) {
    return false;
  }

  // Program gate — student's department (course-derived) or course must match one of the
  // faculty's department/course/branch values. Branch falls back to course because students
  // carry no branch-level attribute.
  if (scope.programValues.length > 0) {
    return matchesAny(student.department, scope.programValues) || matchesAny(student.course, scope.programValues);
  }

  // Institute-only scope: the institute gate above already passed.
  return true;
}

/**
 * Does a posting-type MASTER fall under a faculty's remit? Derived purely from the
 * institute/course/branch scope both sides already carry — the master's target_* scope
 * (set by TPO admin at /admin/masters) overlapping the faculty's assignment. Used to drive
 * the faculty "My Programs" view; no explicit posting-type→faculty assignment exists.
 *
 * A dimension passes when the master has no targets for it (applies to everyone), or the
 * faculty has nothing assigned for it, or the two overlap (tolerant, normalized — same
 * substring tolerance as studentMatchesFacultyScope). Course and branch targets are unioned
 * because the faculty's programValues already fold department + courses + branches together.
 */
export function facultyMatchesPostingTypeMaster(scope: FacultyScope, targets: StudentTargetValues): boolean {
  const masterInstitutes = normalizedUnique(targets.target_institutes ?? []);
  const masterPrograms = normalizedUnique([
    ...(targets.target_courses ?? []),
    ...(targets.target_branches ?? []),
  ]);

  const overlaps = (masterValues: string[], facultyValues: string[]) =>
    masterValues.some((master) =>
      facultyValues.some(
        (faculty) => faculty === master || faculty.includes(master) || master.includes(faculty),
      ),
    );

  const instituteOk =
    masterInstitutes.length === 0 || scope.institutes.length === 0 || overlaps(masterInstitutes, scope.institutes);
  const programOk =
    masterPrograms.length === 0 || scope.programValues.length === 0 || overlaps(masterPrograms, scope.programValues);

  return instituteOk && programOk;
}

/**
 * Raw (non-normalized) assignment values, for building DB `where` filters that keep
 * server-side pagination (e.g. offers). Exact/case-sensitive — strictly broader than the
 * old single-department match, but less tolerant than studentMatchesFacultyScope.
 */
export function facultyAssignmentRawValues(user: FacultyUserLike) {
  return {
    programValues: rawUnique([user.department, ...(user.courses ?? []), ...(user.branches ?? [])]),
    institutes: rawUnique(user.institutes ?? []),
  };
}
