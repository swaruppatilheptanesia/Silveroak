import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type MasterMultiSelectMode = 'badge' | 'checkbox';

export function MasterMultiSelect({
  label,
  description,
  options,
  values,
  onToggle,
  customValue,
  onCustomValueChange,
  onAddCustom,
  customPlaceholder,
  mode = 'badge',
}: {
  label: string;
  description?: string;
  options: string[];
  values: string[];
  onToggle: (value: string) => void;
  customValue: string;
  onCustomValueChange: (value: string) => void;
  onAddCustom: () => void;
  customPlaceholder?: string;
  mode?: MasterMultiSelectMode;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label>{label}</Label>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>

      {mode === 'checkbox' ? (
        <div className="grid gap-2 md:grid-cols-2">
          {options.map((option) => (
            <label key={option} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={values.includes(option)}
                onCheckedChange={() => onToggle(option)}
              />
              <span>{option}</span>
            </label>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <Badge
              key={option}
              variant={values.includes(option) ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => onToggle(option)}
            >
              {option}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={customValue}
          onChange={(event) => onCustomValueChange(event.target.value)}
          placeholder={customPlaceholder ?? 'Add a custom value'}
        />
        <Button type="button" variant="outline" onClick={onAddCustom}>
          Add
        </Button>
      </div>
    </div>
  );
}
