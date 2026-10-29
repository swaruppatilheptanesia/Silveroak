import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePostingTypeOptions } from '@/hooks/use-posting-type-options';
import { filterPostingTypeOptionsByAcademicYear } from '@/lib/postingModule';

type PostingTypeFilterProps = {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  triggerClassName?: string;
  contentClassName?: string;
  disabled?: boolean;
  /** When provided, options are narrowed to this academic year and the control is gated until a year is set. */
  academicYear?: string;
};

export default function PostingTypeFilter({
  value,
  onValueChange,
  placeholder = 'Posting Type',
  triggerClassName,
  contentClassName,
  disabled = false,
  academicYear,
}: PostingTypeFilterProps) {
  const { options, isLoading, isEmpty } = usePostingTypeOptions();
  const visibleOptions =
    academicYear !== undefined ? filterPostingTypeOptionsByAcademicYear(options, academicYear) : options;
  const gated = academicYear !== undefined && !academicYear;

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || isLoading || gated}>
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder={gated ? 'Select year first' : placeholder} />
      </SelectTrigger>
      <SelectContent className={contentClassName}>
        <SelectItem value="all">All Posting Types</SelectItem>
        {isEmpty ? (
          <SelectItem value="__empty__" disabled>
            No posting types defined
          </SelectItem>
        ) : (
          visibleOptions.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
