import { useMemo } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableMultiSelect } from '@/components/shared/SearchableMultiSelect';
import { usePostingTypeOptions } from '@/hooks/use-posting-type-options';
import { filterPostingTypeOptionsByAcademicYear } from '@/lib/postingModule';

export type SingleFilter = {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  label: string;
};

interface ReportScopeFiltersProps {
  postingTypes?: { values: string[]; onChange: (values: string[]) => void };
  institute?: SingleFilter;
  course?: SingleFilter;
  branch?: SingleFilter;
  semester?: SingleFilter;
  academicYear?: SingleFilter;
  passingYear?: SingleFilter;
}

function ScopeSelect({ filter }: { filter: SingleFilter }) {
  return (
    <Select value={filter.value} onValueChange={filter.onChange}>
      <SelectTrigger className="h-9 w-full text-xs">
        <SelectValue placeholder={filter.label} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All {filter.label}</SelectItem>
        {filter.options.map((option) => (
          <SelectItem key={option} value={option}>
            {option}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default function ReportScopeFilters(props: ReportScopeFiltersProps) {
  const { postingTypes, institute, course, branch, semester, academicYear, passingYear } = props;
  const { options: postingTypeOptions, isLoading: postingTypesLoading } = usePostingTypeOptions(Boolean(postingTypes));

  // Posting Type options depend on the selected Academic Year (records are unaffected).
  const postingTypeMultiOptions = useMemo(
    () =>
      filterPostingTypeOptionsByAcademicYear(postingTypeOptions, academicYear?.value).map((option) => ({
        value: option.value,
        label: option.label,
      })),
    [postingTypeOptions, academicYear?.value],
  );
  // Gate Posting Type on a chosen Academic Year (only when this bar owns the year control).
  const postingTypeGated = Boolean(academicYear) && !academicYear?.value;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {/* Academic Year renders immediately before Posting Type — they are related. */}
      {academicYear ? <ScopeSelect filter={academicYear} /> : null}
      {postingTypes ? (
        <SearchableMultiSelect
          options={postingTypeMultiOptions}
          values={postingTypes.values}
          onChange={postingTypes.onChange}
          placeholder={postingTypeGated ? 'Select year first' : 'All Posting Types'}
          searchPlaceholder="Search posting type..."
          emptyMessage="No posting types defined."
          isLoading={postingTypesLoading}
          disabled={postingTypeGated}
          buttonClassName="h-9 w-full text-xs"
        />
      ) : null}
      {passingYear ? <ScopeSelect filter={passingYear} /> : null}
      {institute ? <ScopeSelect filter={institute} /> : null}
      {course ? <ScopeSelect filter={course} /> : null}
      {branch ? <ScopeSelect filter={branch} /> : null}
      {semester ? <ScopeSelect filter={semester} /> : null}
    </div>
  );
}
