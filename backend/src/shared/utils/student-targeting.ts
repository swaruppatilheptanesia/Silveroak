const NO_TARGET_MATCH = '__student_target_no_match__';

export type StudentTargetContext = {
  institute: string | null;
  course: string | null;
  branch: string | null;
  semester: number | null;
};

export type StudentTargetValues = {
  target_institutes?: string[];
  target_courses?: string[];
  target_branches?: string[];
  target_semesters?: string[];
};

export function normalizeComparable(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
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

export function matchesStudentTargeting(targets: StudentTargetValues, student: StudentTargetContext) {
  return matchesTargetValue(student.institute, targets.target_institutes)
    && matchesTargetValue(student.course, targets.target_courses)
    && matchesTargetValue(student.branch, targets.target_branches)
    && matchesTargetValue(student.semester, targets.target_semesters);
}

/**
 * Master/posting-type variant of matchesStudentTargeting. Students carry no
 * branch-level attribute (Student.department is course-derived) while the scope
 * picker offers granular CRM branch names — so on the strict matcher a branch
 * selection can never match and, via the AND, cancels an otherwise-correct
 * institute/course match, hiding the type (and its postings) from the right
 * students. Here a target branch falls back to its parent course: if the type is
 * course-scoped (the cascade sets the parent course whenever a branch is picked),
 * matching that course is enough; otherwise (branch-only scope) the student's
 * course is compared against the branch label. Used ONLY for student-facing
 * master visibility; postings/applications/analytics keep the strict matcher.
 */
export function matchesStudentTargetingForMaster(targets: StudentTargetValues, student: StudentTargetContext) {
  const branchSatisfied =
    matchesTargetValue(student.branch, targets.target_branches)
    || (targets.target_courses && targets.target_courses.length > 0
      ? matchesTargetValue(student.course, targets.target_courses)
      : matchesTargetValue(student.course, targets.target_branches));

  return matchesTargetValue(student.institute, targets.target_institutes)
    && matchesTargetValue(student.course, targets.target_courses)
    && branchSatisfied
    && matchesTargetValue(student.semester, targets.target_semesters);
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

