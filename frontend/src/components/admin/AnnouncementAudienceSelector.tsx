import { useEffect, useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { Label } from '@/components/ui/label';
import { SearchableMultiSelect } from '@/components/shared/SearchableMultiSelect';
import type { SearchableSelectOption } from '@/components/shared/SearchableSelect';
import { policyKeys, usePolicyInstituteOptions } from '@/hooks/use-policy-api';
import { policyService } from '@/services/policyService';
import { useAnnouncementAudienceSemesters } from '@/hooks/use-announcement-api';
import type { PolicyAudienceOption } from '@/types/policy';

/**
 * Hierarchical announcement audience picker: Institute → Course → Branch → Semester.
 *
 * Each level is multi-select and AND-ed with the others; leaving a level empty means "all" for that
 * level. Child options are the UNION of the options under every selected parent, so a semester that
 * only exists under BCA never appears once B.Tech is the selection (cross-selection is prevented by
 * the data, not by validation).
 *
 * Values are stored as NAMES, matching what the backend compares against on the student record.
 * Deliberately separate from PolicyAudienceSelector (single-select), which the policy dialogs still
 * reference in commented-out code.
 */

const CRM_STALE_TIME = 30 * 60 * 1000;

function cleanValue(value: string) {
  return value.trim().toLowerCase();
}

function toOptions(options: PolicyAudienceOption[]): SearchableSelectOption[] {
  const seen = new Set<string>();
  const result: SearchableSelectOption[] = [];

  for (const option of options) {
    const name = option.name?.trim();
    if (!name) continue;

    const key = cleanValue(name);
    if (seen.has(key)) continue;

    seen.add(key);
    result.push({ value: name, label: name, keywords: [String(option.id)] });
  }

  return result.sort((a, b) => a.label.localeCompare(b.label));
}

/** Resolve selected names back to their CRM ids so the child lists can be fetched. */
function idsForNames(options: PolicyAudienceOption[] | undefined, names: string[]) {
  const lookup = new Map((options ?? []).map((option) => [cleanValue(option.name ?? ''), option.id]));
  return names
    .map((name) => lookup.get(cleanValue(name)))
    .filter((id): id is number => typeof id === 'number');
}

function sameValues(a: string[], b: string[]) {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export function AnnouncementAudienceSelector({
  targetInstitutes,
  targetCourses,
  targetBranches,
  targetSemesters,
  onTargetInstitutesChange,
  onTargetCoursesChange,
  onTargetBranchesChange,
  onTargetSemestersChange,
}: {
  targetInstitutes: string[];
  targetCourses: string[];
  targetBranches: string[];
  targetSemesters: string[];
  onTargetInstitutesChange: (values: string[]) => void;
  onTargetCoursesChange: (values: string[]) => void;
  onTargetBranchesChange: (values: string[]) => void;
  onTargetSemestersChange: (values: string[]) => void;
}) {
  const institutesQuery = usePolicyInstituteOptions();
  const instituteOptions = useMemo(() => toOptions(institutesQuery.data ?? []), [institutesQuery.data]);

  // One query per selected institute, reusing the policy hooks' cache keys so the lists are shared
  // with (and cached across) every other consumer.
  const selectedInstituteIds = useMemo(
    () => idsForNames(institutesQuery.data, targetInstitutes),
    [institutesQuery.data, targetInstitutes],
  );

  const courseQueries = useQueries({
    queries: selectedInstituteIds.map((instituteId) => ({
      queryKey: policyKeys.courses(instituteId),
      queryFn: () => policyService.getCourseOptions(instituteId),
      staleTime: CRM_STALE_TIME,
    })),
  });

  const courseData = useMemo(
    () => courseQueries.flatMap((query) => query.data ?? []),
    [courseQueries],
  );
  const courseOptions = useMemo(() => toOptions(courseData), [courseData]);
  const coursesLoading = courseQueries.some((query) => query.isLoading);

  const selectedCourseIds = useMemo(
    () => idsForNames(courseData, targetCourses),
    [courseData, targetCourses],
  );

  const branchQueries = useQueries({
    queries: selectedCourseIds.map((courseId) => ({
      queryKey: policyKeys.branches(courseId),
      queryFn: () => policyService.getBranchOptions(courseId),
      staleTime: CRM_STALE_TIME,
    })),
  });

  const branchData = useMemo(
    () => branchQueries.flatMap((query) => query.data ?? []),
    [branchQueries],
  );
  const branchOptions = useMemo(() => toOptions(branchData), [branchData]);
  const branchesLoading = branchQueries.some((query) => query.isLoading);

  // Semesters are derived from the students actually in this scope — no course→semester mapping
  // exists. Gated on a course being chosen: unscoped, it would list every semester in the tenant.
  const semesterScope = useMemo(
    () => ({ institutes: targetInstitutes, courses: targetCourses, branches: targetBranches }),
    [targetInstitutes, targetCourses, targetBranches],
  );
  const semestersQuery = useAnnouncementAudienceSemesters(semesterScope, targetCourses.length > 0);

  const semesterOptions = useMemo<SearchableSelectOption[]>(
    () => (semestersQuery.data?.semesters ?? []).map((entry) => ({
      value: entry.semester,
      label: `Semester ${entry.semester}`,
      description: `${entry.students} student${entry.students === 1 ? '' : 's'}`,
      keywords: [entry.semester],
    })),
    [semestersQuery.data],
  );

  // Prune child selections that are no longer reachable from the current parents. Runs only once
  // the relevant lists have settled, and keeps every still-valid selection (never a blanket clear).
  useEffect(() => {
    if (targetCourses.length === 0) return;
    if (selectedInstituteIds.length === 0) {
      onTargetCoursesChange([]);
      return;
    }
    if (coursesLoading) return;

    const allowed = new Set(courseOptions.map((option) => cleanValue(option.value)));
    const next = targetCourses.filter((name) => allowed.has(cleanValue(name)));
    if (!sameValues(next, targetCourses)) onTargetCoursesChange(next);
  }, [courseOptions, coursesLoading, onTargetCoursesChange, selectedInstituteIds.length, targetCourses]);

  useEffect(() => {
    if (targetBranches.length === 0) return;
    if (selectedCourseIds.length === 0) {
      onTargetBranchesChange([]);
      return;
    }
    if (branchesLoading) return;

    const allowed = new Set(branchOptions.map((option) => cleanValue(option.value)));
    const next = targetBranches.filter((name) => allowed.has(cleanValue(name)));
    if (!sameValues(next, targetBranches)) onTargetBranchesChange(next);
  }, [branchOptions, branchesLoading, onTargetBranchesChange, selectedCourseIds.length, targetBranches]);

  useEffect(() => {
    if (targetSemesters.length === 0) return;
    if (targetCourses.length === 0) {
      onTargetSemestersChange([]);
      return;
    }
    if (semestersQuery.isLoading || semestersQuery.isFetching) return;

    const allowed = new Set(semesterOptions.map((option) => option.value));
    const next = targetSemesters.filter((value) => allowed.has(value));
    if (!sameValues(next, targetSemesters)) onTargetSemestersChange(next);
  }, [
    onTargetSemestersChange,
    semesterOptions,
    semestersQuery.isFetching,
    semestersQuery.isLoading,
    targetCourses.length,
    targetSemesters,
  ]);

  const hasCourseSelection = targetCourses.length > 0;
  const noSemestersFound = hasCourseSelection
    && !semestersQuery.isLoading
    && semesterOptions.length === 0;

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="space-y-1">
        <Label>Student Visibility</Label>
        <p className="text-sm text-muted-foreground">
          Institute → Course → Branch → Semester. Each level narrows the one below it; leave a level
          empty to include all of it. Semesters are listed from the students in the selected scope, so
          only valid combinations can be picked.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Institutes</Label>
          <SearchableMultiSelect
            options={instituteOptions}
            values={targetInstitutes}
            onChange={onTargetInstitutesChange}
            placeholder="All institutes"
            searchPlaceholder="Search institute..."
            emptyMessage="No institutes found."
            loadingMessage="Loading institutes..."
            isLoading={institutesQuery.isLoading}
            contentClassName="w-[min(40rem,calc(100vw-2rem))]"
          />
        </div>

        <div className="space-y-2">
          <Label>Courses</Label>
          <SearchableMultiSelect
            options={courseOptions}
            values={targetCourses}
            onChange={onTargetCoursesChange}
            placeholder={targetInstitutes.length > 0 ? 'All courses' : 'Select institute first'}
            searchPlaceholder="Search course..."
            emptyMessage="No courses found."
            loadingMessage="Loading courses..."
            isLoading={coursesLoading}
            disabled={targetInstitutes.length === 0}
            contentClassName="w-[min(40rem,calc(100vw-2rem))]"
          />
        </div>

        <div className="space-y-2">
          <Label>Branches</Label>
          <SearchableMultiSelect
            options={branchOptions}
            values={targetBranches}
            onChange={onTargetBranchesChange}
            placeholder={hasCourseSelection ? 'All branches' : 'Select course first'}
            searchPlaceholder="Search branch..."
            emptyMessage="No branches found."
            loadingMessage="Loading branches..."
            isLoading={branchesLoading}
            disabled={!hasCourseSelection}
            contentClassName="w-[min(40rem,calc(100vw-2rem))]"
          />
          <p className="text-xs text-muted-foreground">
            Student records have no branch field, so a branch also matches its parent course.
          </p>
        </div>

        <div className="space-y-2">
          <Label>Semesters</Label>
          <SearchableMultiSelect
            options={semesterOptions}
            values={targetSemesters}
            onChange={onTargetSemestersChange}
            placeholder={hasCourseSelection ? 'All semesters' : 'Select course first'}
            searchPlaceholder="Search semester..."
            emptyMessage="No semesters found for this selection."
            loadingMessage="Loading semesters..."
            isLoading={semestersQuery.isLoading}
            disabled={!hasCourseSelection}
            contentClassName="w-[min(40rem,calc(100vw-2rem))]"
          />
          {noSemestersFound ? (
            <p className="text-xs text-muted-foreground">
              No students with a recorded semester match this scope.
            </p>
          ) : hasCourseSelection && semestersQuery.data ? (
            <p className="text-xs text-muted-foreground">
              {semestersQuery.data.total_students} student
              {semestersQuery.data.total_students === 1 ? '' : 's'} in this scope.
            </p>
          ) : null}
        </div>
      </div>

      {institutesQuery.error || courseQueries.some((q) => q.error) || branchQueries.some((q) => q.error) ? (
        <p className="text-sm text-destructive">Unable to load one or more CRM audience lists. Please try again.</p>
      ) : null}
    </div>
  );
}
