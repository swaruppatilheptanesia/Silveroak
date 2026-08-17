import { useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { SearchableSelect, type SearchableSelectOption } from '@/components/shared/SearchableSelect';
import { usePolicyBranchOptions, usePolicyCourseOptions, usePolicyInstituteOptions } from '@/hooks/use-policy-api';
import type { PolicyAudienceOption } from '@/types/policy';

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

function findSelectedOptionByName(options: PolicyAudienceOption[] | undefined, selectedValue: string) {
  const lookup = new Map(
    uniqueOptions((options ?? []).filter((option) => Boolean(option.name.trim())))
      .map((option) => [cleanValue(option.name), option]),
  );
  return lookup.get(cleanValue(selectedValue)) ?? null;
}

function findOptionById(options: PolicyAudienceOption[] | undefined, selectedValue: string) {
  const lookup = new Map(
    uniqueOptions((options ?? []).filter((option) => Boolean(option.name.trim())))
      .map((option) => [String(option.id), option]),
  );
  return lookup.get(selectedValue) ?? null;
}

export function PolicyAudienceSelector({
  targetInstitutes,
  targetBranches,
  targetCourses,
  onTargetInstitutesChange,
  onTargetBranchesChange,
  onTargetCoursesChange,
}: {
  targetInstitutes: string[];
  targetBranches: string[];
  targetCourses: string[];
  onTargetInstitutesChange: (values: string[]) => void;
  onTargetBranchesChange: (values: string[]) => void;
  onTargetCoursesChange: (values: string[]) => void;
}) {
  const institutesQuery = usePolicyInstituteOptions();
  const instituteOptions = useMemo(() => toSearchOptions(institutesQuery.data), [institutesQuery.data]);
  const selectedInstituteOption = findSelectedOptionByName(institutesQuery.data, targetInstitutes[0] ?? '');
  const selectedInstituteId = selectedInstituteOption?.id ?? null;
  const courseQuery = usePolicyCourseOptions(selectedInstituteId);
  const courseOptions = useMemo(() => toSearchOptions(courseQuery.data), [courseQuery.data]);
  const selectedCourseOption = findSelectedOptionByName(courseQuery.data, targetCourses[0] ?? '');
  const selectedCourseId = selectedCourseOption?.id ?? null;
  const branchQuery = usePolicyBranchOptions(selectedCourseId);
  const branchOptions = useMemo(() => toSearchOptions(branchQuery.data), [branchQuery.data]);
  const selectedBranchOption = findSelectedOptionByName(branchQuery.data, targetBranches[0] ?? '');

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <div className="space-y-1">
        <Label>Student Visibility</Label>
        <p className="text-sm text-muted-foreground">
          Leave a section empty to allow all students for that institute, course, or branch. Search is available in every picker.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label>Institute List</Label>
          <SearchableSelect
            options={instituteOptions}
            value={selectedInstituteOption ? String(selectedInstituteOption.id) : ''}
            onValueChange={(value) => {
              const selectedOption = findOptionById(institutesQuery.data, value);
              onTargetInstitutesChange(selectedOption ? [selectedOption.name] : []);
              onTargetBranchesChange([]);
              onTargetCoursesChange([]);
            }}
            placeholder="Select institute"
            searchPlaceholder="Search institute..."
            emptyMessage="No institutes found."
            loadingMessage="Loading institutes..."
            isLoading={institutesQuery.isLoading}
            clearable
            contentClassName="w-[min(40rem,calc(100vw-2rem))]"
          />
        </div>

        <div className="space-y-2">
          <Label>Course</Label>
          <SearchableSelect
            options={courseOptions}
            value={selectedCourseOption ? String(selectedCourseOption.id) : ''}
            onValueChange={(value) => {
              const selectedOption = findOptionById(courseQuery.data, value);
              onTargetCoursesChange(selectedOption ? [selectedOption.name] : []);
              onTargetBranchesChange([]);
            }}
            placeholder={selectedInstituteId ? 'Select course' : 'Select institute first'}
            searchPlaceholder="Search course..."
            emptyMessage="No courses found."
            loadingMessage="Loading courses..."
            disabled={selectedInstituteId === null || courseQuery.isLoading}
            isLoading={courseQuery.isLoading}
            clearable
            contentClassName="w-[min(40rem,calc(100vw-2rem))]"
          />
        </div>

        <div className="space-y-2">
          <Label>Branch</Label>
          <SearchableSelect
            options={branchOptions}
            value={selectedBranchOption ? String(selectedBranchOption.id) : ''}
            onValueChange={(value) => {
              const selectedOption = findOptionById(branchQuery.data, value);
              onTargetBranchesChange(selectedOption ? [selectedOption.name] : []);
            }}
            placeholder={selectedCourseId ? 'Select branch' : 'Select course first'}
            searchPlaceholder="Search branch..."
            emptyMessage="No branches found."
            loadingMessage="Loading branches..."
            disabled={selectedCourseId === null || branchQuery.isLoading}
            isLoading={branchQuery.isLoading}
            clearable
            contentClassName="w-[min(40rem,calc(100vw-2rem))]"
          />
        </div>
      </div>

      {(institutesQuery.error || branchQuery.error || courseQuery.error) && (
        <p className="text-sm text-destructive">Unable to load one or more CRM audience lists. Please try again.</p>
      )}
    </div>
  );
}
