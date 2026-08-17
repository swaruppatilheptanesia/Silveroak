import type { ApiMasterOption } from '@/types/master';

function cleanValue(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

export function mergeMasterValues(sourceValues: string[] = [], selectedValues: string[] = []) {
  const seen = new Set<string>();
  const merged: string[] = [];

  [...sourceValues, ...selectedValues].forEach((rawValue) => {
    const cleanedValue = cleanValue(rawValue);
    if (!cleanedValue) return;

    const normalizedValue = cleanedValue.toLowerCase();
    if (seen.has(normalizedValue)) return;

    seen.add(normalizedValue);
    merged.push(cleanedValue);
  });

  return merged.sort((left, right) => left.localeCompare(right));
}

export function getMasterValues(options: ApiMasterOption[] | string[] | undefined) {
  if (!options) {
    return [];
  }

  if (typeof options[0] === 'string') {
    return mergeMasterValues(options as string[]);
  }

  return mergeMasterValues((options as ApiMasterOption[]).map((option) => option.value));
}

export function parseMasterCsv(value: string) {
  return value
    .split(',')
    .map((item) => cleanValue(item))
    .filter(Boolean);
}

export function appendMasterValueToCsv(currentValue: string, nextValue: string) {
  const currentValues = parseMasterCsv(currentValue);
  const mergedValues = mergeMasterValues(currentValues, [nextValue]);
  return mergedValues.join(', ');
}

export function removeMasterValueFromCsv(currentValue: string, valueToRemove: string) {
  const normalizedTarget = cleanValue(valueToRemove).toLowerCase();
  return parseMasterCsv(currentValue)
    .filter((value) => cleanValue(value).toLowerCase() !== normalizedTarget)
    .join(', ');
}

export function addMasterValue(values: string[], nextValue: string) {
  return mergeMasterValues(values, [nextValue]);
}

export function removeMasterValue(values: string[], valueToRemove: string) {
  const normalizedTarget = cleanValue(valueToRemove).toLowerCase();
  return values.filter((value) => cleanValue(value).toLowerCase() !== normalizedTarget);
}
