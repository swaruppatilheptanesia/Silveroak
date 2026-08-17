import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown } from 'lucide-react';
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

export interface SearchableSelectOption {
  value: string;
  label: string;
  description?: string;
  keywords?: string[];
  disabled?: boolean;
}

export function SearchableSelect({
  options,
  pinnedOptions = [],
  value,
  onValueChange,
  placeholder,
  searchPlaceholder = 'Search...',
  emptyMessage = 'No options found.',
  loadingMessage = 'Loading options...',
  isLoading = false,
  disabled = false,
  clearable = false,
  clearLabel = 'Clear selection',
  className,
  contentClassName,
  buttonClassName,
  onOpenChange,
}: {
  options: SearchableSelectOption[];
  /** Options pinned to the top and always shown, even while the user is searching (e.g. "Other — add new"). */
  pinnedOptions?: SearchableSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  loadingMessage?: string;
  isLoading?: boolean;
  disabled?: boolean;
  clearable?: boolean;
  clearLabel?: string;
  className?: string;
  contentClassName?: string;
  buttonClassName?: string;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const selectedOption = useMemo(
    () => [...pinnedOptions, ...options].find((option) => option.value === value) ?? null,
    [options, pinnedOptions, value],
  );

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) setSearch('');
    onOpenChange?.(nextOpen);
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('w-full justify-between font-normal', buttonClassName, className)}
        >
          <span className="truncate text-left">
            {selectedOption?.label ?? placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className={cn('max-h-[min(24rem,calc(100vh-4rem))] w-[min(32rem,calc(100vw-2rem))] overflow-hidden p-0', contentClassName)}
        align="start"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} value={search} onValueChange={setSearch} />
          <CommandList className="max-h-[min(20rem,calc(100vh-8rem))] overflow-y-auto overflow-x-hidden">
            <CommandEmpty>{isLoading ? loadingMessage : emptyMessage}</CommandEmpty>
            {pinnedOptions.length > 0 ? (
              <CommandGroup>
                {pinnedOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    // Append the live search so cmdk never filters a pinned option out.
                    value={[option.label, option.value, ...(option.keywords ?? []), search].join(' ')}
                    disabled={option.disabled}
                    className="data-[selected=true]:bg-muted data-[selected=true]:text-foreground"
                    onSelect={() => {
                      if (option.disabled) return;
                      onValueChange(option.value);
                      handleOpenChange(false);
                    }}
                  >
                    <Check
                      className={cn('mr-2 h-4 w-4', value === option.value ? 'opacity-100' : 'opacity-0')}
                    />
                    <span className="line-clamp-2 flex-1 whitespace-normal text-left">{option.label}</span>
                    {option.description ? (
                      <span className="ml-2 line-clamp-1 text-xs text-muted-foreground">{option.description}</span>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}
            <CommandGroup>
              {clearable && value ? (
                <CommandItem
                  value={`clear ${clearLabel}`}
                  className="data-[selected=true]:bg-muted data-[selected=true]:text-foreground"
                  onSelect={() => {
                    onValueChange('');
                    handleOpenChange(false);
                  }}
                >
                  <span className="flex-1 text-left text-sm text-muted-foreground">
                    {clearLabel}
                  </span>
                </CommandItem>
              ) : null}
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={[option.label, option.value, ...(option.keywords ?? [])].join(' ')}
                  disabled={option.disabled}
                  className="data-[selected=true]:bg-muted data-[selected=true]:text-foreground"
                  onSelect={() => {
                    if (option.disabled) return;
                    onValueChange(option.value);
                    handleOpenChange(false);
                  }}
                >
                  <Check
                    className={cn(
                      'mr-2 h-4 w-4',
                      value === option.value ? 'opacity-100' : 'opacity-0',
                      option.disabled ? 'text-muted-foreground opacity-30' : '',
                    )}
                  />
                  <span className={cn('line-clamp-2 flex-1 whitespace-normal text-left', option.disabled && 'text-muted-foreground')}>
                    {option.label}
                  </span>
                  {option.description ? (
                    <span className="ml-2 line-clamp-1 text-xs text-muted-foreground">
                      {option.description}
                    </span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
