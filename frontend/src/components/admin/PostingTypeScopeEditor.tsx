import { useMemo } from 'react';

import { Label } from '@/components/ui/label';
import { SearchableMultiSelect } from '@/components/shared/SearchableMultiSelect';
import { useMasterValues } from '@/hooks/use-master-api';
import { ScopeRowTable } from '@/components/admin/ScopeRowTable';
import type { ScopeRow } from '@/types/master';

export type PostingTypeScopeValue = {
  scope_rows: ScopeRow[];
  target_academic_years: string[];
};

/**
 * The full Posting Type targeting editor: the cascading Institute → Course → Branch → Semester row table plus
 * a separate Academic Years multi-select (kept out of the dependent chain — it applies to the whole type).
 * Used by both the create card and the edit dialog in Master Data.
 */
export function PostingTypeScopeEditor({
  value,
  onChange,
}: {
  value: PostingTypeScopeValue;
  onChange: (value: PostingTypeScopeValue) => void;
}) {
  const academicYearQuery = useMasterValues('academic_year');
  const academicYearOptions = useMemo(
    () => (academicYearQuery.data ?? []).map((year) => ({ value: year, label: year, keywords: [year] })),
    [academicYearQuery.data],
  );

  return (
    <div className="space-y-4 rounded-lg border p-4">
      <ScopeRowTable
        rows={value.scope_rows}
        onChange={(scope_rows) => onChange({ ...value, scope_rows })}
      />

      <div className="space-y-2">
        <Label>Academic Years</Label>
        <SearchableMultiSelect
          options={academicYearOptions}
          values={value.target_academic_years}
          onChange={(target_academic_years) => onChange({ ...value, target_academic_years })}
          placeholder="Select academic year(s)"
          searchPlaceholder="Search academic year..."
          emptyMessage="No academic years found."
          isLoading={academicYearQuery.isLoading}
          maxChips={3}
        />
      </div>
    </div>
  );
}
