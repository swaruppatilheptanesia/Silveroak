export function uniqueNonEmptyStrings(values: unknown[]): string[] {
  return Array.from(
    new Set(
      values.filter((value): value is string => typeof value === 'string' && value.trim().length > 0),
    ),
  ).sort();
}
