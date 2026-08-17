import { useMemo } from 'react';
import { useMasters } from '@/hooks/use-master-api';
import { getEventTypeLabel } from '@/types/event';

export interface EventTypeOption {
  /** Master row UUID. */
  id: string;
  /** Raw master value — stored on Event.type (e.g. "campus_drive"). */
  value: string;
  /** Display label (legacy pretty labels, else humanized value). */
  label: string;
}

export interface UseEventTypeOptionsResult {
  options: EventTypeOption[];
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
}

/**
 * Active event_type master options, mirroring usePostingTypeOptions. The event form binds to the
 * master `value` (Event.type stores the value string), not the id.
 */
export function useEventTypeOptions(enabled = true): UseEventTypeOptionsResult {
  const query = useMasters({ category: 'event_type' }, enabled);

  const options = useMemo<EventTypeOption[]>(() => {
    const seen = new Set<string>();
    return (query.data ?? [])
      .map((master) => ({ id: master.id, value: master.value?.trim() ?? '' }))
      .filter(({ id, value }) => {
        if (!id || !value || seen.has(value)) return false;
        seen.add(value);
        return true;
      })
      .map(({ id, value }) => ({ id, value, label: getEventTypeLabel(value) }));
  }, [query.data]);

  return {
    options,
    isLoading: query.isLoading,
    isError: query.isError,
    isEmpty: !query.isLoading && options.length === 0,
  };
}
