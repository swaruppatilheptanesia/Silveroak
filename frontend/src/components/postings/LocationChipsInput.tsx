import { useState } from 'react';
import { MapPin, Plus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface LocationChipsInputProps {
  values: string[];
  onChange: (next: string[]) => void;
  id?: string;
  error?: boolean;
  placeholder?: string;
}

/**
 * Free-text multi-add input for posting locations (cities). Type a city and press Enter
 * (or click Add) to append a chip; chips are removable. There is no city master — values
 * are arbitrary strings.
 */
export function LocationChipsInput({
  values,
  onChange,
  id,
  error,
  placeholder = 'Add a city and press Enter',
}: LocationChipsInputProps) {
  const [draft, setDraft] = useState('');

  function addLocation() {
    const value = draft.trim();
    if (!value) return;
    if (!values.some((existing) => existing.toLowerCase() === value.toLowerCase())) {
      onChange([...values, value]);
    }
    setDraft('');
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          className={`pl-9 pr-16 ${error ? 'border-destructive' : ''}`}
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              addLocation();
            }
          }}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 h-7 -translate-y-1/2 px-2"
          onClick={addLocation}
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      {values.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {values.map((location) => (
            <Badge key={location} variant="secondary" className="gap-1 pr-1">
              {location}
              <button
                type="button"
                aria-label={`Remove ${location}`}
                onClick={() => onChange(values.filter((existing) => existing !== location))}
                className="rounded-sm p-0.5 hover:bg-muted-foreground/20"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
