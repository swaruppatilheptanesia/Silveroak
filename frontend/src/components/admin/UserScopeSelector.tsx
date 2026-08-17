import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import { AlertCircle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { SearchableMultiSelect } from '@/components/shared/SearchableMultiSelect';
import { usePolicyInstituteOptions } from '@/hooks/use-policy-api';
import { useMasterValues } from '@/hooks/use-master-api';
import { policyService } from '@/services/policyService';
import type { PolicyAudienceOption } from '@/types/policy';
import type { SearchableSelectOption } from '@/components/shared/SearchableSelect';

function cleanValue(value: string) {
  return value.trim().toLowerCase();
}

function uniqueOptions(options: PolicyAudienceOption[]) {
  const seen = new Set<string>();
  const merged: PolicyAudienceOption[] = [];

  for (const option of options) {
    const key = cleanValue(option.name);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(option);
  }

  return merged;
}

function toSearchOptions(options: PolicyAudienceOption[] | undefined): SearchableSelectOption[] {
  return uniqueOptions((options ?? []).filter((option) => Boolean(option.name.trim()))).map((option) => ({
    value: String(option.id),
    label: option.name,
    description: `ID ${option.id}`,
    keywords: [String(option.id)],
  }));
}

function findSelectedIds(options: PolicyAudienceOption[] | undefined, selectedValues: string[]) {
  const lookup = new Map(
    uniqueOptions((options ?? []).filter((option) => Boolean(option.name.trim())))
      .map((option) => [cleanValue(option.name), String(option.id)]),
  );

  return selectedValues
    .map((value) => lookup.get(cleanValue(value)))
    .filter((value): value is string => typeof value === 'string');
}

function mapSelectedNames(options: PolicyAudienceOption[] | undefined, selectedIds: string[]) {
  const lookup = new Map(
    uniqueOptions((options ?? []).filter((option) => Boolean(option.name.trim())))
      .map((option) => [String(option.id), option.name]),
  );

  return selectedIds
    .map((value) => lookup.get(value))
    .filter((value): value is string => typeof value === 'string');
}

function combineQueryOptions(results: Array<{ data?: PolicyAudienceOption[]; isLoading: boolean; error: unknown }>) {
  return {
    data: uniqueOptions(results.flatMap((result) => result.data ?? [])),
    isLoading: results.some((result) => result.isLoading),
    error: results.find((result) => result.error)?.error ?? null,
  };
}

export function UserScopeSelector({
  targetInstitutes,
  targetBranches,
  targetCourses,
  targetSemesters,
  targetAcademicYears,
  onTargetInstitutesChange,
  onTargetBranchesChange,
  onTargetCoursesChange,
  onTargetSemestersChange,
  onTargetAcademicYearsChange,
}: {
  targetInstitutes: string[];
  targetBranches: string[];
  targetCourses: string[];
  targetSemesters?: string[];
  targetAcademicYears?: string[];
  onTargetInstitutesChange: (values: string[]) => void;
  onTargetBranchesChange: (values: string[]) => void;
  onTargetCoursesChange: (values: string[]) => void;
  onTargetSemestersChange?: (values: string[]) => void;
  onTargetAcademicYearsChange?: (values: string[]) => void;
}) {
  const semesterOptions = Array.from({ length: 12 }, (_, index) => String(index + 1));
  const academicYearQuery = useMasterValues('academic_year', Boolean(onTargetAcademicYearsChange));
  const academicYearOptionsSearch = useMemo(
    () => (academicYearQuery.data ?? []).map((year) => ({
      value: year,
      label: year,
      keywords: [year],
    })),
    [academicYearQuery.data],
  );
  const institutesQuery = usePolicyInstituteOptions();
  const instituteOptions = useMemo(() => toSearchOptions(institutesQuery.data), [institutesQuery.data]);
  const selectedInstituteIds = useMemo(
    () => findSelectedIds(institutesQuery.data, targetInstitutes),
    [institutesQuery.data, targetInstitutes],
  );

  const courseQueries = useQueries({
    queries: selectedInstituteIds.map((instituteId) => ({
      queryKey: ['user-scope', 'courses', instituteId],
      queryFn: () => policyService.getCourseOptions(Number(instituteId)),
      enabled: Boolean(instituteId),
      staleTime: 30 * 60 * 1000,
    })),
  });
  const courseState = combineQueryOptions(courseQueries);
  const courseOptions = useMemo(() => toSearchOptions(courseState.data), [courseState.data]);
  const selectedCourseIds = useMemo(
    () => findSelectedIds(courseState.data, targetCourses),
    [courseState.data, targetCourses],
  );

  const branchQueries = useQueries({
    queries: selectedCourseIds.map((courseId) => ({
      queryKey: ['user-scope', 'branches', courseId],
      queryFn: () => policyService.getBranchOptions(Number(courseId)),
      enabled: Boolean(courseId),
      staleTime: 30 * 60 * 1000,
    })),
  });
  const branchState = combineQueryOptions(branchQueries);
  const branchOptions = useMemo(() => toSearchOptions(branchState.data), [branchState.data]);
  const semesterOptionsSearch = useMemo(
    () => semesterOptions.map((semester) => ({
      value: semester,
      label: `Semester ${semester}`,
      keywords: [semester],
    })),
    [semesterOptions],
  );

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="space-y-1">
        <Label>Institute / Course / Branch Scope</Label>
        <p className="text-sm text-muted-foreground">
          Search is available in every picker. Select one or more institutes first, then course and branch options will filter automatically.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-2">
          <Label>Institutes</Label>
          <SearchableMultiSelect
            options={instituteOptions}
            values={selectedInstituteIds}
            onChange={(values) => {
              onTargetInstitutesChange(mapSelectedNames(institutesQuery.data, values));
              onTargetBranchesChange([]);
              onTargetCoursesChange([]);
            }}
            placeholder="Select institute"
            searchPlaceholder="Search institute..."
            emptyMessage="No institutes found."
            loadingMessage="Loading institutes..."
            isLoading={institutesQuery.isLoading}
            maxChips={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Courses</Label>
          <SearchableMultiSelect
            options={courseOptions}
            values={selectedCourseIds}
            onChange={(values) => {
              onTargetCoursesChange(mapSelectedNames(courseState.data, values));
              onTargetBranchesChange([]);
            }}
            placeholder={selectedInstituteIds.length > 0 ? 'Select course' : 'Select institute first'}
            searchPlaceholder="Search course..."
            emptyMessage="No courses found."
            loadingMessage="Loading courses..."
            disabled={selectedInstituteIds.length === 0 || courseState.isLoading}
            isLoading={courseState.isLoading}
            maxChips={2}
          />
        </div>

        <div className="space-y-2">
          <Label>Branches</Label>
          <SearchableMultiSelect
            options={branchOptions}
            values={findSelectedIds(branchState.data, targetBranches)}
            onChange={(values) => onTargetBranchesChange(mapSelectedNames(branchState.data, values))}
            placeholder={selectedCourseIds.length > 0 ? 'Select branch' : 'Select course first'}
            searchPlaceholder="Search branch..."
            emptyMessage="No branches found."
            loadingMessage="Loading branches..."
            disabled={selectedCourseIds.length === 0 || branchState.isLoading}
            isLoading={branchState.isLoading}
            maxChips={2}
          />
        </div>

        {onTargetSemestersChange ? (
          <div className="space-y-2">
            <Label>Semesters</Label>
            <SearchableMultiSelect
              options={semesterOptionsSearch}
              values={targetSemesters ?? []}
              onChange={onTargetSemestersChange}
              placeholder="Select semester(s)"
              searchPlaceholder="Search semester..."
              emptyMessage="No semesters found."
              maxChips={3}
            />
          </div>
        ) : null}

        {onTargetAcademicYearsChange ? (
          <div className="space-y-2">
            <Label>Academic Years</Label>
            <SearchableMultiSelect
              options={academicYearOptionsSearch}
              values={targetAcademicYears ?? []}
              onChange={onTargetAcademicYearsChange}
              placeholder="Select academic year(s)"
              searchPlaceholder="Search academic year..."
              emptyMessage="No academic years found."
              isLoading={academicYearQuery.isLoading}
              maxChips={3}
            />
          </div>
        ) : null}
      </div>

      {(institutesQuery.error || branchState.error || courseState.error) && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          Unable to load one or more scope lists. {(() => {
            const err = institutesQuery.error || courseState.error || branchState.error;
            return err instanceof Error ? err.message : 'Please try again.';
          })()}
        </div>
      )}
    </div>
  );
}
