import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

export function MasterSuggestionChips({
  suggestions,
  selectedValues = [],
  onSelect,
  onRemove,
  label = 'Suggestions',
  collapsible = false,
}: {
  suggestions: string[];
  selectedValues?: string[];
  onSelect: (value: string) => void;
  onRemove?: (value: string) => void;
  label?: string;
  collapsible?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // When collapsible, the chip list is clamped to a single row. Detect whether
  // any chips overflow that row so the toggle only appears when it's needed.
  useEffect(() => {
    if (!collapsible) return;
    const element = listRef.current;
    if (!element) return;
    const check = () => setOverflowing(element.scrollHeight > element.clientHeight + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(element);
    return () => observer.disconnect();
  }, [collapsible, expanded, suggestions.length]);

  if (suggestions.length === 0) {
    return null;
  }

  const clamped = collapsible && !expanded;
  const showToggle = collapsible && (expanded || overflowing);

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div
        ref={listRef}
        className={`flex flex-wrap gap-2${clamped ? ' max-h-7 overflow-hidden' : ''}`}
      >
        {suggestions.map((suggestion) => {
          const isSelected = selectedValues.some(
            (value) => value.trim().toLowerCase() === suggestion.trim().toLowerCase(),
          );

          return (
            <button
              key={suggestion}
              type="button"
              onClick={() => {
                if (isSelected && onRemove) {
                  onRemove(suggestion);
                  return;
                }

                onSelect(suggestion);
              }}
              className="text-left"
            >
              <Badge
                variant={isSelected ? 'default' : 'outline'}
                className="flex cursor-pointer items-center gap-1.5 pr-2"
              >
                <span>{suggestion}</span>
                {isSelected && onRemove ? <X className="h-3 w-3" /> : null}
              </Badge>
            </button>
          );
        })}
      </div>
      {showToggle ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {expanded ? (
            <>
              Show less
              <ChevronUp className="h-3 w-3" />
            </>
          ) : (
            <>
              Show more
              <ChevronDown className="h-3 w-3" />
            </>
          )}
        </button>
      ) : null}
    </div>
  );
}
