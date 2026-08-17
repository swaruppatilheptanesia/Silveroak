import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import type { SearchableSelectOption } from '@/components/shared/SearchableSelect';

export function SearchableMultiSelect({
  options,
  values,
  onChange,
  placeholder,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No options found.',
  loadingMessage = 'Loading options...',
  isLoading = false,
  disabled = false,
  maxChips = 2,
  className,
  contentClassName,
  buttonClassName,
  chipClassName,
}: {
  options: SearchableSelectOption[];
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  loadingMessage?: string;
  isLoading?: boolean;
  disabled?: boolean;
  maxChips?: number;
  className?: string;
  contentClassName?: string;
  buttonClassName?: string;
  chipClassName?: string;
}) {
  const [open, setOpen] = useState(false);

  const selectedOptions = useMemo(
    () => values
      .map((value) => options.find((option) => option.value === value))
      .filter((option): option is SearchableSelectOption => Boolean(option)),
    [options, values],
  );

  const summary = useMemo(() => {
    if (selectedOptions.length === 0) {
      return placeholder;
    }

    if (selectedOptions.length <= maxChips) {
      return selectedOptions.map((option) => option.label).join(', ');
    }

    return `${selectedOptions.slice(0, maxChips).map((option) => option.label).join(', ')} +${selectedOptions.length - maxChips} more`;
  }, [maxChips, placeholder, selectedOptions]);

  function toggleValue(nextValue: string) {
    onChange(
      values.includes(nextValue)
        ? values.filter((value) => value !== nextValue)
        : [...values, nextValue],
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn('w-full justify-between font-normal', buttonClassName)}
          >
            <span className="truncate text-left">{summary}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className={cn('max-h-[min(24rem,calc(100vh-4rem))] w-[min(32rem,calc(100vw-2rem))] overflow-hidden p-0', contentClassName)}
          align="start"
        >
          <Command shouldFilter>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList className="max-h-[min(20rem,calc(100vh-8rem))] overflow-y-auto overflow-x-hidden">
              <CommandEmpty>{isLoading ? loadingMessage : emptyMessage}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => {
                  const selected = values.includes(option.value);

                  return (
                    <CommandItem
                      key={option.value}
                      value={[option.label, option.value, ...(option.keywords ?? [])].join(' ')}
                      className="data-[selected=true]:bg-muted data-[selected=true]:text-foreground"
                      onSelect={() => toggleValue(option.value)}
                    >
                      <Check className={cn('mr-2 h-4 w-4', selected ? 'opacity-100' : 'opacity-0')} />
                      <span className="line-clamp-2 flex-1 whitespace-normal text-left">
                        {option.label}
                      </span>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selectedOptions.length > 0 ? (
        <div className="flex w-full max-w-full flex-wrap gap-2 overflow-hidden">
          {selectedOptions.map((option) => {
            const removeValue = () => onChange(values.filter((value) => value !== option.value));
            return (
              <Badge
                key={option.value}
                variant="secondary"
                className={cn('flex max-w-full min-w-0 items-center gap-1.5 pr-2', chipClassName)}
              >
                <span className="min-w-0 flex-1 truncate">{option.label}</span>
                <button
                  type="button"
                  onPointerDown={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    removeValue();
                  }}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                  }}
                  className="shrink-0 rounded-full p-0.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                  aria-label={`Remove ${option.label}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
