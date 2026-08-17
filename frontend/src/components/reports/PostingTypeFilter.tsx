import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePostingTypeOptions } from '@/hooks/use-posting-type-options';

type PostingTypeFilterProps = {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  triggerClassName?: string;
  contentClassName?: string;
  disabled?: boolean;
};

export default function PostingTypeFilter({
  value,
  onValueChange,
  placeholder = 'Posting Type',
  triggerClassName,
  contentClassName,
  disabled = false,
}: PostingTypeFilterProps) {
  const { options, isLoading, isEmpty } = usePostingTypeOptions();

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled || isLoading}>
      <SelectTrigger className={triggerClassName}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className={contentClassName}>
        <SelectItem value="all">All Posting Types</SelectItem>
        {isEmpty ? (
          <SelectItem value="__empty__" disabled>
            No posting types defined
          </SelectItem>
        ) : (
          options.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.label}
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
